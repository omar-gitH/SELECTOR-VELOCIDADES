import { useEffect, useRef, useState, type FC } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { BookOpen, ChevronDown, ChevronUp, Scale, CheckCircle2, AlertTriangle } from 'lucide-react';

interface FormulaDisplayProps {
  E_y: number;
  B_z: number;
  v_x?: number;
}

export const FormulaDisplay: FC<FormulaDisplayProps> = ({ E_y, B_z, v_x = 0 }) => {
  const formulaRef = useRef<HTMLDivElement>(null);
  const conditionRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Calcular la velocidad ideal para un movimiento rectilíneo sin desviación (E/B)
  const idealV = B_z !== 0 ? Math.abs(E_y / B_z) : 0;
  const isBalanced = idealV > 0 && Math.abs(v_x - idealV) < idealV * 0.008;

  useEffect(() => {
    if (formulaRef.current) {
      const lorentzLatex = "\\displaystyle \\vec{F} = q\\,(\\vec{E} + \\vec{v} \\times \\vec{B})";
      katex.render(lorentzLatex, formulaRef.current, {
        displayMode: false,
        throwOnError: false,
      });
    }

    if (conditionRef.current) {
      const conditionLatex = "\\displaystyle \\sum \\vec{F} = 0 \\implies qE = qvB \\implies v = \\frac{E}{B}";
      katex.render(conditionLatex, conditionRef.current, {
        displayMode: false,
        throwOnError: false,
      });
    }
  }, []);

  return (
    <div
      className="glass-panel formula-card"
      style={{
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        overflowWrap: 'break-word',
        wordBreak: 'break-word',
        border: isBalanced
          ? '1px solid rgba(16, 185, 129, 0.4)'
          : '1px solid rgba(56, 189, 248, 0.25)',
        boxShadow: isBalanced
          ? '0 4px 20px -2px rgba(16, 185, 129, 0.2)'
          : '0 4px 20px -2px rgba(56, 189, 248, 0.15)',
        position: 'relative',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Barra superior de la tarjeta */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 240px', minWidth: 0 }}>
          <div
            style={{
              padding: '6px',
              borderRadius: '8px',
              background: isBalanced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
              color: isBalanced ? '#34d399' : '#38bdf8',
              flexShrink: 0,
            }}
          >
            <Scale size={16} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#f8fafc',
                wordBreak: 'break-word',
              }}
            >
              Principio Físico: Selector de Wien & Lorentz
            </h3>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-word' }}>
              Campos ortogonales cruzados: E ⊥ B ⊥ v
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Badge de estado de equilibrio */}
          <div
            className={`status-pill ${
              isBalanced ? 'status-pill-emerald' : 'status-pill-amber'
            }`}
          >
            <span className={`dot-indicator ${isBalanced ? 'emerald' : 'amber'}`} />
            {isBalanced ? 'HAZ EN EQUILIBRIO' : 'HAZ DESVIADO'}
          </div>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            style={{
              background: isExpanded ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.06)',
              border: isExpanded ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: isExpanded ? '#38bdf8' : '#cbd5e1',
              padding: '5px 9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.72rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
          >
            <BookOpen size={13} />
            <span>{isExpanded ? 'Ocultar' : 'Fórmulas'}</span>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Renglón clave: Velocidad de no-desviación interactiva */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '10px',
          width: '100%',
          boxSizing: 'border-box',
          background: 'rgba(6, 11, 24, 0.65)',
          borderRadius: '12px',
          padding: '10px 14px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Condición de Paso Rectilíneo
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.15rem',
                fontWeight: 700,
                color: isBalanced ? '#34d399' : '#38bdf8',
              }}
            >
              v = E / B
            </span>
            <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              ={' '}
              <strong style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>
                {idealV.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </strong>{' '}
              m/s
            </span>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Velocidad del Haz Disparado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.05rem',
                fontWeight: 700,
                color: isBalanced ? '#34d399' : '#fbbf24',
              }}
            >
              {v_x.toLocaleString()} m/s
            </span>
            {isBalanced ? (
              <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
            )}
          </div>
        </div>
      </div>

      {/* Acordeón colapsable con transición fluida CSS Grid (grid-template-rows: 0fr -> 1fr) */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <div
          style={{
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            boxSizing: 'border-box',
            paddingTop: isExpanded ? '12px' : '0px',
            borderTop: isExpanded ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
            transition: 'padding-top 0.35s ease',
          }}
        >
          {/* Tarjetas de Fórmulas Matemáticas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
              gap: '12px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* 1. Ecuación General de Lorentz */}
            <div
              style={{
                background: 'rgba(12, 19, 36, 0.85)',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, letterSpacing: '0.02em' }}>
                1. Ecuación General de Lorentz:
              </div>
              <div
                ref={formulaRef}
                style={{
                  fontSize: '0.98rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 0',
                  color: '#f8fafc',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                }}
              />
            </div>

            {/* 2. Saldo Vectorial para No Desviación */}
            <div
              style={{
                background: 'rgba(12, 19, 36, 0.85)',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                width: '100%',
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 600, letterSpacing: '0.02em' }}>
                2. Saldo Vectorial para No Desviación:
              </div>
              <div
                ref={conditionRef}
                style={{
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px 0',
                  color: '#f8fafc',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                }}
              />
            </div>
          </div>

          {/* Explicación pedagógica de los fundamentos */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              padding: '10px 14px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              width: '100%',
              boxSizing: 'border-box',
              overflowWrap: 'break-word',
              wordBreak: 'break-word',
            }}
          >
            <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
              💡 <strong style={{ color: '#f8fafc' }}>Independencia de masa y carga:</strong> Al igualar las fuerzas{' '}
              <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>qE = qvB</span>, la carga{' '}
              <span style={{ color: '#cbd5e1' }}>q</span> se cancela y la masa <span style={{ color: '#cbd5e1' }}>m</span> no interviene.
              Por lo tanto, la velocidad seleccionada <span style={{ color: '#34d399', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>v = E / B</span>{' '}
              es una condición puramente geométrica y cinemática: cualquier partícula que ingrese a esa rapidez continuará en línea recta sin chocar con las placas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
