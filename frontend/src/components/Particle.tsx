import { type FC, memo } from 'react';
import { Text, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleProps {
  position: [number, number, number];
  Fe: number; // Fuerza eléctrica en Y
  Fm: number; // Fuerza magnética en Y
  vx: number; // Velocidad en X
  charge: number;
  trailPoints: [number, number, number][];
  fullTrajectoryPoints?: [number, number, number][];
  isCollided?: boolean;
  collisionPlate?: 'top' | 'bottom' | null;
  showForces?: boolean;
}

// Subcomponente de Vector 3D geométrico limpio
const ForceArrow: FC<{
  direction: [number, number, number];
  length: number;
  color: string;
}> = ({ direction, length, color }) => {
  if (Math.abs(length) < 0.05) return null;

  const dirVector = new THREE.Vector3(...direction).normalize();
  const arrowLen = Math.min(Math.max(Math.abs(length), 0.35), 1.8);

  const up = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dirVector);

  return (
    <group quaternion={quaternion}>
      {/* Cuerpo cilíndrico del vector */}
      <mesh position={[0, arrowLen / 2, 0]}>
        <cylinderGeometry args={[0.025, 0.025, arrowLen, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>

      {/* Cabeza cónica de la flecha */}
      <mesh position={[0, arrowLen + 0.12, 0]}>
        <coneGeometry args={[0.09, 0.22, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};

export const Particle: FC<ParticleProps> = memo(({
  position,
  Fe,
  Fm,
  charge,
  trailPoints,
  fullTrajectoryPoints,
  isCollided = false,
  collisionPlate = null,
  showForces = true,
}) => {
  // Color esmeralda vibrante para la trayectoria física continua (Figura B y D)
  const particleColor = charge > 0 ? '#10b981' : charge < 0 ? '#06b6d4' : '#fbbf24';

  // Escala visual proporcional de las flechas de fuerza
  const maxF = Math.max(Math.abs(Fe), Math.abs(Fm), 1e-18);
  const feVisualLen = (Math.abs(Fe) / maxF) * 1.3;
  const fmVisualLen = (Math.abs(Fm) / maxF) * 1.3;

  const feDirY = Fe >= 0 ? 1 : -1;
  const fmDirY = Fm >= 0 ? 1 : -1;

  const feDir: [number, number, number] = [0, feDirY, 0];
  const fmDir: [number, number, number] = [0, fmDirY, 0];

  return (
    <group>
      {/* 1. ESTELA DE TRAYECTORIA LUMINOSA Y SUAVE (FIGURA D) */}
      {/* 1. GUÍA COMPLETA PREVIA DE LA TRAYECTORIA FÍSICA (Referencia tenue continua) */}
      {fullTrajectoryPoints && fullTrajectoryPoints.length > 1 && (
        <Line
          points={fullTrajectoryPoints}
          color={isCollided ? '#ef4444' : '#10b981'}
          lineWidth={1.8}
          transparent
          opacity={0.25}
        />
      )}

      {/* 2. ESTELA DINÁMICA ACTIVA TRAZADA POR LA PARTÍCULA EN TIEMPO REAL */}
      {trailPoints.length > 1 && (
        <Line
          points={trailPoints}
          color={isCollided ? '#ef4444' : '#10b981'}
          lineWidth={3.0}
          lineWidth={3.2}
          transparent
          opacity={0.92}
          opacity={0.95}
        />
      )}

      {/* 2. NÚCLEO DE LA PARTÍCULA */}
      <group position={position}>
        {/* Esfera central con resplandor emisivo */}
        <mesh>
          <sphereGeometry args={[isCollided ? 0.28 : 0.22, 32, 32]} />
          <meshStandardMaterial
            color={isCollided ? '#ef4444' : particleColor}
            emissive={isCollided ? '#ef4444' : particleColor}
            emissiveIntensity={isCollided ? 2.5 : 1.4}
            roughness={0.15}
            metalness={0.5}
          />
        </mesh>

        {/* Halo exterior de energía */}
        <mesh>
          <sphereGeometry args={[isCollided ? 0.36 : 0.28, 24, 24]} />
          <meshBasicMaterial
            color={isCollided ? '#f87171' : particleColor}
            transparent
            opacity={0.25}
          />
        </mesh>

        {/* Punto de luz emitido por la partícula */}
        <pointLight
          color={isCollided ? '#ef4444' : particleColor}
          intensity={isCollided ? 2.8 : 1.6}
          distance={5}
          decay={2}
        />

        {/* Símbolo de polaridad sobre la esfera */}
        <Text
          position={[0, 0, 0.26]}
          fontSize={0.22}
          color="#ffffff"
          fontWeight="bold"
        >
          {charge > 0 ? '+' : charge < 0 ? '−' : '0'}
        </Text>

        {/* ======================================================== */}
        {/* EFECTO DE COLISIÓN                                       */}
        {/* ======================================================== */}
        {isCollided && (
          <group>
            {/* Ondas de choque en el punto de contacto */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.45, 0.035, 16, 32]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
            </mesh>

            {/* Aviso de impacto sin tapar la escena */}
            <Html
              center
              position={[0, collisionPlate === 'top' ? -0.7 : 0.7, 0]}
              distanceFactor={12}
              zIndexRange={[100, 0]}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <div
                style={{
                  background: 'rgba(220, 38, 38, 0.92)',
                  border: '1px solid rgba(254, 202, 202, 0.4)',
                  color: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
                }}
              >
                💥 IMPACTO CON PLACA
              </div>
            </Html>
          </group>
        )}

        {/* ======================================================== */}
        {/* VECTORES DE FUERZA LIMPIOS SEGÚN FIGURA D (v, Fe, Fm)    */}
        {/* ======================================================== */}
        {!isCollided && showForces && (
          <>
            {/* Vector Velocidad v (Esmeralda) */}
            <ForceArrow direction={[1, 0, 0]} length={1.1} color="#10b981" />
            <Text
              position={[1.35, 0.12, 0]}
              fontSize={0.20}
              color="#34d399"
              fontWeight="bold"
              anchorX="center"
              anchorY="middle"
            >
              v
            </Text>

            {/* Vector Fuerza Eléctrica Fe (Ámbar) */}
            {Math.abs(Fe) > 1e-25 && (
              <>
                <ForceArrow direction={feDir} length={feVisualLen} color="#f59e0b" />
                <Text
                  position={[-0.22, feDirY * (feVisualLen + 0.18), 0]}
                  fontSize={0.18}
                  color="#fbbf24"
                  fontWeight="bold"
                  anchorX="center"
                  anchorY="middle"
                >
                  Fe
                </Text>
              </>
            )}

            {/* Vector Fuerza Magnética Fm (Violeta) */}
            {Math.abs(Fm) > 1e-25 && (
              <>
                <ForceArrow direction={fmDir} length={fmVisualLen} color="#a855f7" />
                <Text
                  position={[0.22, fmDirY * (fmVisualLen + 0.18), 0]}
                  fontSize={0.18}
                  color="#c084fc"
                  fontWeight="bold"
                  anchorX="center"
                  anchorY="middle"
                >
                  Fm
                </Text>
              </>
            )}
          </>
        )}
      </group>
    </group>
  );
});

Particle.displayName = 'Particle';
