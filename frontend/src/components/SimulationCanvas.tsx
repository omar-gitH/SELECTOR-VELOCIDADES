import { type FC, useState, useRef, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SelectorStructure } from './SelectorStructure';
import { Particle } from './Particle';
import { type SimulationParams } from './ControlPanel';
import { type Point } from './SimulationChart';
import {
  Play,
  Pause,
  RotateCcw,
  Target,
  Box,
  Square,
  ArrowUp,
  Video,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';

export type CameraPreset = '3d' | '2d' | 'top' | 'follow';

interface SimulationCanvasProps {
  params: SimulationParams;
  trajectory: Point[];
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  playbackSpeed: number;
  showBField: boolean;
  showEField: boolean;
  showForces: boolean;
  deflectionScale: number;
  onAutoCalibrate: () => void;
}

// Subcomponente 3D para animar la escena con useFrame y soportar Follow-Cam
const SceneContent: FC<{
  params: SimulationParams;
  trajectory: Point[];
  isPlaying: boolean;
  playbackSpeed: number;
  progressRef: React.MutableRefObject<number>;
  hasHaltedRef: React.MutableRefObject<boolean>;
  hasPassedRef: React.MutableRefObject<boolean>;
  collisionType: 'top' | 'bottom' | 'end' | null;
  updateHUD: (val: number) => void;
  showBField: boolean;
  showEField: boolean;
  showForces: boolean;
  deflectionScale: number;
  cameraPreset: CameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onCollisionHalt: (plate: 'top' | 'bottom' | 'end' | null) => void;
  onSuccessPass: () => void;
}> = ({
  params,
  trajectory,
  isPlaying,
  playbackSpeed,
  progressRef,
  hasHaltedRef,
  hasPassedRef,
  collisionType,
  updateHUD,
  showBField,
  showEField,
  showForces,
  deflectionScale,
  cameraPreset,
  controlsRef,
  onCollisionHalt,
  onSuccessPass,
}) => {
    // Precalculamos la trayectoria 3D completa y detectamos colisiones con placas
    const { smoothPath3D, curve3D, collisionIndex, collisionPlate, Fe, Fm } = useMemo(() => {
      const feVal = -params.q * params.E_y;
      const fmVal = params.q * params.v_x * params.B_z;

      if (!trajectory || trajectory.length === 0) {
        return {
          path3D: [[-6, 0, 0]] as [number, number, number][],
          smoothPath3D: [[-6, 0, 0]] as [number, number, number][],
          curve3D: null as THREE.CatmullRomCurve3 | null,
          collisionIndex: -1,
          collisionPlate: null,
          Fe: feVal,
          Fm: fmVal,
        };
      }

      const maxIdx = trajectory.length - 1;
      const nominalLength =
        Number.isFinite(params.v_x) && Number.isFinite(params.t_sim) && params.v_x * params.t_sim > 0
          ? params.v_x * params.t_sim
          : 12;

      // Escala física de placas: 0.04 m (40 mm) para micropartículas, 2.0 m para modo didáctico
      const isMicroScale = Math.abs(params.q) < 1e-10;
      const baseScale = isMicroScale ? 0.04 : 2.0;

      const points: [number, number, number][] = [];
      let colIdx = -1;
      let colPlate: 'top' | 'bottom' | 'end' | null = null;

      // El ancho de la rendija de salida es plateLimit * 0.2 (20%).
      // En la escala Y visual (2.22), esto corresponde a 2.22 * 0.2 = 0.444
      const slitAperture3D = 2.22 * 0.2;

      for (let i = 0; i <= maxIdx; i++) {
        const pt = trajectory[i];
        if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
        const normX = Math.min(1.0, Math.max(0.0, pt.x / nominalLength));
        const x3D = -6 + normX * 12;
        let y3D = (pt.y / baseScale) * 2.22 * deflectionScale;
        if (!Number.isFinite(y3D)) y3D = 0;

        // Las placas están en |Y| = 2.4. Borde de impacto visual en |Y| = 2.22
        if (y3D >= 2.22) {
          y3D = 2.22;
          colIdx = i;
          colPlate = 'top';
          points.push([x3D, y3D, 0]);
          break;
        } else if (y3D <= -2.22) {
          y3D = -2.22;
          colIdx = i;
          colPlate = 'bottom';
          points.push([x3D, y3D, 0]);
          break;
        }

        points.push([x3D, y3D, 0]);

        // Verificar si impacta en la placa de salida (fuera de la rendija) al final del recorrido
        if (i === maxIdx && Math.abs(y3D) > slitAperture3D) {
          colIdx = i;
          colPlate = 'end';
        }
      }

      // Interpolación suave y continua con CatmullRomCurve3 (centripetal previene sobreimpulsos erráticos)
      let curve: THREE.CatmullRomCurve3 | null = null;
      let smoothPoints: [number, number, number][] = points;

      if (points.length >= 2) {
        // Filtrar puntos redundantes o con distancia despreciable para evitar singularidades
        const filteredVectors: THREE.Vector3[] = [];
        for (let i = 0; i < points.length; i++) {
          const [px, py, pz] = points[i];
          if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) continue;
          const v = new THREE.Vector3(px, py, pz);
          if (filteredVectors.length === 0 || v.distanceTo(filteredVectors[filteredVectors.length - 1]) > 1e-5) {
            filteredVectors.push(v);
          }
        }

        if (filteredVectors.length >= 2) {
          try {
            curve = new THREE.CatmullRomCurve3(filteredVectors, false, 'centripetal', 0.5);
            const numSamples = Math.min(500, Math.max(200, filteredVectors.length * 2));
            const sampled = curve.getPoints(numSamples);
            smoothPoints = sampled.map((v) => [v.x, v.y, v.z]);
          } catch {
            curve = null;
            smoothPoints = points;
          }
        }
      }

      return {
        path3D: points,
        smoothPath3D: smoothPoints,
        curve3D: curve,
        collisionIndex: colIdx,
        collisionPlate: colPlate,
        Fe: feVal,
        Fm: fmVal,
      };
    }, [params, trajectory, deflectionScale]);

    // Si hay colisión, el avance máximo permitido está limitado al punto de impacto
    const maxAllowedProgress = useMemo(() => {
      if (collisionIndex === -1 || !trajectory || trajectory.length === 0) return 1.0;
      return collisionIndex / (trajectory.length - 1);
    }, [collisionIndex, trajectory]);

    const particleRef = useRef<import('./Particle').ParticleRef>(null);

    // Bucle de animación optimizado a 60-120fps continuos
    useFrame((state, delta) => {
      if (!isPlaying || smoothPath3D.length === 0) {
        if (smoothPath3D.length > 0) {
          particleRef.current?.updateProgress(progressRef.current, maxAllowedProgress, collisionIndex);
        }
        return;
      }

      // Si ya está detenido por impacto o paso exitoso, mantener la partícula fija en ese punto
      if (hasHaltedRef.current || hasPassedRef.current) {
        if (smoothPath3D.length > 0) {
          particleRef.current?.updateProgress(progressRef.current, maxAllowedProgress, collisionIndex);
        }
        return;
      }

      // Clampear delta a 0.033s para evitar tirones si el navegador sufre una pausa temporal
      const dt = Math.min(delta, 0.033);
      let next = progressRef.current + dt * playbackSpeed * 0.35;

      if (collisionIndex !== -1 && next >= maxAllowedProgress) {
        next = maxAllowedProgress;
        hasHaltedRef.current = true;
        progressRef.current = next;
        updateHUD(next);
        onCollisionHalt(collisionPlate);
      } else if (next >= 1.0) {
        next = 1.0;
        if (collisionIndex === -1) {
          hasPassedRef.current = true;
          progressRef.current = next;
          updateHUD(next);
          onSuccessPass();
        } else {
          hasHaltedRef.current = true;
          progressRef.current = next;
          updateHUD(next);
          onCollisionHalt(collisionPlate);
        }
      } else {
        progressRef.current = next;
        updateHUD(next);
      }

      if (smoothPath3D.length > 0) {
        const pos = particleRef.current?.updateProgress(progressRef.current, maxAllowedProgress, collisionIndex);
        if (cameraPreset === 'follow' && pos) {
          const [px, py, pz] = pos;
          state.camera.position.lerp(
            { x: px - 2.5, y: py + 1.2, z: pz + 4.5 } as any,
            0.1
          );
          if (controlsRef.current) {
            controlsRef.current.target.lerp({ x: px + 1.5, y: py, z: pz } as any, 0.1);
            controlsRef.current.update();
          }
        }
      }
    });

    return (
      <>
        <SelectorStructure
          E_y={params.E_y}
          B_z={params.B_z}
          showEField={showEField}
          showBField={showBField}
        />

        <Particle
          ref={particleRef}
          Fe={Fe}
          Fm={Fm}
          vx={params.v_x}
          charge={params.q}
          curve3D={curve3D}
          fullTrajectoryPoints={smoothPath3D}
          isCollided={collisionType !== null}
          collisionPlate={collisionType}
          showForces={showForces}
        />
      </>
    );
  };

