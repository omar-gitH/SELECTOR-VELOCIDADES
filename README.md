# ⚡ Simulador: Selector de Velocidades Electromagnético

Un simulador web interactivo diseñado para visualizar y analizar el comportamiento de partículas cargadas al atravesar campos eléctricos y magnéticos cruzados. Este proyecto permite experimentar en tiempo real con las variables físicas que determinan si una partícula se desvía o logra atravesar la región en línea recta.

Proyecto desarrollado para la carrera de Ingeniería en Sistemas de Información en la **Universidad Tecnológica Nacional - Facultad Regional La Plata (UTN FRLP)**.

---

## 🎯 ¿Qué es un Selector de Velocidades?

En física, un selector de velocidades es un dispositivo que aprovecha la fuerza de Lorentz para filtrar partículas subatómicas según su velocidad, independientemente de su masa o carga. 

La partícula solo logrará cruzar la región sin desviarse si la fuerza eléctrica y la fuerza magnética se anulan entre sí. Esta condición de equilibrio se da únicamente cuando la velocidad de la partícula es exactamente igual a la razón entre la magnitud del campo eléctrico y el campo magnético:

$$v = \frac{E}{B}$$

La fuerza total que actúa sobre la partícula está dada por la ecuación de Lorentz:

$$\vec{F} = q(\vec{E} + \vec{v} \times \vec{B})$$

---

## 🚀 Características Interactivas

*   **Manipulación en tiempo real:** Ajusta los valores de la carga ($q$), masa ($m$), velocidad inicial ($v_x$), campo eléctrico ($E_y$) y campo magnético ($B_z$) mediante controles interactivos.
*   **Visualización dinámica:** Observa cómo se traza la trayectoria cartesiana de la partícula al instante de modificar cualquier variable.
*   **Renderizado matemático:** Las fórmulas y la velocidad ideal se recalculan y muestran dinámicamente en pantalla con formato académico usando KaTeX.

---

## 🛠️ Arquitectura y Tecnologías

Este proyecto está construido bajo un enfoque Full-Stack, separando el cálculo numérico intensivo de la visualización interactiva:

*   **Motor Físico (Backend):** Desarrollado en **Python** utilizando **FastAPI**. Implementa integración numérica a través de **NumPy** y **SciPy** para calcular las matrices de trayectoria de forma eficiente.
*   **Interfaz Gráfica (Frontend):** Construida con **React** y **TypeScript**, empaquetada con **Vite**. Se utilizan librerías de renderizado matemático y gráficos interactivos para una experiencia de usuario fluida.

---

## 👥 Integrantes del Equipo

*   Galarza, Juan Pablo
*   Milillo, Juan
*   Paillacar, Mateo
*   Pizarro, Gabriel

---

## ⚙️ Instalación y Ejecución Local

### Prerrequisitos
*   Node.js (v18 o superior)
*   Python (3.10 o superior)

### Levantar el Backend (Motor Físico)
1. Navega a la carpeta `/backend`.
2. Crea un entorno virtual e instala las dependencias: `pip install -r requirements.txt`
3. Inicia el servidor FastAPI: `uvicorn main:app --reload`

### Levantar el Frontend (Interfaz)
1. Navega a la carpeta `/frontend`.
2. Instala las dependencias: `npm install` (o `pnpm install`).
3. Inicia el entorno de desarrollo: `npm run dev`