import { type SimulationParams } from '../components/ControlPanel';

export type ParticleType = 'proton' | 'electron' | 'alpha' | 'didactic' | 'custom';

export interface ParticlePreset {
  name: string;
  symbol: string;
  chargeStr: string;
  massStr: string;
  idealSpeedStr: string;
  description: string;
  color: string;
  accentBg: string;
  params: SimulationParams;
}

export const PARTICLE_PRESETS: Record<Exclude<ParticleType, 'custom'>, ParticlePreset> = {
  proton: {
    name: 'Protón',
    symbol: 'p⁺',
    chargeStr: '+1.602 × 10⁻¹⁹ C',
    massStr: '1.673 × 10⁻²⁷ kg',
    idealSpeedStr: '100,000 m/s',
    description: 'Carga positiva fundamental. Equilibrado con E = 10 kV/m y B = 0.1 T.',
    color: '#38bdf8',
    accentBg: 'rgba(56, 189, 248, 0.15)',
    params: {
      q: 1.602e-19,
      m: 1.673e-27,
      v_x: 100000,
      E_y: 10000,
      B_z: 0.1,
      t_sim: 0.00012,
    },
  },
  electron: {
    name: 'Electrón',
    symbol: 'e⁻',
    chargeStr: '−1.602 × 10⁻¹⁹ C',
    massStr: '9.109 × 10⁻³¹ kg',
    idealSpeedStr: '2,000,000 m/s',
    description: 'Partícula leptónica ultraliviana. Requiere alta velocidad para su filtrado.',
    color: '#06b6d4',
    accentBg: 'rgba(6, 182, 212, 0.15)',
    params: {
      q: -1.602e-19,
      m: 9.109e-31,
      v_x: 2000000,
      E_y: 20000,
      B_z: 0.01,
      t_sim: 0.000006,
    },
  },
  alpha: {
    name: 'Partícula Alfa',
    symbol: 'α²⁺',
    chargeStr: '+3.204 × 10⁻¹⁹ C',
    massStr: '6.644 × 10⁻²⁷ kg',
    idealSpeedStr: '50,000 m/s',
    description: 'Núcleo de Helio (2p + 2n). Doble carga positiva y 4 veces más inercia.',
    color: '#f59e0b',
    accentBg: 'rgba(245, 158, 11, 0.15)',
    params: {
      q: 3.204e-19,
      m: 6.644e-27,
      v_x: 50000,
      E_y: 5000,
      B_z: 0.1,
      t_sim: 0.00024,
    },
  },
  didactic: {
    name: 'Modo Didáctico',
    symbol: '1 C',
    chargeStr: '1.0 C',
    massStr: '1.0 kg',
    idealSpeedStr: '10 m/s',
    description: 'Unidades normalizadas ideales para aprendizaje intuitivo (v = 20 V/m ÷ 2 T).',
    color: '#a855f7',
    accentBg: 'rgba(168, 85, 247, 0.15)',
    params: {
      q: 1.0,
      m: 1.0,
      v_x: 10.0,
      E_y: 20.0,
      B_z: 2.0,
      t_sim: 1.2,
    },
  },
};
