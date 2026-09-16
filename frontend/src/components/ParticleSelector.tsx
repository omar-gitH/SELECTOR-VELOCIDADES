import { type FC } from 'react';
import { type SimulationParams } from './ControlPanel';
import { Atom, Zap, CircleDot, GraduationCap, Wrench, Check } from 'lucide-react';
import { type ParticleType, PARTICLE_PRESETS } from '../types/particles';

export type { ParticleType, ParticlePreset } from '../types/particles';
export { PARTICLE_PRESETS } from '../types/particles';

interface ParticleSelectorProps {
  selectedType: ParticleType;
  onSelect: (type: ParticleType, newParams?: SimulationParams) => void;
}

export const ParticleSelector: FC<ParticleSelectorProps> = ({ selectedType, onSelect }) => {
  const getIcon = (type: ParticleType) => {
    switch (type) {
      case 'proton':
        return <Atom size={16} color="#38bdf8" />;
      case 'electron':
        return <Zap size={16} color="#06b6d4" />;
      case 'alpha':
        return <CircleDot size={16} color="#f59e0b" />;
      case 'didactic':
        return <GraduationCap size={16} color="#a855f7" />;
      case 'custom':
        return <Wrench size={16} color="#94a3b8" />;
    }
  };

  const types: ParticleType[] = ['proton', 'electron', 'alpha', 'didactic', 'custom'];

  return (
    <div className="deck-card">
      <div className="deck-card-title">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Atom size={16} className="spin-slow" style={{ color: 'var(--accent-cyan)' }} />
          Partículas y Presets
        </span>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--accent-cyan)',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {selectedType.toUpperCase()}
        </span>
      </div>

      {/* Cuadrícula de presets interactivos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {types.map((t) => {
          const isSelected = selectedType === t;
          const preset = t !== 'custom' ? PARTICLE_PRESETS[t] : null;

          return (
            <button
              key={t}
              onClick={() => {
                if (t !== 'custom') {
                  onSelect(t, PARTICLE_PRESETS[t].params);
                } else {
                  onSelect('custom');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '8px',
                background: isSelected
                  ? preset
                    ? preset.accentBg
                    : 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${
                  isSelected
                    ? preset
                      ? preset.color
                      : '#f8fafc'
                    : 'rgba(255, 255, 255, 0.08)'
                }`,
                color: isSelected ? '#ffffff' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left',
                gridColumn: t === 'custom' ? 'span 2' : 'span 1',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                {getIcon(t)}
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {preset ? preset.name : 'Personalizada'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: isSelected ? '#e2e8f0' : '#64748b',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {preset ? preset.symbol : 'q, m variables'}
                  </span>
                </div>
              </div>

              {isSelected && <Check size={15} style={{ color: preset ? preset.color : '#ffffff', flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {/* Resumen explicativo del preset seleccionado */}
      {selectedType !== 'custom' && PARTICLE_PRESETS[selectedType] && (
        <div
          style={{
            background: 'rgba(6, 11, 24, 0.6)',
            borderRadius: '8px',
            padding: '8px 10px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '0.72rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
            <span>Velocidad óptima:</span>
            <span style={{ color: '#34d399', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
              {PARTICLE_PRESETS[selectedType].idealSpeedStr}
            </span>
          </div>
          <p style={{ color: '#94a3b8', lineHeight: 1.35, margin: 0 }}>
            {PARTICLE_PRESETS[selectedType].description}
          </p>
        </div>
      )}
    </div>
  );
};
