import { type FC, useState, useRef, useMemo } from 'react';
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
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  showBField: boolean;
  showEField: boolean;
  showForces: boolean;
  deflectionScale: number;
  cameraPreset: CameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  onCollisionHalt: () => void;
  onSuccessPass: () => void;
}> = ({
  params,
  trajectory,
  isPlaying,
  playbackSpeed,
  progress,
  setProgress,
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
  const { smoothPath3D, collisionIndex, collisionPlate, Fe, Fm } = useMemo(() => {
    const feVal = -params.q * params.E_y;
    const fmVal = params.q * params.v_x * params.B_z;

    if (!trajectory || trajectory.length === 0) {
      return {
        path3D: [[-6, 0, 0]] as [number, number, number][],
        smoothPath3D: [[-6, 0, 0]] as [number, number, number][],
        collisionIndex: -1,
        collisionPlate: null,
        Fe: feVal,
        Fm: fmVal,
      };
    }

    const maxIdx = trajectory.length - 1;
    const nominalLength = params.v_x * params.t_sim > 0 ? params.v_x * params.t_sim : 12;

    // Escala física de placas: 0.04 m (40 mm) para micropartículas, 2.0 m para modo didáctico
    const isMicroScale = Math.abs(params.q) < 1e-10;
    const baseScale = isMicroScale ? 0.04 : 2.0;

    const points: [number, number, number][] = [];
    let colIdx = -1;
    let colPlate: 'top' | 'bottom' | null = null;

    for (let i = 0; i <= maxIdx; i++) {
      const pt = trajectory[i];
      const normX = Math.min(1.0, Math.max(0.0, pt.x / nominalLength));
      const x3D = -6 + normX * 12;
      let y3D = (pt.y / baseScale) * 2.22 * deflectionScale;

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
    }

    return {
      path3D: points,
      smoothPath3D: points,
      collisionIndex: colIdx,
      collisionPlate: colPlate,
      Fe: feVal,
      Fm: fmVal,
    };
  }, [params, trajectory, deflectionScale]);

  // Función de interpolación continua C^0 de subpíxeles en O(1)
  const samplePathPosition = (
    path: [number, number, number][],
    progressRatio: number
  ): [number, number, number] => {
    if (path.length === 0) return [-6, 0, 0];
    if (path.length === 1) return path[0];
    const clamped = Math.min(1.0, Math.max(0.0, progressRatio));
    const s = clamped * (path.length - 1);
    const idx = Math.min(Math.floor(s), path.length - 2);
    const frac = s - idx;
    const p1 = path[idx];
    const p2 = path[idx + 1];
    return [
      p1[0] + frac * (p2[0] - p1[0]),
      p1[1] + frac * (p2[1] - p1[1]),
      0,
    ];
  };

  // Si hay colisión, el avance máximo permitido está limitado al punto de impacto
  const maxAllowedProgress = useMemo(() => {
    if (collisionIndex === -1 || !trajectory || trajectory.length === 0) return 1.0;
    return collisionIndex / (trajectory.length - 1);
  }, [collisionIndex, trajectory]);

  // Posición actual de la partícula y estela suavemente interpolada con sub-frame precision
  const { currentPos, currentTrail, isAtCollision } = useMemo(() => {
    if (smoothPath3D.length === 0) {
      return {
        currentPos: [-6, 0, 0] as [number, number, number],
        currentTrail: [] as [number, number, number][],
        isAtCollision: false,
      };
    }

    const effectiveProgress = Math.min(progress, maxAllowedProgress);
    const pos = samplePathPosition(smoothPath3D, effectiveProgress);

    const s = effectiveProgress * (smoothPath3D.length - 1);
    const idx = Math.min(Math.floor(s), smoothPath3D.length - 2);

    // La estela activa conserva todos los puntos físicos anteriores y termina con continuidad exacta en pos
    const currentTrail: [number, number, number][] = [
      ...smoothPath3D.slice(0, idx + 1),
      pos,
    ];

    const atImpact =
      collisionIndex !== -1 &&
      effectiveProgress >= maxAllowedProgress * 0.98;

    return {
      currentPos: pos,
      currentTrail,
      isAtCollision: atImpact,
    };
  }, [smoothPath3D, progress, maxAllowedProgress, collisionIndex]);

  // Bucle de animación optimizado a 60-120fps continuos
  useFrame((state, delta) => {
    if (isPlaying && smoothPath3D.length > 0) {
      // Clampear delta a 0.033s para evitar tirones si el navegador sufre una pausa temporal
      const dt = Math.min(delta, 0.033);

      setProgress((prev) => {
        const next = prev + dt * playbackSpeed * 0.35;

        // Si choca contra la placa y llega al impacto
        if (collisionIndex !== -1 && next >= maxAllowedProgress) {
          onCollisionHalt();
          return maxAllowedProgress;
        }

        // Si atravesó exitosamente la rendija de salida
        if (next >= 1.0) {
          if (collisionIndex === -1) {
            onSuccessPass();
          }
          return 0; // Reinicio cíclico
        }

        return next;
      });
    }

    // Modo Follow-Cam: la cámara sigue suavemente a la partícula en movimiento continuo
    if (cameraPreset === 'follow' && currentPos) {
      const [px, py, pz] = currentPos;

      state.camera.position.lerp(
        { x: px - 2.5, y: py + 1.2, z: pz + 4.5 } as any,
        0.1
      );
      if (controlsRef.current) {
        controlsRef.current.target.lerp({ x: px + 1.5, y: py, z: pz } as any, 0.1);
        controlsRef.current.update();
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
        position={currentPos}
        Fe={Fe}
        Fm={Fm}
        vx={params.v_x}
        charge={params.q}
        trailPoints={currentTrail}
        fullTrajectoryPoints={smoothPath3D}
        isCollided={isAtCollision}
        collisionPlate={collisionPlate}
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
  const [progress, setProgress] = useState(0);
  const [hasCollided, setHasCollided] = useState(false);
  const [hasPassedSuccess, setHasPassedSuccess] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const [prevParams, setPrevParams] = useState(params);
  const [prevScale, setPrevScale] = useState(deflectionScale);
  if (prevParams !== params || prevScale !== deflectionScale) {
    setPrevParams(params);
    setPrevScale(deflectionScale);
    setHasCollided(false);
    setHasPassedSuccess(false);
  }

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

  const handleCollisionHalt = () => {
    setHasCollided(true);
    if (isPlaying) {
      onTogglePlay();
    }
    // Vibración háptica en móviles si está soportada
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([60, 40, 60]);
    }
  };

  const handleSuccessPass = () => {
    setHasPassedSuccess(true);
    setTimeout(() => setHasPassedSuccess(false), 2400);
  };

  const handleResetSim = () => {
    setHasCollided(false);
    setHasPassedSuccess(false);
    setProgress(0);
    onReset();
  };

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
            className={`dot-indicator ${
              hasCollided ? 'rose' : isBalanced ? 'emerald' : isPlaying ? 'cyan' : 'amber'
            }`}
          />
          <span style={{ fontWeight: 600 }}>
            {hasCollided
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
      {hasCollided && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: 'rgba(220, 38, 38, 0.92)',
            backdropFilter: 'blur(16px)',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -4px rgba(220, 38, 38, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            maxWidth: 'calc(100% - 24px)',
            boxSizing: 'border-box',
            flexWrap: 'wrap',
          }}
        >
          <AlertOctagon size={24} style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
              ¡Colisión Detectada! Partícula absorbida por la placa.
            </div>
            <div style={{ fontSize: '0.74rem', color: '#fecaca' }}>
              La velocidad actual no cumple el equilibrio $v = E/B$.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexShrink: 0 }}>
            <button
              onClick={onAutoCalibrate}
              className="btn"
              style={{
                background: '#ffffff',
                color: '#dc2626',
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              <Target size={13} />
              <span>Calibrar</span>
            </button>
            <button
              onClick={handleResetSim}
              className="btn"
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                color: '#ffffff',
                padding: '6px 10px',
                fontSize: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <RotateCcw size={13} />
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      )}

      {hasPassedSuccess && !hasCollided && (
        <div
          style={{
            position: 'absolute',
            top: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: 'rgba(5, 150, 105, 0.92)',
            backdropFilter: 'blur(16px)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -4px rgba(16, 185, 129, 0.6)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            maxWidth: 'calc(100% - 24px)',
            boxSizing: 'border-box',
            flexWrap: 'wrap',
          }}
        >
          <CheckCircle2 size={24} style={{ color: '#ffffff', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              🎯 ¡Haz transmitido con éxito a través de la rendija!
            </div>
            <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>
              La partícula atravesó todo el selector sin desviarse.
            </div>
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
          progress={progress}
          setProgress={setProgress}
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
          onClick={onTogglePlay}
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
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            minWidth: '36px',
            flexShrink: 0,
          }}
        >
          {(progress * 100).toFixed(0)}%
        </span>

        {/* Deslizador de progreso de tiempo interactivo */}
        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          value={progress}
          onChange={(e) => {
            setHasCollided(false);
            setProgress(parseFloat(e.target.value));
          }}
          style={{
            flex: 1,
            minWidth: '50px',
            cursor: 'pointer',
            accentColor: hasCollided ? '#ef4444' : '#38bdf8',
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
