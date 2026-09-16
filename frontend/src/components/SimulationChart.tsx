import { type FC, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Download, Activity, CheckCircle, AlertTriangle, MoveVertical, Compass, Zap } from 'lucide-react';
import { type SimulationParams } from './ControlPanel';

export interface Point {
  x: number;
  y: number;
}

interface SimulationChartProps {
  data: Point[];
  params?: SimulationParams;
  deflectionScale?: number;
}

export const SimulationChart: FC<SimulationChartProps> = ({ data, params, deflectionScale = 1.0 }) => {
  // Limpieza, ordenamiento y sanitización de datos de trayectoria para Recharts
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const valid = data
      .filter((pt) => typeof pt.x === 'number' && !isNaN(pt.x) && typeof pt.y === 'number' && !isNaN(pt.y))
      .map((pt) => ({ x: pt.x, y: pt.y }))
      .sort((a, b) => a.x - b.x);

    // Si hay más de 800 puntos, preservamos la fluidez del DOM SVG muestreando 800 puntos clave
    if (valid.length > 800) {
      const step = (valid.length - 1) / 799;
      const downsampled: Point[] = [];
      for (let i = 0; i < 799; i++) {
        downsampled.push(valid[Math.round(i * step)]);
      }
      downsampled.push(valid[valid.length - 1]);
      return downsampled;
    }

    return valid;
  }, [data]);

  // Métricas avanzadas calculadas a partir de la trayectoria
  const metrics = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        maxY: 0,
        finalY: 0,
        maxX: 0,
        isTransmitted: false,
        kineticEnergyJoules: 0,
        kineticEnergyEV: 0,
      };
    }

    let maxY = 0;
    for (const pt of chartData) {
      if (Math.abs(pt.y) > Math.abs(maxY)) {
        maxY = pt.y;
      }
    }

    const lastPt = chartData[chartData.length - 1];
    const finalY = lastPt.y;
    const maxX = lastPt.x;

    // Placas físicas reales aproximadas en la escala
    const isMicro = params && Math.abs(params.q) < 1e-10;
    const plateLimit = isMicro ? 0.04 : 2.0;
    const slitAperture = plateLimit * 0.2;

    const totalSimLength = (params?.v_x || 100000) * (params?.t_sim || 0.00012);
    const hasCollided = Math.abs(finalY) >= plateLimit * 0.98 || (totalSimLength > 0 && maxX < totalSimLength * 0.95);
    const isTransmitted = !hasCollided && Math.abs(finalY) <= slitAperture;

    // Energía cinética: Ek = 0.5 * m * v^2
    const m = params?.m || 1.67e-27;
    const v = params?.v_x || 100000;
    const keJ = 0.5 * m * Math.pow(v, 2);
    const keEV = keJ / 1.602176634e-19;

    return {
      maxY,
      finalY,
      maxX,
      hasCollided,
      isTransmitted,
      kineticEnergyJoules: keJ,
      kineticEnergyEV: keEV,
    };
  }, [chartData, params]);

  // Exportar datos a CSV
  const handleExportCSV = () => {
    if (!chartData || chartData.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,Punto,X (m),Y (m)\n';
    chartData.forEach((pt, idx) => {
      csvContent += `${idx + 1},${pt.x},${pt.y}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trayectoria_selector_velocidades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parámetros de geometría física y escala
  const isMicro = !params || Math.abs(params.q) < 1e-10;
  // Límite físico nominal de las placas condensadoras
  const plateBound = isMicro ? 0.04 : 2.0;

  // Límite del eje X (Posición longitudinal)
  const maxX = useMemo(() => {
    if (chartData.length > 0 && metrics.maxX > 0) {
      return Number(metrics.maxX.toFixed(4));
    }
    const estX = (params?.v_x || 100000) * (params?.t_sim || 0.00012);
    return estX > 0 ? Number(estX.toFixed(4)) : 12;
  }, [chartData, metrics.maxX, params]);

  // Cálculo del rango simétrico del eje Y ajustado a la sensibilidad de curvatura
  const yLimit = useMemo(() => {
    const scale = deflectionScale > 0 ? deflectionScale : 1.0;
    // Rango base del eje: mayor sensibilidad = escala más compacta (zoom in a desvíos sutiles)
    const baseRange = plateBound / scale;
    const maxObserved = Math.abs(metrics.maxY);
    // Asegurar que si la partícula se desvía mucho, no se recorte la gráfica
    return Math.max(baseRange, maxObserved * 1.15, 1e-4);
  }, [deflectionScale, plateBound, metrics.maxY]);

  // Formato dinámico para los ticks del eje Y según la magnitud física
  const formatYTick = (val: number) => {
    if (Math.abs(val) < 1e-9) return '0';
    if (yLimit <= 0.015) {
      // Escala milimétrica
      return `${(val * 1000).toFixed(1)} mm`;
    } else if (yLimit <= 0.1) {
      // Escala centimétrica
      return `${(val * 100).toFixed(1)} cm`;
    }
    return `${val.toFixed(2)} m`;
  };

  return (
    <div
      className="glass-panel"
      style={{
        flex: 1,
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '1px solid rgba(56, 189, 248, 0.25)',
      }}
    >
      {/* Cabecera del Osciloscopio / Gráfica */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--accent-cyan)" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
              Gráfica Numérica de Trayectoria 2D
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Resolución diferencial ordinaria (EDO Runge-Kutta / SciPy) con límites físicos de condensador.
          </p>
        </div>

        <button onClick={handleExportCSV} className="btn btn-cyan-outline" style={{ fontSize: '0.75rem' }}>
          <Download size={14} />
          <span>Exportar Datos CSV</span>
        </button>
      </div>

      {/* Tarjetas de Métricas de Laboratorio con diseño espacioso y centrado */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
          gap: '12px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Desviación Máxima */}
        <div
          style={{
            background: 'rgba(6, 11, 24, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minHeight: '74px',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MoveVertical size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Desviación Máx. (Δy)
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: '2px' }}>
              {Math.abs(metrics.maxY) < 0.01 && metrics.maxY !== 0
                ? `${(metrics.maxY * 1000).toFixed(2)} mm`
                : `${metrics.maxY.toFixed(4)} m`}
            </div>
          </div>
        </div>

        {/* Posición de Salida */}
        <div
          style={{
            background: 'rgba(6, 11, 24, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minHeight: '74px',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(168, 85, 247, 0.15)',
              color: '#a855f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Compass size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Posición Salida (y)
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#a855f7', marginTop: '2px' }}>
              {Math.abs(metrics.finalY) < 0.01 && metrics.finalY !== 0
                ? `${(metrics.finalY * 1000).toFixed(2)} mm`
                : `${metrics.finalY.toFixed(4)} m`}
            </div>
          </div>
        </div>

        {/* Estado de Transmisión */}
        <div
          style={{
            background: metrics.isTransmitted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
              metrics.isTransmitted ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'
            }`,
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minHeight: '74px',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: metrics.isTransmitted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: metrics.isTransmitted ? '#34d399' : '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {metrics.isTransmitted ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Estado del Haz
            </span>
            <div
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: metrics.isTransmitted ? '#34d399' : '#f87171',
                marginTop: '2px',
              }}
            >
              {metrics.isTransmitted
                ? 'PASA RENDIJA'
                : metrics.hasCollided
                ? 'IMPACTO EN PLACA'
                : 'FILTRADO / BLOQ.'}
            </div>
          </div>
        </div>

        {/* Energía Cinética */}
        <div
          style={{
            background: 'rgba(6, 11, 24, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minHeight: '74px',
          }}
        >
          <div
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Zap size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Energía Cinética (Eₖ)
            </span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fbbf24', marginTop: '2px' }}>
              {metrics.kineticEnergyEV >= 1
                ? `${metrics.kineticEnergyEV.toLocaleString(undefined, { maximumFractionDigits: 1 })} eV`
                : `${metrics.kineticEnergyJoules.toExponential(2)} J`}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico 2D interactivo responsivo */}
      <div
        style={{
          width: '100%',
          height: '430px',
          minHeight: '390px',
          background: 'rgba(21, 32, 54, 0.85)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          padding: '16px 16px 12px 10px',
          position: 'relative',
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 25, right: 35, bottom: 45, left: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.14)" />

            <XAxis
              type="number"
              dataKey="x"
              domain={[0, maxX]}
              tickCount={7}
              allowDataOverflow={false}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickFormatter={(val) => Number(val).toFixed(1)}
              label={{
                value: 'Posición Longitudinal X [m]',
                position: 'insideBottom',
                offset: -12,
                fill: '#94a3b8',
                fontSize: 12,
                fontWeight: 600,
              }}
            />

            <YAxis
              type="number"
              dataKey="y"
              domain={[-yLimit, yLimit]}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              tickFormatter={formatYTick}
              label={{
                value: yLimit <= 0.015 ? 'Desviación Y [mm]' : yLimit <= 0.1 ? 'Desviación Y [cm]' : 'Desviación Y [m]',
                angle: -90,
                position: 'insideLeft',
                offset: 8,
                fill: '#94a3b8',
                fontSize: 12,
                fontWeight: 600,
              }}
            />

            {/* Líneas de referencia horizontales (Annotations dentro del gráfico) */}
            <ReferenceLine
              y={plateBound}
              stroke="#ef4444"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `Placa Superior (+) Límite [${plateBound >= 1 ? plateBound + 'm' : (plateBound * 1000) + 'mm'}]`,
                fill: '#f87171',
                fontSize: 11,
                fontWeight: 600,
                position: 'insideTopLeft',
              }}
            />

            <ReferenceLine
              y={0}
              stroke="#10b981"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{
                value: 'Eje Óptico Ideal (v = E/B)',
                fill: '#34d399',
                fontSize: 11,
                fontWeight: 600,
                position: 'insideBottomLeft',
              }}
            />

            <ReferenceLine
              y={-plateBound}
              stroke="#3b82f6"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{
                value: `Placa Inferior (−) Límite [${plateBound >= 1 ? -plateBound + 'm' : (-plateBound * 1000) + 'mm'}]`,
                fill: '#60a5fa',
                fontSize: 11,
                fontWeight: 600,
                position: 'insideBottomLeft',
              }}
            />

            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#38bdf8', strokeWidth: 1.5 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const dataPt = payload[0].payload as Point;
                  return (
                    <div
                      style={{
                        background: 'rgba(8, 14, 28, 0.96)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: '6px', fontSize: '0.82rem' }}>
                        Punto de Trayectoria
                      </div>
                      <div style={{ color: '#cbd5e1', marginBottom: '3px' }}>
                        Posición X: <strong style={{ color: '#f8fafc' }}>{dataPt.x.toFixed(4)} m</strong>
                      </div>
                      <div style={{ color: '#cbd5e1' }}>
                        Desviación Y:{' '}
                        <strong style={{ color: Math.abs(dataPt.y) < 1e-4 ? '#34d399' : '#f59e0b' }}>
                          {Math.abs(dataPt.y) < 0.01
                            ? `${(dataPt.y * 1000).toFixed(3)} mm`
                            : `${dataPt.y.toFixed(4)} m`}
                        </strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Trayectoria continua suave e interpolada (Figura B y D): curva continua monotone esmeralda sin saltos */}
            <Scatter
              name="Trayectoria del Haz"
              data={chartData}
              line={{ stroke: '#10b981', strokeWidth: 3, type: 'monotone' }}
              lineType="joint"
              shape={() => null}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
