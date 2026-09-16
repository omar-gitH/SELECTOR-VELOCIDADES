import { type FC, type ChangeEvent } from 'react';
import { ParticleSelector, type ParticleType } from './ParticleSelector';
import {
  Play,
  Pause,
  RotateCcw,
  Target,
  Eye,
  Sliders,
  Scale,
  Zap,
  Layers,
  ChevronRight,
} from 'lucide-react';

export interface SimulationParams {
  q: number;
  m: number;
  v_x: number;
  E_y: number;
  B_z: number;
  t_sim: number;
}

interface ControlPanelProps {
  params: SimulationParams;
  onChange: (newParams: SimulationParams) => void;
  particleType: ParticleType;
  onParticleTypeChange: (type: ParticleType) => void;
  // Controles de reproducción
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onAutoCalibrate: () => void;
  // Opciones de visualización de campos y sensibilidad
  showBField: boolean;
  onToggleBField: () => void;
  showEField: boolean;
  onToggleEField: () => void;
  showForces: boolean;
  onToggleForces: () => void;
  deflectionScale: number;
  onDeflectionScaleChange: (scale: number) => void;
}

export const ControlPanel: FC<ControlPanelProps> = ({
  params,
  onChange,
  particleType,
  onParticleTypeChange,
  isPlaying,
  onTogglePlay,
  onReset,
  playbackSpeed,
  onSpeedChange,
  onAutoCalibrate,
  showBField,
  onToggleBField,
  showEField,
  onToggleEField,
  showForces,
  onToggleForces,
  deflectionScale,
  onDeflectionScaleChange,
}) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = value === '' ? 0 : parseFloat(value);
    onChange({ ...params, [name]: numericValue });

    if (name === 'q' || name === 'm') {
      onParticleTypeChange('custom');
    }
  };

  const handleParticleSelect = (type: ParticleType, newParams?: SimulationParams) => {
    onParticleTypeChange(type);
    if (newParams) {
      onChange(newParams);
    }
  };

  // Ajustes rápidos de velocidad (±10% o ±5%)
  const adjustVelocity = (factor: number) => {
    const newV = Math.round(params.v_x * factor);
    onChange({ ...params, v_x: newV });
  };

  // Diagnóstico físico de Lorentz
  const Fe = params.q * params.E_y;
  const Fm = params.q * params.v_x * params.B_z;
  const idealVelocity = params.B_z !== 0 ? Math.abs(params.E_y / params.B_z) : 0;
  const isBalanced = idealVelocity > 0 && Math.abs(params.v_x - idealVelocity) < idealVelocity * 0.008;

  // Cálculo del porcentaje del tira y afloja entre Fe y Fm (-100 a +100)
  const maxForce = Math.max(Math.abs(Fe), Math.abs(Fm), 1e-25);
  const balanceOffset = maxForce > 0 ? ((Math.abs(Fm) - Math.abs(Fe)) / maxForce) * 50 : 0;
  const clampedOffset = Math.max(-50, Math.min(50, balanceOffset));

  return (
    <div className="sidebar-deck">
      {/* ======================================================== */}
      {/* 1. SECCIÓN DE DISPARO Y REPRODUCCIÓN                      */}
      {/* ======================================================== */}
      <div
        className="deck-card"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid rgba(56, 189, 248, 0.3)',
        }}
      >
        <div className="deck-card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', wordBreak: 'break-word' }}>
            <Zap size={15} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            Disparador de Partículas
          </span>
          <span
            className={`status-pill ${
              isPlaying ? 'status-pill-emerald' : 'status-pill-amber'
            }`}
          >
            <span className={`dot-indicator ${isPlaying ? 'emerald' : 'amber'}`} />
            {isPlaying ? 'EN TRAYECTORIA' : 'PAUSADO'}
          </span>
        </div>

        {/* Botones principales de acción */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
          <button
            onClick={onTogglePlay}
            className={`btn ${isPlaying ? 'btn-amber' : 'btn-emerald'}`}
            style={{ flex: '2 1 140px', padding: '10px 16px' }}
          >
            {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            <span>{isPlaying ? 'Pausar Haz' : 'Disparar Haz'}</span>
          </button>

          <button
            onClick={onReset}
            className="btn btn-secondary"
            title="Reiniciar haz al orificio emisor"
            style={{ flex: '1 1 80px' }}
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>

        {/* Velocidad de reproducción y auto-calibración */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            flexWrap: 'wrap',
            gap: '8px',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Paso:</span>
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                onClick={() => onSpeedChange(spd)}
                style={{
                  background: playbackSpeed === spd ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: playbackSpeed === spd ? '#38bdf8' : '#94a3b8',
                  border: playbackSpeed === spd ? '1px solid #38bdf8' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '3px 7px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {spd}x
              </button>
            ))}
          </div>

          <button
            onClick={onAutoCalibrate}
            className="btn btn-cyan-outline"
            style={{ padding: '4px 10px', fontSize: '0.75rem', flexShrink: 0 }}
            title="Ajusta automáticamente vx = E / B para que la partícula no se desvíe"
          >
            <Target size={14} />
            <span>Auto-Calibrar (E/B)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MEDIDOR DE BALANCE DE LORENTZ (TIRA Y AFLOJA)         */}
      {/* ======================================================== */}
      <div
        className="deck-card force-balance-card"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          border: `1px solid ${
            isBalanced ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.4)'
          }`,
        }}
      >
        <div className="deck-card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', wordBreak: 'break-word' }}>
            <Scale size={15} color={isBalanced ? '#34d399' : '#f87171'} style={{ flexShrink: 0 }} />
            Equilibrio de Fuerzas
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: isBalanced ? '#34d399' : '#f87171',
              whiteSpace: 'nowrap',
            }}
          >
            {isBalanced ? '100% BALANCE' : `${Math.abs(clampedOffset * 2).toFixed(0)}% DESVÍO`}
          </span>
        </div>

        {/* Barra visual tipo tira y afloja */}
        <div className="lorentz-meter-container" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ color: '#fbbf24', fontWeight: 600, wordBreak: 'break-word' }}>← Fe (Eléctrica)</span>
            <span style={{ color: '#a855f7', fontWeight: 600, wordBreak: 'break-word' }}>Fm (Magnética) →</span>
          </div>

          <div className="lorentz-meter-bar" style={{ width: '100%' }}>
            {/* Marcador central de equilibrio */}
            <div className="lorentz-marker-center" />

            {/* Aguja dinámica */}
            <div
              className="lorentz-meter-fill"
              style={{
                left: `${50 + clampedOffset - 4}%`,
                width: '8px',
                background: isBalanced ? '#10b981' : clampedOffset > 0 ? '#a855f7' : '#fbbf24',
                boxShadow: isBalanced
                  ? '0 0 12px #10b981'
                  : clampedOffset > 0
                  ? '0 0 12px #a855f7'
                  : '0 0 12px #fbbf24',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>
              Fe: {Math.abs(Fe) < 1e-10 ? Fe.toExponential(2) : Fe.toFixed(2)} N
            </span>
            <span style={{ color: '#cbd5e1', wordBreak: 'break-all' }}>
              Fm: {Math.abs(Fm) < 1e-10 ? Fm.toExponential(2) : Fm.toFixed(2)} N
            </span>
          </div>
        </div>

        {/* Diagnóstico textual */}
        <div
          style={{
            fontSize: '0.75rem',
            color: isBalanced ? '#34d399' : '#cbd5e1',
            lineHeight: 1.35,
            padding: '4px 0',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            width: '100%',
          }}
        >
          {isBalanced ? (
            <span>✅ <strong>Haz Colimado:</strong> Fuerzas iguales y opuestas. Atraviesa el selector sin desvío.</span>
          ) : params.v_x > idealVelocity ? (
            <span>↗ <strong>Predomina Fm:</strong> La partícula se curva hacia la placa opuesta (v &gt; E/B).</span>
          ) : (
            <span>↘ <strong>Predomina Fe:</strong> La partícula se curva hacia la placa de carga contraria (v &lt; E/B).</span>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SELECTOR DE PARTÍCULAS                                */}
      {/* ======================================================== */}
      <ParticleSelector selectedType={particleType} onSelect={handleParticleSelect} />

      {/* ======================================================== */}
      {/* 4. PARÁMETROS FÍSICOS                                     */}
      {/* ======================================================== */}
      <div className="deck-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="deck-card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', wordBreak: 'break-word' }}>
            <Sliders size={15} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            Parámetros Físicos
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Valores SI</span>
        </div>

        {/* Velocidad Inicial vx con botones de ±10% */}
        <div className="field-group" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="field-label-row">
            <span className="field-name">
              <ChevronRight size={13} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
              Velocidad Inicial (vₓ)
            </span>
            <span className="field-unit">[m/s]</span>
          </div>

          <input
            type="number"
            name="v_x"
            value={params.v_x}
            onChange={handleChange}
            className="field-input"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px', width: '100%' }}>
            <button
              onClick={() => adjustVelocity(0.9)}
              className="btn btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#fbbf24',
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              title="Disminuir velocidad inicial un 10%"
            >
              −10% vₓ
            </button>
            <button
              onClick={() => adjustVelocity(1.1)}
              className="btn btn-secondary"
              style={{
                padding: '6px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#a855f7',
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              title="Aumentar velocidad inicial un 10%"
            >
              +10% vₓ
            </button>
          </div>

          <span className="field-hint" style={{ marginTop: '2px', wordBreak: 'break-word' }}>
            Equilibrio requerido: <code>v = E/B = {idealVelocity.toLocaleString()} m/s</code>
          </span>
        </div>

        {/* Cuadrícula balanceada de Parámetros Físicos (E, B, q, m) */}
        <div
          className="params-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '12px',
            marginTop: '4px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {/* Campo Eléctrico Ey */}
          <div className="field-group" style={{ minWidth: 0 }}>
            <div className="field-label-row">
              <span className="field-name" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <ChevronRight size={13} color="var(--accent-amber)" style={{ flexShrink: 0 }} />
                Campo (Eᵧ)
              </span>
              <span
                className="field-unit"
                style={{
                  color: '#fbbf24',
                  background: 'rgba(251,191,36,0.12)',
                  borderColor: 'rgba(251,191,36,0.3)',
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  flexShrink: 0,
                }}
              >
                [V/m]
              </span>
            </div>
            <input
              type="number"
              name="E_y"
              value={params.E_y}
              onChange={handleChange}
              className="field-input"
            />
          </div>

          {/* Campo Magnético Bz */}
          <div className="field-group" style={{ minWidth: 0 }}>
            <div className="field-label-row">
              <span className="field-name" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <ChevronRight size={13} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
                Campo (B₂)
              </span>
              <span
                className="field-unit"
                style={{
                  color: '#06b6d4',
                  background: 'rgba(6,182,212,0.12)',
                  borderColor: 'rgba(6,182,212,0.3)',
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  flexShrink: 0,
                }}
              >
                [T]
              </span>
            </div>
            <input
              type="number"
              step="0.01"
              name="B_z"
              value={params.B_z}
              onChange={handleChange}
              className="field-input"
            />
          </div>

          {/* Carga Eléctrica q */}
          <div className="field-group" style={{ minWidth: 0 }}>
            <div className="field-label-row">
              <span className="field-name" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <ChevronRight size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
                Carga (q)
              </span>
              <span
                className="field-unit"
                style={{
                  color: '#38bdf8',
                  background: 'rgba(56,189,248,0.12)',
                  borderColor: 'rgba(56,189,248,0.3)',
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  flexShrink: 0,
                }}
              >
                [C]
              </span>
            </div>
            <input
              type="number"
              name="q"
              value={params.q}
              onChange={handleChange}
              className="field-input"
            />
          </div>

          {/* Masa m */}
          <div className="field-group" style={{ minWidth: 0 }}>
            <div className="field-label-row">
              <span className="field-name" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <ChevronRight size={13} color="#a855f7" style={{ flexShrink: 0 }} />
                Masa (m)
              </span>
              <span
                className="field-unit"
                style={{
                  color: '#a855f7',
                  background: 'rgba(168,85,247,0.12)',
                  borderColor: 'rgba(168,85,247,0.3)',
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  flexShrink: 0,
                }}
              >
                [kg]
              </span>
            </div>
            <input
              type="number"
              name="m"
              value={params.m}
              onChange={handleChange}
              className="field-input"
            />
          </div>
        </div>

        {/* Tiempo de Simulación */}
        <div className="field-group">
          <div className="field-label-row">
            <span className="field-name">
              <ChevronRight size={13} color="#f43f5e" />
              Ventana Temporal (t)
            </span>
            <span className="field-unit" style={{ color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}>
              [s]
            </span>
          </div>
          <input
            type="number"
            step="any"
            name="t_sim"
            value={params.t_sim}
            onChange={handleChange}
            className="field-input"
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. CAPAS DE VISUALIZACIÓN Y SENSIBILIDAD                 */}
      {/* ======================================================== */}
      <div className="deck-card" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="deck-card-title" style={{ flexWrap: 'wrap', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', wordBreak: 'break-word' }}>
            <Eye size={15} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
            Capas Visuales en Escena
          </span>
          <Layers size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        </div>

        {/* Toggles de visualización con estilo de interruptor moderno */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: '#cbd5e1',
            }}
          >
            <span>Campo Magnético (B ⊗)</span>
            <input
              type="checkbox"
              checked={showBField}
              onChange={onToggleBField}
              style={{ width: '16px', height: '16px', accentColor: '#06b6d4', cursor: 'pointer' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: '#cbd5e1',
            }}
          >
            <span>Campo Eléctrico (E ↓)</span>
            <input
              type="checkbox"
              checked={showEField}
              onChange={onToggleEField}
              style={{ width: '16px', height: '16px', accentColor: '#fbbf24', cursor: 'pointer' }}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: '#cbd5e1',
            }}
          >
            <span>Vectores de Fuerza (Fe, Fm, v)</span>
            <input
              type="checkbox"
              checked={showForces}
              onChange={onToggleForces}
              style={{ width: '16px', height: '16px', accentColor: '#a855f7', cursor: 'pointer' }}
            />
          </label>
        </div>

        {/* Selector de sensibilidad de desviación */}
        <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8' }}>
            <span>Sensibilidad de Curvatura:</span>
            <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {deflectionScale}x
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            {[
              { label: '0.5x', val: 0.5 },
              { label: '1.0x (Normal)', val: 1.0 },
              { label: '2.5x (Amplificada)', val: 2.5 },
            ].map((s) => (
              <button
                key={s.val}
                onClick={() => onDeflectionScaleChange(s.val)}
                style={{
                  flex: '1 1 80px',
                  background: deflectionScale === s.val ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                  color: deflectionScale === s.val ? '#38bdf8' : '#94a3b8',
                  border: deflectionScale === s.val ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  padding: '5px 4px',
                  fontSize: '0.7rem',
                  fontWeight: deflectionScale === s.val ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
