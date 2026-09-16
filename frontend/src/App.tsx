import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ControlPanel, type SimulationParams } from './components/ControlPanel';
import { type ParticleType, PARTICLE_PRESETS } from './components/ParticleSelector';
import { FormulaDisplay } from './components/FormulaDisplay';
import { SimulationChart, type Point } from './components/SimulationChart';
import { SimulationCanvas } from './components/SimulationCanvas';
import { solveLorentzTrajectory } from './utils/physicsSolver';
import {
  Atom,
  Activity,
  Sliders,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import './index.css';
import './App.css';

function App() {
  // Inicializamos con el preset calibrado de Protón
  const [particleType, setParticleType] = useState<ParticleType>('proton');
  const [params, setParams] = useState<SimulationParams>(PARTICLE_PRESETS.proton.params);

  // Estados de simulación física y animación (inicializado con solver local)
  const [trajectory, setTrajectory] = useState<Point[]>(() => solveLorentzTrajectory(PARTICLE_PRESETS.proton.params));
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'chart' | 'theory'>('3d');
  const [isBackendLive, setIsBackendLive] = useState<boolean>(true);

  // Estados del reproductor (Play / Pausa / Velocidad)
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Capas de visualización y escala de desviación
  const [showBField, setShowBField] = useState<boolean>(true);
  const [showEField, setShowEField] = useState<boolean>(true);
  const [showForces, setShowForces] = useState<boolean>(true);
  const [deflectionScale, setDeflectionScale] = useState<number>(1.0);

  // Estado del cajón móvil (Bottom Sheet / Drawer)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Manejador central reactivo para cambios de parámetros con actualización física instantánea a 60 FPS
  const handleParamsChange = useCallback((newParams: SimulationParams) => {
    setParams(newParams);
    setTrajectory(solveLorentzTrajectory(newParams));
  }, []);

  // Validación y confirmación asíncrona con el motor físico FastAPI (backend)
  useEffect(() => {
    let isMounted = true;
    const fetchSimulation = async () => {
      setError(null);
      try {
        const response = await axios.post('/api/simular', params);
        if (isMounted && Array.isArray(response.data) && response.data.length > 0) {
          setTrajectory(response.data);
          setIsBackendLive(true);
        }
      } catch (err) {
        if (isMounted) {
          setIsBackendLive(false);
          void err;
        }
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSimulation();
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn);
    };
  }, [params]);

  // Controles de reproducción con vibración háptica opcional
  const triggerHaptic = useCallback((pattern: number | number[] = 20) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const handleTogglePlay = useCallback(() => {
    triggerHaptic(15);
    setIsPlaying((prev) => !prev);
  }, [triggerHaptic]);

  const handleReset = useCallback(() => {
    triggerHaptic(25);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 80);
  }, [triggerHaptic]);

  // Función para calibrar automáticamente v = E / B (No desviación)
  const handleAutoCalibrate = useCallback(() => {
    triggerHaptic([30, 20, 30]);
    if (params.B_z !== 0) {
      const idealV = Math.abs(params.E_y / params.B_z);
      const newParams = { ...params, v_x: idealV };
      handleParamsChange(newParams);
    }
  }, [params, handleParamsChange, triggerHaptic]);

  // Toggle pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Atajos de teclado: Barra espaciadora (Pausa), C (Calibrar), R (Reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleAutoCalibrate();
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleAutoCalibrate, handleReset]);

  return (
    <div className="app-container">
      {/* ======================================================== */}
      {/* 1. BARRA SUPERIOR DE NAVEGACIÓN (NAVBAR)                  */}
      {/* ======================================================== */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <Atom size={22} className="spin-slow" />
          </div>
          <div>
            <div className="brand-title">
              SELECTOR DE VELOCIDADES
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: 'var(--accent-cyan)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  letterSpacing: '0.04em',
                }}
              >
                FILTRO DE WIEN
              </span>
            </div>
            <div className="brand-subtitle">Física Cuántica & Ley de Lorentz EDO</div>
          </div>
        </div>

        {/* Pestañas de Vista en Centro/Derecha */}
        <div className="nav-tab-group">
          <button
            onClick={() => setViewMode('3d')}
            className={`nav-tab-btn ${viewMode === '3d' ? 'active' : ''}`}
          >
            <Sparkles size={14} />
            <span>Simulador 3D/2D</span>
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`nav-tab-btn ${viewMode === 'chart' ? 'active' : ''}`}
          >
            <Activity size={14} />
            <span>Gráfica Numérica</span>
          </button>
          <button
            onClick={() => setViewMode('theory')}
            className={`nav-tab-btn ${viewMode === 'theory' ? 'active' : ''}`}
          >
            <BookOpen size={14} />
            <span className="hide-on-mobile">Teoría y Balance</span>
          </button>
        </div>

        {/* Acciones de Cabecera: Estado de conexión y botón móvil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Indicador de estado del backend */}
          <div
            className={`status-pill ${
              isBackendLive ? 'status-pill-emerald' : 'status-pill-rose'
            }`}
            title={
              isBackendLive
                ? 'FastAPI (Python) conectado en /api'
                : 'Fallo al contactar el motor físico'
            }
          >
            <span className={`dot-indicator ${isBackendLive ? 'emerald' : 'rose'}`} />
            <span className="hide-on-mobile">{isBackendLive ? 'MOTOR ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* Botón de pantalla completa */}
          <button
            onClick={toggleFullscreen}
            className="btn btn-ghost"
            style={{ padding: '6px 8px' }}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Botón para navegar al panel en móvil/tablet */}
          <button
            onClick={() => {
              const deck = document.querySelector('.sidebar-deck');
              if (deck) {
                deck.scrollIntoView({ behavior: 'smooth' });
              } else {
                setIsMobileDrawerOpen(true);
              }
            }}
            className="btn btn-primary show-on-tablet-mobile"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
          >
            <Sliders size={15} />
            <span>Parámetros</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. ESPACIO DE TRABAJO (SIDEBAR + ESCENARIO PRINCIPAL)      */}
      {/* ======================================================== */}
      <div className="app-workspace">
        {/* Panel izquierdo en Desktop */}
        <ControlPanel
          params={params}
          onChange={handleParamsChange}
          particleType={particleType}
          onParticleTypeChange={setParticleType}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onReset={handleReset}
          playbackSpeed={playbackSpeed}
          onSpeedChange={setPlaybackSpeed}
          onAutoCalibrate={handleAutoCalibrate}
          showBField={showBField}
          onToggleBField={() => setShowBField((prev) => !prev)}
          showEField={showEField}
          onToggleEField={() => setShowEField((prev) => !prev)}
          showForces={showForces}
          onToggleForces={() => setShowForces((prev) => !prev)}
          deflectionScale={deflectionScale}
          onDeflectionScaleChange={setDeflectionScale}
        />

        {/* Escenario Principal */}
        <main className="main-stage">
          {/* Tarjeta de Fórmula y Balance de Lorentz (Visible siempre o en modo teoría) */}
          <FormulaDisplay E_y={params.E_y} B_z={params.B_z} v_x={params.v_x} />

          {/* Renderizado de la Vista Seleccionada */}
          {viewMode === '3d' ? (
            <SimulationCanvas
              params={params}
              trajectory={trajectory}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onReset={handleReset}
              playbackSpeed={playbackSpeed}
              showBField={showBField}
              showEField={showEField}
              showForces={showForces}
              deflectionScale={deflectionScale}
              onAutoCalibrate={handleAutoCalibrate}
            />
          ) : viewMode === 'chart' ? (
            error ? (
              <div
                className="glass-panel"
                style={{
                  flex: 1,
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  textAlign: 'center',
                }}
              >
                <h3>{error}</h3>
              </div>
            ) : (
              <SimulationChart data={trajectory} params={params} deflectionScale={deflectionScale} />
            )
          ) : (
            /* Vista detallada de teoría y física */
            <div
              className="glass-panel"
              style={{
                flex: 1,
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: 0 }}>
                Fundamentos Teóricos del Selector de Wien
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div
                  style={{
                    background: 'rgba(6, 11, 24, 0.7)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <h3 style={{ color: '#38bdf8', fontSize: '0.95rem', marginBottom: '8px' }}>
                    1. ¿Qué es un Selector de Velocidades?
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    Es un dispositivo experimental inventado por <strong>Wilhelm Wien</strong> (1898) compuesto por un campo eléctrico uniforme y un campo magnético uniforme perpendiculares entre sí y a la dirección del haz de partículas incidentes.
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(6, 11, 24, 0.7)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <h3 style={{ color: '#a855f7', fontSize: '0.95rem', marginBottom: '8px' }}>
                    2. Equilibrio de Lorentz
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    {'Cuando una partícula con carga q ingresa al selector, experimenta dos fuerzas opuestas: la fuerza electrostática Fe = q·E y la fuerza magnética de Lorentz Fm = q·(v × B). Únicamente las partículas cuya velocidad satisface exactamente v = E / B experimentan fuerza neta cero y atraviesan la rendija.'}
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(6, 11, 24, 0.7)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <h3 style={{ color: '#34d399', fontSize: '0.95rem', marginBottom: '8px' }}>
                    3. Aplicaciones Modernas
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.5 }}>
                    Se utiliza como etapa previa fundamental en los <strong>Espectrómetros de Masas de Bainbridge</strong> y en aceleradores de partículas como el CERN para seleccionar haces monoenergéticos antes de someterlos a deflexión magnética.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* 3. CAJÓN MÓVIL (BOTTOM SHEET) PARA PANTALLAS PEQUEÑAS     */}
      {/* ======================================================== */}
      <div
        className={`mobile-drawer-backdrop ${isMobileDrawerOpen ? 'open' : ''}`}
        onClick={() => setIsMobileDrawerOpen(false)}
      />

      <div className={`mobile-bottom-sheet ${isMobileDrawerOpen ? 'open' : ''}`}>
        <div className="sheet-drag-handle" />
        <div className="sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
              Panel de Control y Parámetros
            </span>
          </div>

          <button
            onClick={() => setIsMobileDrawerOpen(false)}
            className="btn btn-ghost"
            style={{ padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="sheet-content">
          <ControlPanel
            params={params}
            onChange={handleParamsChange}
            particleType={particleType}
            onParticleTypeChange={setParticleType}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onReset={handleReset}
            playbackSpeed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
            onAutoCalibrate={handleAutoCalibrate}
            showBField={showBField}
            onToggleBField={() => setShowBField((prev) => !prev)}
            showEField={showEField}
            onToggleEField={() => setShowEField((prev) => !prev)}
            showForces={showForces}
            onToggleForces={() => setShowForces((prev) => !prev)}
            deflectionScale={deflectionScale}
            onDeflectionScaleChange={setDeflectionScale}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
