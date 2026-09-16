export interface SimulationPoint {
  x: number;
  y: number;
}

export interface SimulationParams {
  q: number;
  m: number;
  v_x: number;
  E_y: number;
  B_z: number;
  t_sim: number;
}

/**
 * Resuelve la trayectoria de una partícula en un Filtro de Wien (Selector de Velocidades)
 * mediante el modelo macroscópico de deflexión del haz bajo la fuerza neta de Lorentz:
 * 
 *   F_E = -q * Ey (fuerza eléctrica hacia el cátodo - si q > 0)
 *   F_B = +q * vx * Bz (fuerza magnética hacia el ánodo + si q > 0)
 *   F_net = F_E + F_B = q * (vx * Bz - Ey)
 * 
 * Propiedades físicas:
 * 1. v = Ey / Bz: F_net = 0 -> Trayectoria recta ideal sobre el eje óptico (y = 0).
 * 2. v > Ey / Bz: Predomina Fm -> Curvatura suave y continua hacia una de las placas.
 * 3. v < Ey / Bz: Predomina Fe -> Curvatura suave y continua hacia la placa contraria.
 * 4. Detección de colisión: Si la deflexión alcanza el límite de las placas, la partícula
 *    se detiene en el punto físico de impacto.
 * 5. Libre de aliasing/dientes de sierra: Curva C^∞ estrictamente suave y continua.
 */
export function solveLorentzTrajectory(
  params: SimulationParams,
  requestedPoints: number = 600
): SimulationPoint[] {
  const { q, m, v_x: vx0, E_y: Ey, B_z: Bz, t_sim } = params;

  if (m <= 0 || t_sim <= 0 || vx0 <= 0) {
    return [{ x: 0, y: 0 }];
  }

  const isMicro = Math.abs(q) < 1e-10;
  const yPlate = isMicro ? 0.04 : 2.0; // Distancia límite a las placas en metros
  const totalLength = vx0 * t_sim;
  const numPoints = Math.max(300, Math.min(800, requestedPoints));

  // 1. Partícula neutra (q = 0): línea recta pura
  if (Math.abs(q) < 1e-25) {
    const result: SimulationPoint[] = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      const x = (i / (numPoints - 1)) * totalLength;
      result[i] = { x, y: 0 };
    }
    return result;
  }

  // Fuerzas de Lorentz en el plano transversal Y
  const Fe = -q * Ey;
  const Fm = q * vx0 * Bz;
  const Fnet = Fe + Fm; // q * (vx0 * Bz - Ey)

  const maxF = Math.max(Math.abs(Fe), Math.abs(Fm), 1e-25);
  const eta = Fnet / maxF; // Imbalance normalizado adimensional en [-1, 1]

  // Condición de equilibrio exacto (v = E / B): línea recta ideal sobre el eje óptico
  if (Math.abs(eta) < 1e-6) {
    const result: SimulationPoint[] = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      const x = (i / (numPoints - 1)) * totalLength;
      result[i] = { x, y: 0 };
    }
    return result;
  }

  // Factor de sensibilidad de deflexión calibrado para visualización pedagógica clara:
  // Un desvío de velocidad del ±10% genera un ~30% de deflexión hacia la placa;
  // desvíos superiores al ~35% alcanzan la placa y colisionan antes de la salida.
  const kDeflect = 3.2;
  const yExitIdeal = kDeflect * yPlate * eta;

  // Detección de colisión con las placas (|y| >= yPlate)
  let collided = false;
  let xEnd = totalLength;

  if (Math.abs(yExitIdeal) >= yPlate) {
    collided = true;
    const fractionImpact = Math.sqrt(yPlate / Math.abs(yExitIdeal));
    xEnd = Math.min(totalLength, totalLength * fractionImpact);
  }

  const sign = eta > 0 ? 1.0 : -1.0;
  const result: SimulationPoint[] = new Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const x = (i / (numPoints - 1)) * xEnd;
    const u = x / totalLength;
    let y = yExitIdeal * (u * u);

    if (Math.abs(y) >= yPlate) {
      y = sign * yPlate;
    }

    result[i] = { x, y };
  }

  // Si hubo colisión, asegurar que el último punto coincida exactamente con la placa
  if (collided && result.length > 0) {
    result[result.length - 1].y = sign * yPlate;
  }

  return result;
}


