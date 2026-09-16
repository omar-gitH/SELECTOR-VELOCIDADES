# Guía de Implementación: Selector de Velocidades (Filtro de Wien)

Esta guía documenta los requisitos físicos y funcionales del simulador del Selector de Velocidades (Filtro de Wien) para el seguimiento del desarrollo y verificación de características.

## 1. Fundamentos Físicos

El selector de velocidades (Filtro de Wien) es un dispositivo que utiliza campos eléctricos ($\vec{E}$) y magnéticos ($\vec{B}$) perpendiculares entre sí y transversales al movimiento de las partículas cargadas para actuar como un "filtro" que permite el paso exclusivo de partículas con una velocidad específica.

### 1.1. Ecuación de Lorentz
La fuerza electromagnética total sobre una carga puntual $q$ está dada por:
$$ \vec{F} = \vec{F}_e + \vec{F}_m = q\vec{E} + q(\vec{v} \times \vec{B}) $$

### 1.2. Condición de Equilibrio (No desviación)
Para que la partícula no se desvíe, la fuerza eléctrica debe equilibrar exactamente a la fuerza magnética ($\vec{F} = 0$):
$$ q\vec{E} + q(\vec{v} \times \vec{B}) = 0 $$
$$ |\vec{F}_e| = |\vec{F}_m| \implies qE = qvB \implies v = \frac{E}{B} $$

> [!IMPORTANT]
> **Independencia:** El selector filtra **solo por velocidad** ($v = E/B$), independientemente de la masa ($m$) o la carga ($q$) de la partícula, siempre que $q \neq 0$.

## 2. Requerimientos Funcionales y Estado de Implementación

### 2.1. Interfaz de Usuario y Estética
- [x] **Tema "Cyber-Lab Obsidian"**: Interfaz moderna con tonos oscuros y neones, tipografía monoespaciada e interfaces de panel de cristal (Glassmorphism).
- [x] **Panel de Control Ajustado**: Parámetros bien distribuidos utilizando CSS Grid para aprovechar el espacio, sin excesos de blanco.
- [x] **Compatibilidad Móvil**: Controles desplazables a un panel emergente (Bottom Sheet) para uso fluido en dispositivos móviles.
- [x] **HUD Telemétrico**: Información en tiempo real mostrada en el panel del simulador, integrado sobre el espacio 3D.
- [x] **Visualización de Fórmulas Matemáticas**: Renderizado matemático robusto utilizando KaTeX y mostrado condicionalmente a petición del usuario.

### 2.2. Simulación Física
- [x] **Campos Parametrizables**: Capacidad de ajustar $E_y$ (V/m) y $B_z$ (T).
- [x] **Partículas Interactivas**: Soporte para alterar propiedades base ($q, m, v_x$).
- [x] **Selector de Presets**: Posibilidad de elegir partículas predefinidas (Electrón, Protón, Partícula Alfa, Iones Positivos/Negativos).
- [x] **Medidor de Equilibrio (Tira y Afloja)**: Representación visual del diferencial entre la fuerza magnética $F_m$ y eléctrica $F_e$ en el estado actual.
- [x] **Representación de Vectores**: Mostrar/ocultar los campos magnéticos y eléctricos interactivos.
- [x] **Sensibilidad de Curvatura (Auto-calibración)**: Botón para ajustar la velocidad inicial $v_x$ directamente al valor de $E/B$ para observar un haz recto.

### 2.3. Código y Arquitectura
- [x] **Ciclo de renderizado React/Three.js**: Lógica del estado separada del ciclo de físicas para evitar cuellos de botella de renderizado (`useEffect` limpios, dependencias optimizadas).
- [x] **Tipos Estrictos**: Extracción de interfaces (`ParticleType`, constantes) para solucionar problemas con HMR / Fast Refresh.

## 3. Próximos Pasos Recomendados (Backlog)

- [ ] **Soporte Offline PWA**: Configurar manifest y service workers para que el simulador funcione sin conexión en entornos educativos.
- [ ] **Múltiples Partículas**: Emitir un haz denso en lugar de un trazo único.
- [ ] **Gráficos Avanzados**: Exportación de gráficas estáticas o integración de análisis estocásticos.
- [ ] **Modo "Juego/Reto"**: Hacer que el usuario adivine los campos requeridos para hacer pasar una partícula desconocida.
