import { type FC, useMemo, memo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface SelectorStructureProps {
  E_y?: number;
  B_z?: number;
  showEField?: boolean;
  showBField?: boolean;
}

// Subcomponente de Vector Lineal del Campo Magnético (Eje Z ortogonal)
const BFieldVector: FC<{
  x: number;
  y: number;
  Bz: number;
}> = memo(({ x, y, Bz }) => {
  const isIntoScreen = Bz >= 0; // Bz > 0 -> hacia adentro (-Z, ⊗)
  const dirZ = isIntoScreen ? -1 : 1;
  const coneZ = dirZ * 1.62;
  const coneRotX = isIntoScreen ? -Math.PI / 2 : Math.PI / 2;

  return (
    <group position={[x, y, 0]}>
      {/* 1. Línea / Rayo cilíndrico continuo a lo largo del eje Z con núcleo luminoso */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 3.2, 12]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#0891b2"
          emissiveIntensity={0.55}
          metalness={0.5}
          roughness={0.18}
          transparent
          opacity={0.52}
        />
      </mesh>

      {/* 2. Flecha cónica direccional en el extremo con brillo metálico */}
      <mesh position={[0, 0, coneZ]} rotation={[coneRotX, 0, 0]}>
        <coneGeometry args={[0.065, 0.20, 16]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#06b6d4"
          emissiveIntensity={0.95}
          metalness={0.65}
          roughness={0.15}
        />
      </mesh>

      {/* 3. Glifo 2D/3D (⊗ o ⊙) en el plano frontal visible en vista ortogonal */}
      <group position={[0, 0, 1.64]}>
        {/* Anillo exterior con resplandor cian */}
        <mesh>
          <ringGeometry args={[0.09, 0.115, 24]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>

        {isIntoScreen ? (
          /* Cruz ⊗ */
          <>
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.018, 0.165, 0.002]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} />
            </mesh>
            <mesh rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.018, 0.165, 0.002]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} />
            </mesh>
          </>
        ) : (
          /* Punto central ⊙ */
          <mesh>
            <circleGeometry args={[0.038, 20]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    </group>
  );
});

BFieldVector.displayName = 'BFieldVector';

export const SelectorStructure: FC<SelectorStructureProps> = memo(({
  E_y = 20,
  B_z = 2,
  showEField = true,
  showBField = true,
}) => {
  // Dirección del campo eléctrico: si E_y > 0, apunta hacia abajo (+ superior a - inferior)
  const isEDown = E_y >= 0;

  // Matriz ortogonal de vectores del campo magnético uniforme B a lo largo de Z
  const bGridPositions = useMemo(() => {
    const xCols = [-4.0, -2.0, 0, 2.0, 4.0];
    const yRows = [-1.3, 0, 1.3];
    const positions: [number, number][] = [];
    for (const x of xCols) {
      for (const y of yRows) {
        positions.push([x, y]);
      }
    }
    return positions;
  }, []);

  // Posiciones para las flechas discretas del campo eléctrico
  const eXPositions = useMemo(() => [-4.0, -2.0, 0, 2.0, 4.0], []);

  return (
    <group>
      {/* ======================================================== */}
      {/* 1. CÁMARA DE VACÍO CILÍNDRICA (Tubo de cuarzo de alta transparencia con reflejos especulares de cristal) */}
      {/* ======================================================== */}
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
          <cylinderGeometry args={[2.85, 2.85, 12.0, 48, 1, true]} />
          <meshPhysicalMaterial
            color="#e0f2fe"
            transparent
            opacity={0.18}
            roughness={0.05}
            metalness={0.05}
            transmission={0.93}
            ior={1.48}
            reflectivity={0.80}
            clearcoat={1.0}
            clearcoatRoughness={0.06}
            thickness={0.2}
            attenuationColor="#38bdf8"
            attenuationDistance={2.5}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Abrazaderas estructurales de soporte (titanio) para dar corporeidad tangible sin tapar */}
        {[-3.5, 3.5].map((xPos) => (
          <mesh key={`collar-${xPos}`} rotation={[0, Math.PI / 2, 0]} position={[xPos, 0, 0]}>
            <torusGeometry args={[2.86, 0.018, 16, 48]} />
            <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.18} />
          </mesh>
        ))}

        {/* Bridas metálicas de sellado en los extremos (aluminio mecanizado) */}
        {[-5.96, 5.96].map((xPos) => (
          <mesh key={`flange-${xPos}`} rotation={[0, 0, Math.PI / 2]} position={[xPos, 0, 0]}>
            <cylinderGeometry args={[2.87, 2.87, 0.10, 48, 1, true]} />
            <meshStandardMaterial color="#64748b" metalness={0.90} roughness={0.18} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>

      {/* ======================================================== */}
      {/* 2. CAMPO MAGNÉTICO UNIFORME LINEAL (EJE Z ORTOGONAL)       */}
      {/* ======================================================== */}
      {showBField && Math.abs(B_z) > 0.001 && (
        <group>
          {/* Matriz de vectores lineales uniformes a lo largo de Z */}
          {bGridPositions.map(([x, y]) => (
            <BFieldVector key={`bfield-${x}-${y}`} x={x} y={y} Bz={B_z} />
          ))}

          {/* Rótulo del Campo Magnético flotante en la zona superior libre */}
          <Text
            position={[0, 3.55, 0]}
            fontSize={0.25}
            color="#06b6d4"
            fontWeight="bold"
            letterSpacing={0.06}
            anchorX="center"
            anchorY="middle"
            renderOrder={5}
          >
            {`CAMPO MAGNÉTICO UNIFORME B = ${Math.abs(B_z)} T (${B_z >= 0 ? '⊗ Hacia adentro [−Z]' : '⊙ Hacia afuera [+Z]'})`}
          </Text>
        </group>
      )}

      {/* Rejilla de referencia en la base del túnel */}
      <gridHelper
        args={[14, 14, '#38bdf8', '#334155']}
        position={[0, -3.1, 0]}
        rotation={[0, 0, 0]}
      />

      {/* ======================================================== */}
      {/* 3. CAÑÓN EMISOR (EXTREMO IZQUIERDO)                      */}
      {/* ======================================================== */}
      <group position={[-6.0, 0, 0]}>
        {/* Anillo exterior del cañón */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[0.5, 2.85, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.90} roughness={0.20} side={THREE.DoubleSide} />
        </mesh>
        {/* Tobera luminosa de emisión de partículas */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[0.35, 0.5, 24]} />
          <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.3, 0, 0]}>
          <cylinderGeometry args={[0.48, 0.48, 0.6, 24]} />
          <meshStandardMaterial color="#475569" metalness={0.92} roughness={0.18} />
        </mesh>

        {/* Rótulo superior sobre la tobera del cañón (sin oclusión) */}
        <Text
          position={[0, 3.20, 0.25]}
          fontSize={0.28}
          color="#34d399"
          fontWeight="bold"
          letterSpacing={0.06}
          anchorX="center"
          anchorY="middle"
          renderOrder={10}
        >
          CAÑÓN EMISOR
        </Text>
      </group>

      {/* ======================================================== */}
      {/* 4. RENDIJA SELECTORA (EXTREMO DERECHO)                   */}
      {/* ======================================================== */}
      <group position={[6.0, 0, 0]}>
        {/* Anillo exterior de la rendija */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[0.5, 2.85, 32]} />
          <meshStandardMaterial color="#334155" metalness={0.90} roughness={0.20} side={THREE.DoubleSide} />
        </mesh>
        {/* Abertura selectora */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[0.35, 0.5, 24]} />
          <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
        </mesh>

        {/* Rótulo superior sobre la rendija selectora (sin oclusión) */}
        <Text
          position={[0, 3.20, 0.25]}
          fontSize={0.28}
          color="#38bdf8"
          fontWeight="bold"
          letterSpacing={0.06}
          anchorX="center"
          anchorY="middle"
          renderOrder={10}
        >
          RENDIJA SELECTORA
        </Text>
      </group>

      {/* ======================================================== */}
      {/* 5. PLACA CONDENSADORA SUPERIOR (+)                        */}
      {/* ======================================================== */}
      <group position={[0, 2.4, 0]}>
        {/* Cuerpo de la placa en aluminio anodizado carmesí con barniz reflectante */}
        <mesh>
          <boxGeometry args={[11.2, 0.22, 2.6]} />
          <meshPhysicalMaterial
            color="#991b1b"
            emissive="#ef4444"
            emissiveIntensity={0.16}
            metalness={0.78}
            roughness={0.22}
            clearcoat={0.8}
            clearcoatRoughness={0.14}
            reflectivity={0.85}
          />
        </mesh>

        {/* Terminales de alta tensión (bornes cilíndricos de latón pulido con cabezal esférico) */}
        {[-3.5, 3.5].map((xPos) => (
          <group key={`term-top-${xPos}`} position={[xPos, 0.18, 0]}>
            <mesh>
              <cylinderGeometry args={[0.10, 0.12, 0.16, 16]} />
              <meshStandardMaterial color="#f59e0b" metalness={0.92} roughness={0.18} />
            </mesh>
            <mesh position={[0, 0.10, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.95} roughness={0.12} />
            </mesh>
          </group>
        ))}

        {/* Borde biselado interior con resplandor neón carmesí */}
        <mesh position={[0, -0.11, 0]}>
          <boxGeometry args={[11.16, 0.02, 2.56]} />
          <meshBasicMaterial color="#f87171" transparent opacity={0.75} />
        </mesh>

        {/* Rótulo frontal montado directamente sobre el canto de la placa roja */}
        <Text
          position={[0, 0, 1.34]}
          fontSize={0.22}
          color="#ffffff"
          fontWeight="bold"
          letterSpacing={0.05}
          anchorX="center"
          anchorY="middle"
          renderOrder={5}
        >
          PLACA POSITIVA (ÁNODO +)
        </Text>
      </group>

      {/* ======================================================== */}
      {/* 6. PLACA CONDENSADORA INFERIOR (−)                        */}
      {/* ======================================================== */}
      <group position={[0, -2.4, 0]}>
        {/* Cuerpo de la placa en aluminio anodizado azul cobalto */}
        <mesh>
          <boxGeometry args={[11.2, 0.22, 2.6]} />
          <meshPhysicalMaterial
            color="#1e40af"
            emissive="#3b82f6"
            emissiveIntensity={0.16}
            metalness={0.78}
            roughness={0.22}
            clearcoat={0.8}
            clearcoatRoughness={0.14}
            reflectivity={0.85}
          />
        </mesh>

        {/* Terminales de masa / tierra (bornes cilíndricos de cromo pulido) */}
        {[-3.5, 3.5].map((xPos) => (
          <group key={`term-bot-${xPos}`} position={[xPos, -0.18, 0]}>
            <mesh>
              <cylinderGeometry args={[0.10, 0.12, 0.16, 16]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.92} roughness={0.18} />
            </mesh>
            <mesh position={[0, -0.10, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
            </mesh>
          </group>
        ))}

        {/* Borde biselado interior con resplandor zafiro */}
        <mesh position={[0, 0.11, 0]}>
          <boxGeometry args={[11.16, 0.02, 2.56]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.75} />
        </mesh>

        {/* Rótulo frontal montado directamente sobre el canto de la placa azul */}
        <Text
          position={[0, 0, 1.34]}
          fontSize={0.22}
          color="#ffffff"
          fontWeight="bold"
          letterSpacing={0.05}
          anchorX="center"
          anchorY="middle"
          renderOrder={5}
        >
          PLACA NEGATIVA (CÁTODO −)
        </Text>
      </group>

      {/* ======================================================== */}
      {/* 7. LÍNEAS DE CAMPO ELÉCTRICO FLOTANTES (E)                */}
      {/* ======================================================== */}
      {showEField && Math.abs(E_y) > 0.001 && (
        <group>
          {eXPositions.map((x) => (
            <group key={`efield-${x}`} position={[x, 0, 0]}>
              {/* Rayo de luz láser dorado/ámbar */}
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.016, 0.016, 3.8, 12]} />
                <meshStandardMaterial
                  color="#fbbf24"
                  emissive="#f59e0b"
                  emissiveIntensity={0.55}
                  metalness={0.5}
                  roughness={0.16}
                  transparent
                  opacity={0.6}
                />
              </mesh>
              {/* Flecha direccional cónica con brillo especular */}
              <mesh
                position={[0, isEDown ? -1.85 : 1.85, 0]}
                rotation={[isEDown ? Math.PI : 0, 0, 0]}
              >
                <coneGeometry args={[0.075, 0.24, 16]} />
                <meshStandardMaterial
                  color="#f59e0b"
                  emissive="#d97706"
                  emissiveIntensity={0.85}
                  metalness={0.65}
                  roughness={0.15}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* ======================================================== */}
      {/* 8. EJE ÓPTICO CENTRAL (Trayectoria recta ideal v = E/B)   */}
      {/* ======================================================== */}
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(geom) => {
            const points = [
              new THREE.Vector3(-6.2, 0, 0),
              new THREE.Vector3(6.2, 0, 0),
            ];
            geom.setFromPoints(points);
          }}
        />
        <lineDashedMaterial
          attach="material"
          color="#38bdf8"
          dashSize={0.25}
          gapSize={0.15}
          transparent
          opacity={0.55}
        />
      </line>
    </group>
  );
});

SelectorStructure.displayName = 'SelectorStructure';