export const SimulationCanvas: FC<SimulationCanvasProps> = ({
  params,
  trajectory,
  isPlaying,
  onTogglePlay,
  onReset,
  playbackSpeed,
  showBField,
  showEField,
  showForces,
  deflectionScale,
  onAutoCalibrate,
}) => {
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('3d');

  const progressRef = useRef(0);
  const hasHaltedRef = useRef(false);
  const hasPassedRef = useRef(false);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const progressTextRef = useRef<HTMLSpanElement>(null);

  const updateHUD = (val: number) => {
    if (progressInputRef.current) progressInputRef.current.value = val.toString();
    if (progressTextRef.current) progressTextRef.current.innerText = `${(val * 100).toFixed(0)}%`;
  };

  const [hasPassedSuccess, setHasPassedSuccess] = useState(false);
  const [collisionType, setCollisionType] = useState<'top' | 'bottom' | 'end' | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpieza del temporizador al desmontar
  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);


  useEffect(() => {
    hasHaltedRef.current = false;
    hasPassedRef.current = false;
    setHasPassedSuccess(false);
    setCollisionType(null);
    progressRef.current = 0;
    if (progressInputRef.current) progressInputRef.current.value = '0';
    if (progressTextRef.current) progressTextRef.current.innerText = '0%';
  }, [params, deflectionScale]);

  // Cambio de ángulo de cámara con presets
  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    if (!controlsRef.current) return;

    switch (preset) {
      case '3d':
        controlsRef.current.object.position.set(3, 3.8, 9.5);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case '2d':
        controlsRef.current.object.position.set(0, 0, 12);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case 'top':
        controlsRef.current.object.position.set(0, 12, 0.001);
        controlsRef.current.target.set(0, 0, 0);
        break;
      case 'follow':
        // Manejado dinámicamente en useFrame
        break;
    }
    controlsRef.current.update();
  };

  // Manejador de colisión: el mensaje en rojo PERMANECE hasta que el usuario pulse Auto-calibrar o Reintentar
  const handleCollisionHalt = useCallback((plate: 'top' | 'bottom' | 'end' | null) => {
    setCollisionType(plate);
    if (isPlaying) {
      onTogglePlay(); // Pausa la simulación para mantener la partícula detenida en el choque
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    // Vibración háptica en dispositivos compatibles
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([70, 40, 70]);
    }
  }, [isPlaying, onTogglePlay, setCollisionType]);

  // Manejador de éxito: el mensaje en verde se queda por 4.5 segundos y luego desaparece
  const handleSuccessPass = useCallback(() => {
    setHasPassedSuccess(true);
    if (isPlaying) {
      onTogglePlay(); // Pausa la simulación al cruzar el selector
    }
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    successTimerRef.current = setTimeout(() => {
      setHasPassedSuccess(false);
      successTimerRef.current = null;
    }, 4500);
  }, [isPlaying, onTogglePlay, setHasPassedSuccess]);

  const handleResetSim = useCallback(() => {
    hasHaltedRef.current = false;
    hasPassedRef.current = false;
    setCollisionType(null);
    setHasPassedSuccess(false);
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    progressRef.current = 0;
    updateHUD(0);
    onReset();
  }, [onReset]);

  // Disparar desde el mensaje de colisión mediante Auto-calibrar:
  // Restaura todos los componentes a sus valores iniciales y reproduce el haz en equilibrio
  const handleToastAutoCalibrate = useCallback(() => {
    setCollisionType(null);
    setHasPassedSuccess(false);
    hasHaltedRef.current = false;
    hasPassedRef.current = false;
    progressRef.current = 0;
    updateHUD(0);
    onAutoCalibrate();
  }, [onAutoCalibrate]);

  // Reintentar disparo con los mismos parámetros
  const handleToastRetry = useCallback(() => {
    setCollisionType(null);
    setHasPassedSuccess(false);
    hasHaltedRef.current = false;
    hasPassedRef.current = false;
    progressRef.current = 0;
    updateHUD(0);
    if (!isPlaying) {
      onTogglePlay();
    }
  }, [isPlaying, onTogglePlay]);

  // Alternar reproducción desde la barra inferior (reinicia si ya estaba terminado/colisionado)
  const handlePlayToggle = useCallback(() => {
    if (hasHaltedRef.current || hasPassedRef.current || progressRef.current >= 0.999 || collisionType !== null) {
      hasHaltedRef.current = false;
      hasPassedRef.current = false;
      setCollisionType(null);
      setHasPassedSuccess(false);
      progressRef.current = 0;
      updateHUD(0);
      if (!isPlaying) {
        onTogglePlay();
      }
    } else {
      onTogglePlay();
    }
  }, [isPlaying, onTogglePlay, collisionType]);

  const idealV = params.B_z !== 0 ? Math.abs(params.E_y / params.B_z) : 0;
  const isBalanced = idealV > 0 && Math.abs(params.v_x - idealV) < idealV * 0.008;

  return (
    <div
      className="glass-panel canvas-card-3d"
      style={{
        flex: 1,
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid rgba(56, 189, 248, 0.25)',
      }}
    >
      {/* ======================================================== */}
      {/* 1. HUD SUPERIOR FLOTANTE                                  */}
      {/* ======================================================== */}
      <div
        className="canvas-top-hud"
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          right: '12px',
          zIndex: 15,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* Chip de Telemetría en Vivo */}
        <div
          style={{
            pointerEvents: 'auto',
            background: 'rgba(18, 28, 50, 0.88)',
            backdropFilter: 'blur(12px)',
            padding: '5px 12px',
            borderRadius: '10px',
            fontSize: '0.78rem',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            color: '#e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            className={`dot-indicator ${collisionType !== null ? 'rose' : isBalanced ? 'emerald' : isPlaying ? 'cyan' : 'amber'
              }`}
          />
          <span style={{ fontWeight: 600 }}>
            {collisionType === 'end'
              ? 'FILTRADO / BLOQUEADO'
              : collisionType !== null
                ? 'COLISIÓN DETECTADA'
                : hasPassedSuccess
                  ? 'HAZ TRANSMITIDO'
                  : cameraPreset === '2d'
                    ? 'VISTA 2D LATERAL'
                    : cameraPreset === 'top'
                      ? 'VISTA CENITAL'
                      : cameraPreset === 'follow'
                        ? 'SEGUIMIENTO EN VIVO'
                        : 'VISTA 3D ORBITAL'}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>|</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
            v = {params.v_x.toLocaleString()} m/s
          </span>
        </div>

        {/* Selector de Ángulos de Cámara */}
        <div
          style={{
            pointerEvents: 'auto',
            display: 'flex',
            background: 'rgba(18, 28, 50, 0.88)',
            backdropFilter: 'blur(12px)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            padding: '3px',
            gap: '2px',
          }}
        >
          <button
            onClick={() => applyCameraPreset('3d')}
            className={`btn btn-ghost ${cameraPreset === '3d' ? 'active' : ''}`}
            style={{
              padding: '4px 8px',
              fontSize: '0.72rem',
              borderRadius: '7px',
              background: cameraPreset === '3d' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: cameraPreset === '3d' ? '#38bdf8' : '#94a3b8',
            }}
            title="Vista 3D Libre Orbital"
          >
            <Box size={13} />
            <span className="hide-on-mobile">3D Libre</span>
          </button>

          <button
            onClick={() => applyCameraPreset('2d')}
            className={`btn btn-ghost ${cameraPreset === '2d' ? 'active' : ''}`}
            style={{
              padding: '4px 8px',
              fontSize: '0.72rem',
              borderRadius: '7px',
              background: cameraPreset === '2d' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: cameraPreset === '2d' ? '#38bdf8' : '#94a3b8',
            }}
            title="Vista 2D Frontal de Corte"
          >
            <Square size={13} />
            <span className="hide-on-mobile">2D Corte</span>
          </button>

          <button
            onClick={() => applyCameraPreset('top')}
            className={`btn btn-ghost ${cameraPreset === 'top' ? 'active' : ''}`}
            style={{
              padding: '4px 8px',
              fontSize: '0.72rem',
              borderRadius: '7px',
              background: cameraPreset === 'top' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
              color: cameraPreset === 'top' ? '#38bdf8' : '#94a3b8',
            }}
            title="Vista Superior Cenital"
          >
            <ArrowUp size={13} />
            <span className="hide-on-mobile">Cenital</span>
          </button>

          <button
            onClick={() => applyCameraPreset('follow')}
            className={`btn btn-ghost ${cameraPreset === 'follow' ? 'active' : ''}`}
            style={{
              padding: '4px 8px',
              fontSize: '0.72rem',
              borderRadius: '7px',
              background: cameraPreset === 'follow' ? 'rgba(168, 85, 247, 0.3)' : 'transparent',
              color: cameraPreset === 'follow' ? '#c084fc' : '#94a3b8',
            }}
            title="Cámara Cinematográfica que sigue a la partícula"
          >
            <Video size={13} />
            <span className="hide-on-mobile">Follow-Cam</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOAST DE IMPACTO O TRANSMISIÓN EXITOSA                 */}
      {/* ======================================================== */}
      {collisionType !== null && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            background: 'rgba(28, 12, 18, 0.95)',
            backdropFilter: 'blur(20px)',
            color: '#ffffff',
            padding: '12px 18px',
            borderRadius: '14px',
            boxShadow: '0 16px 36px -4px rgba(220, 38, 38, 0.55), 0 0 0 1px rgba(239, 68, 68, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            maxWidth: 'calc(100% - 24px)',
            boxSizing: 'border-box',
            flexWrap: 'wrap',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f87171',
              flexShrink: 0,
            }}
          >
            <AlertOctagon size={22} />
          </div>

          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fecaca', letterSpacing: '0.01em' }}>
              {collisionType === 'end'
                ? '⚠️ ¡Haz Filtrado! Choque contra la pared del orificio'
                : collisionType === 'top'
                  ? '💥 ¡Colisión con Placa Superior (Ánodo +)!'
                  : '💥 ¡Colisión con Placa Inferior (Cátodo −)!'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.35 }}>
              {collisionType === 'end'
                ? 'La partícula se desvió de la rendija por no cumplir la condición de Wien.'
                : 'La trayectoria se desvió por desbalance entre la fuerza eléctrica y magnética.'}{' '}
              <span style={{ color: '#f87171', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                (v = {params.v_x.toLocaleString()} m/s ≠ {idealV.toLocaleString(undefined, { maximumFractionDigits: 1 })} m/s)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
            <button
              onClick={handleToastAutoCalibrate}
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                padding: '7px 13px',
                fontSize: '0.76rem',
                fontWeight: 700,
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 0 14px rgba(239, 68, 68, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
              title="Ajustar automáticamente v = E / B y disparar haz en equilibrio"
            >
              <Target size={14} />
              <span>Auto-calibrar (E/B)</span>
            </button>

            <button
              onClick={handleToastRetry}
              className="btn btn-ghost"
              style={{
                padding: '7px 11px',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="Reintentar disparo"
            >
              <RotateCcw size={13} />
              <span>Reintentar</span>
            </button>

            <button
              onClick={() => setCollisionType(null)}
              className="btn btn-ghost"
              style={{
                padding: '5px 7px',
                color: '#94a3b8',
                fontSize: '0.78rem',
                borderRadius: '6px',
              }}
              title="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {hasPassedSuccess && collisionType === null && (
        <div
          role="status"
          style={{
            position: 'absolute',
            top: '60px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            background: 'rgba(8, 42, 28, 0.95)',
            backdropFilter: 'blur(20px)',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '14px',
            boxShadow: '0 16px 36px -4px rgba(16, 185, 129, 0.55), 0 0 0 1px rgba(52, 211, 153, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            maxWidth: 'calc(100% - 24px)',
            boxSizing: 'border-box',
            flexWrap: 'wrap',
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
          </div>

          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#a7f3d0', letterSpacing: '0.01em' }}>
              🎯 ¡Haz Transmitido con Éxito a través del Orificio!
            </div>
            <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '2px', lineHeight: 1.35 }}>
              La partícula atravesó todo el selector sin desviarse ni rozar las placas.{' '}
              <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                (Wien: v = E/B = {idealV.toLocaleString(undefined, { maximumFractionDigits: 1 })} m/s)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
            <button
              onClick={() => {
                if (successTimerRef.current) clearTimeout(successTimerRef.current);
                setHasPassedSuccess(false);
              }}
              className="btn btn-ghost"
              style={{
                padding: '5px 7px',
                color: '#94a3b8',
                fontSize: '0.78rem',
                borderRadius: '6px',
              }}
              title="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ESCENARIO THREE.JS (CANVAS 3D/2D)                      */}
      {/* ======================================================== */}
      <Canvas
        dpr={[1, 1.5]}
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 50% 42%, #22324f 0%, #142036 58%, #0d1526 100%)',
          touchAction: 'none',
        }}
      >
        <PerspectiveCamera makeDefault position={[3, 3.8, 9.5]} fov={48} />
        <OrbitControls
          ref={controlsRef}
          enableRotate={cameraPreset !== '2d' && cameraPreset !== 'top'}
          enableZoom={true}
          enablePan={true}
          maxDistance={25}
          minDistance={2.5}
        />

        {/* ======================================================== */}
        {/* RIG DE ILUMINACIÓN DE ESTUDIO (REFLEJOS PONDERADOS Y ESPECULARES) */}
        {/* ======================================================== */}
        {/* Luz base ambiental equilibrada para alto contraste sin aplanar materiales */}
        <ambientLight intensity={0.52} color="#f8fafc" />

        {/* Luz Clave Principal: specular highlights intensos sobre placa carmesí, cristal y bornes */}
        <directionalLight position={[10, 16, 12]} intensity={1.6} color="#ffffff" />

        {/* Luz Rim trasera: genera el contorno Fresnel brillante en la curvatura del tubo de cuarzo */}
        <directionalLight position={[-14, 8, -10]} intensity={1.1} color="#38bdf8" />

        {/* Luz de rebote inferior: reflejos sobre la placa azul cobalto y bornes de cromo */}
        <directionalLight position={[4, -12, 6]} intensity={0.75} color="#2563eb" />

        {/* Luz frontal suave de relleno para rotulación y cañón emisor */}
        <directionalLight position={[-6, 4, 8]} intensity={0.45} color="#fef08a" />

        {/* Núcleo de luz interior: ilumina el vacío interno realzando líneas de campo y haz */}
        <pointLight position={[0, 0, 0]} intensity={0.7} distance={10} color="#38bdf8" />

        {/* Acentos de proximidad sobre ánodo (+) y cátodo (−) */}
        <pointLight position={[0, 2.0, 1.2]} intensity={0.35} distance={6} color="#ef4444" />
        <pointLight position={[0, -2.0, 1.2]} intensity={0.35} distance={6} color="#3b82f6" />

        <SceneContent
          params={params}
          trajectory={trajectory}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          progressRef={progressRef}
          hasHaltedRef={hasHaltedRef}
          hasPassedRef={hasPassedRef}
          collisionType={collisionType}
          updateHUD={updateHUD}
          showBField={showBField}
          showEField={showEField}
          showForces={showForces}
          deflectionScale={deflectionScale}
          cameraPreset={cameraPreset}
          controlsRef={controlsRef}
          onCollisionHalt={handleCollisionHalt}
          onSuccessPass={handleSuccessPass}
        />
      </Canvas>

      {/* ======================================================== */}
      {/* 4. LÍNEA DE TIEMPO / BARRA INFERIOR DE CONTROL            */}
      {/* ======================================================== */}
      <div
        className="canvas-bottom-hud"
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          right: '12px',
          zIndex: 15,
          background: 'rgba(18, 28, 50, 0.90)',
          backdropFilter: 'blur(16px)',
          borderRadius: '12px',
          padding: '8px 14px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxSizing: 'border-box',
        }}
      >
        <button
          onClick={handlePlayToggle}
          className={`btn ${isPlaying ? 'btn-amber' : 'btn-emerald'}`}
          style={{ padding: '6px 12px', fontSize: '0.78rem', flexShrink: 0 }}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? 'Pausar' : 'Disparar'}</span>
        </button>

        <button
          onClick={handleResetSim}
          className="btn btn-ghost"
          style={{ padding: '6px 8px', flexShrink: 0 }}
          title="Reiniciar disparo"
        >
          <RotateCcw size={15} />
        </button>

        <span
          ref={progressTextRef}
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            minWidth: '36px',
            flexShrink: 0,
          }}
        >
          0%
        </span>

        {/* Deslizador de progreso de tiempo interactivo */}
        <input
          ref={progressInputRef}
          type="range"
          min="0"
          max="1"
          step="0.005"
          defaultValue="0"
          onChange={(e) => {
            hasHaltedRef.current = false;
            hasPassedRef.current = false;
            setCollisionType(null);
            setHasPassedSuccess(false);
            const val = parseFloat(e.target.value);
            progressRef.current = val;
            updateHUD(val);
          }}
          style={{
            flex: 1,
            minWidth: '50px',
            cursor: 'pointer',
            accentColor: collisionType !== null ? '#ef4444' : '#38bdf8',
          }}
        />

        {/* Leyenda de Vectores (oculta en pantallas pequeñas para dar espacio al slider) */}
        <div className="hide-on-mobile" style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', flexShrink: 0 }}>
          <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ■ v
          </span>
          <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ■ Fe
          </span>
          <span style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '4px' }}>
            ■ Fm
          </span>
        </div>
      </div>
    </div>
  );
};
