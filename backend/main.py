from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

app = FastAPI(title="Wien Filter Physics Engine")

# Configurar CORS para permitir peticiones desde el frontend (Vite por defecto usa el puerto 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción se debe restringir a los dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimulationParams(BaseModel):
    q: float
    m: float
    v_x: float
    E_y: float
    B_z: float
    t_sim: float

@app.post("/simular")
def simular_trayectoria(params: SimulationParams):
    """
    Calcula la trayectoria macroscópica de una partícula en un selector de velocidades (Filtro de Wien)
    bajo la acción de la fuerza neta de Lorentz:
      Fe = -q * Ey (fuerza eléctrica hacia el cátodo - si q > 0)
      Fm = +q * vx * Bz (fuerza magnética hacia el ánodo + si q > 0)
      Fnet = Fe + Fm = q * (vx * Bz - Ey)
    
    Genera una curva continua C^∞ suave con tendencia hacia la placa superior o inferior
    y detección física de colisión, libre de oscilaciones ciclotrónicas y sin artefactos dentados.
    """
    q = params.q
    m = params.m
    vx0 = params.v_x
    Ey = params.E_y
    Bz = params.B_z
    t_sim = params.t_sim

    if m <= 0 or t_sim <= 0 or vx0 <= 0:
        return [{"x": 0.0, "y": 0.0}]

    is_micro = abs(q) < 1e-10
    y_plate = 0.04 if is_micro else 2.0  # Límite de placas en metros
    total_length = vx0 * t_sim
    num_points = 600

    # 1. Partícula neutra (q = 0)
    if abs(q) < 1e-25:
        x_vals = np.linspace(0, total_length, num_points)
        return [{"x": float(x), "y": 0.0} for x in x_vals]

    # Fuerzas de Lorentz en el plano transversal Y
    Fe = -q * Ey
    Fm = q * vx0 * Bz
    Fnet = Fe + Fm  # q * (vx0 * Bz - Ey)

    max_f = max(abs(Fe), abs(Fm), 1e-25)
    eta = Fnet / max_f  # Imbalance adimensional en [-1, 1]

    # Condición de equilibrio perfecto (v = E / B)
    if abs(eta) < 1e-6:
        x_vals = np.linspace(0, total_length, num_points)
        return [{"x": float(x), "y": 0.0} for x in x_vals]

    # Sensibilidad de curvatura: ±10% de velocidad produce ~30% de deflexión hacia la placa
    k_deflect = 3.2
    y_exit_ideal = k_deflect * y_plate * eta

    # Detección de colisión con placas (|y| >= y_plate)
    collided = False
    x_end = total_length

    if abs(y_exit_ideal) >= y_plate:
        collided = True
        fraction_impact = np.sqrt(y_plate / abs(y_exit_ideal))
        x_end = min(total_length, total_length * fraction_impact)

    sign = 1.0 if eta > 0 else -1.0
    x_vals = np.linspace(0, x_end, num_points)
    points = []

    for x in x_vals:
        u = x / total_length
        y = y_exit_ideal * (u ** 2)
        if abs(y) >= y_plate:
            y = sign * y_plate
        points.append({"x": float(x), "y": float(y)})

    if collided and len(points) > 0:
        points[-1]["y"] = float(sign * y_plate)

    return points

