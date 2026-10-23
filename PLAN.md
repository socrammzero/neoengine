# Plan Maestro de Ingeniería: Plataforma Web Interactiva de Estudio e Investigación

Este documento detalla la arquitectura técnica, organizativa y de diseño para construir un entorno de estudio alojado en GitHub Pages. El objetivo es que un conjunto de documentos HTML estáticos y archivos de código fuente funcionen y se perciban como una **Aplicación Web Progresiva (PWA)** moderna (estilo *LeetCode*, *Notion* o *Linear*), permitiendo la ejecución real de código en el navegador y manteniendo un **anonimato institucional y personal absoluto**.

---

## 1. Principios de Privacidad, Neutralidad y Anonimato

Para garantizar que el repositorio sea 100% neutro, seguro y libre de referencias institucionales o personales, todo el proyecto se regirá por el siguiente protocolo de nomenclatura:

1. **Nomenclatura Académica Estándar:** Las asignaturas se nombrarán exclusivamente por su área de conocimiento universal (ej. *Sistemas Operativos*, *Redes de Computadores*, *Ingeniería del Software*), evitando códigos internos de matriculación o acrónimos locales.
2. **Abstracción de Autoría:** Queda descartado el uso de nombres propios, referencias a docentes, departamentos o facultades. Todo el material se documentará bajo el concepto de *"Notas Técnicas"*, *"Documentación del Módulo"* o *"Especificaciones de Laboratorio"*.
3. **Vocabulario Neutro:** Se reemplaza cualquier término que sugiera validez administrativa por términos técnicos:
   * En lugar de hablar de documentos de la institución $\rightarrow$ **Guía de Estudio / Documentación Base**.
   * En lugar de pruebas pasadas $\rightarrow$ **Banco de Validación / Simulador de Evaluación**.
4. **Limpieza de Metadatos (Git Hook):** Se implementará un *pre-commit hook* local que escanee archivos antes de subirlos a GitHub para asegurar que no existan cadenas de texto restringidas ni metadatos de autor en documentos o cabeceras de código.

---

## 2. Arquitectura Visual y Experiencia de "Aplicación Real" (UI/UX)

Para que un sitio basado en múltiples archivos HTML parezca una aplicación de escritorio fluida y profesional, aplicaremos las siguientes tecnologías sin necesidad de un servidor backend:

* **Diseño de Interfaz (UI):** Uso de **Tailwind CSS** con una paleta de colores oscura por defecto (*Dark Mode* estilo IDE moderno como VS Code o Cursor) y modo claro conmutable.
* **Transiciones Nativas entre HTMLs:** Implementación de la **View Transitions API** (`@view-transition { navigation: auto; }`). Esto elimina el parpadeo en blanco al navegar de un archivo `.html` a otro, logrando una transición suave idéntica a una Single Page Application (SPA).
* **Layout Persistente (App Shell):**
  * **Sidebar Izquierdo Colapsable:** Selector rápido de Año (1º a 4º) $\rightarrow$ Semestre (S1 / S2) $\rightarrow$ Asignatura (1 a 5) $\rightarrow$ Módulos (Teoría, Laboratorio de Ejercicios, Simulador Test).
  * **Barra de Comandos (`Ctrl + K`):** Buscador global instantáneo alimentado por un archivo `search-index.json` que permite saltar a cualquier tema, ejercicio o script de código desde cualquier pantalla.
* **Persistencia de Datos Local (`IndexedDB` / `localStorage`):** Guardado automático de temas leídos, ejercicios resueltos con éxito, código editado por el usuario y estadísticas históricas de los exámenes tipo test.
* **Renderizado Técnico:** Integración de **KaTeX** para fórmulas matemáticas instantáneas y **Mermaid.js** para diagramas de arquitectura, grafos y máquinas de estados.

---

## 3. Protocolo de Creación de Vistas: Skill `html-maker`

Para la producción, maquetación y estandarización de cada página web del repositorio (vistas de tema, páginas de ejercicios, simulador de test y paneles de control), se utilizará de forma obligatoria la **skill `html-maker`**.

### 3.1. Directrices de la Skill `html-maker` en el Proyecto

Cualquier HTML generado bajo este estándar debe cumplir con las siguientes reglas de calidad:

1. **Autonomía y Resiliencia Estructural:**
   * Cada archivo HTML debe ser estructuralmente completo y válido (`<!DOCTYPE html>`, metaetiquetas UTF-8, viewport responsive y accesibilidad WCAG AA).
   * Carga declarativa de recursos CDN críticos (Tailwind, Lucide Icons, KaTeX, Prism/Monaco) asegurando que no dependa de un pipeline de compilación Node.js local para ejecutarse.

2. **Fidelidad Visual Profesional (Zero-Toy UI):**
   * El código HTML generado por `html-maker` prohíbe interfaces genéricas o básicas. Aplica contrastes calculados (`slate-900`, `zinc-950`), microinteracciones con transiciones suaves (`duration-200 ease-in-out`), estados activos/hover bien diferenciados y tipografía técnica (`Inter` / `JetBrains Mono`).

3. **Sin Placeholders ni Código Truncado:**
   * La skill `html-maker` genera la estructura interactiva completa. En las ristras de ejercicios o bancos de preguntas no se dejan etiquetas de tipo `"<!-- Añadir el resto aquí -->"`; los componentes se generan con la lógica y la arquitectura funcional lista para recibir o renderizar las colecciones de datos.

4. **Integración con el App Shell y el Motor de Ejecución:**
   * Todo HTML generado mediante la skill incorpora los hooks y atributos de datos necesarios (`data-src`, `data-test-id`, `data-subject-id`) para comunicarse automáticamente con `core-shell.js` y `code-runner.js`.

---

## 4. Estructura del Repositorio (Foco: 3er Año, 1er Semestre)

La arquitectura de carpetas separa limpiamente la interfaz global, las vistas HTML construidas con `html-maker` y los **archivos de código fuente reales y ejecutables**:

```
study-platform-repo/
│
├── index.html                          # Dashboard principal (generado con html-maker)
├── manifest.json                       # Configuración PWA (instalable como app en escritorio/móvil)
│
├── assets/                             # Recursos globales de la aplicación
│   ├── css/
│   │   └── app.css                     # Estilos globales, variables de tema y View Transitions
│   └── js/
│       ├── core-shell.js               # Inyecta el Sidebar, Navbar y Buscador (Ctrl+K) en cada HTML
│       ├── code-runner.js              # Motor de carga (fetch) y ejecución real de código (Wasm/API)
│       ├── exercise-engine.js          # Validador de ejercicios interactivos y casos de prueba
│       ├── exam-engine.js              # Motor del simulador tipo test, temporizador y analíticas
│       └── storage.js                  # Gestión de progreso del usuario en localStorage
│
├── data/
│   └── curriculum.json                 # Mapa completo: 4 Años -> 2 Semestres -> 5 Asignaturas
│
└── cursos/                             # Directorio raíz de los 4 años
    ├── anio-1/
    │   ├── semestre-1/                 # (Estructura lista para expansión)
    │   └── semestre-2/
    ├── anio-2/
    │   ├── semestre-1/
    │   └── semestre-2/
    │
    ├── anio-3/                         # <--- FOCO INICIAL DE DESARROLLO
    │   ├── semestre-1/
    │   │   ├── asignatura-01/          # Nombre genérico de la materia
    │   │   │   ├── index.html          # Panel de la asignatura (vía html-maker)
    │   │   │   ├── teoria/
    │   │   │   │   ├── tema-01.html    # Teoría interactiva con sandboxes ejecutables (html-maker)
    │   │   │   │   ├── tema-02.html
    │   │   │   │   └── ...
    │   │   │   ├── ejercicios/
    │   │   │   │   ├── practica-tema-01.html  # Ristra extensa de ejercicios interactivos (html-maker)
    │   │   │   │   ├── practica-tema-02.html
    │   │   │   │   └── ...
    │   │   │   ├── evaluacion/
    │   │   │   │   ├── examen-test.html       # Simulador de examen tipo test extenso (html-maker)
    │   │   │   │   └── banco-preguntas.json   # Banco extenso de preguntas y soluciones
    │   │   │   └── src-code/                  # ARCHIVOS DE CÓDIGO REALES Y FUNCIONALES
    │   │   │       ├── tema-01/
    │   │   │       │   ├── algoritmo_base.py
    │   │   │       │   ├── concurrencia.c
    │   │   │       │   └── test_suite.py
    │   │   │       └── tema-02/
    │   │   │           └── servidor_socket.java
    │   │   │
    │   │   ├── asignatura-02/
    │   │   ├── asignatura-03/
    │   │   ├── asignatura-04/
    │   │   └── asignatura-05/
    │   │
    │   └── semestre-2/
    │
    └── anio-4/
        ├── semestre-1/
        └── semestre-2/
```

---

## 5. Motor de Ejecución de Código Real en el Navegador

Uno de los pilares del proyecto es que **los archivos de código estén físicamente en el repositorio, funcionen por sí mismos, y los HTML los llamen y ejecuten de verdad**, sin simulaciones preescritas.

### 5.1. Vinculación del Archivo Real con el HTML de `html-maker`

En lugar de pegar código duplicado dentro de las vistas:
1. El contenedor maquetado en el HTML incluye el atributo de origen:
   ```html
   <div class="code-execution-box" data-src="../src-code/tema-01/algoritmo_base.py" data-lang="python"></div>
   ```
2. Al cargar la página, `code-runner.js` solicita el archivo fuente real mediante `fetch()`.
3. El código real se renderiza dentro de un editor de código embebido (**Monaco Editor**), permitiendo leerlo, modificarlo o ejecutarlo en vivo.

### 5.2. Métodos de Ejecución según el Lenguaje

| Lenguaje | Tecnología de Ejecución Real | Funcionamiento Técnico |
| :--- | :--- | :--- |
| **Python** | **Pyodide (WebAssembly)** | Ejecuta el intérprete CPython oficial dentro de un *Web Worker*. Soporta librerías científicas (`numpy`, `pandas`, `matplotlib`). Cero latencia y 100% en el cliente. |
| **JavaScript / TypeScript** | **Web Workers / Sandboxed Context** | Ejecución nativa asíncrona aislando el contexto global y capturando la consola en el panel de salida del HTML. |
| **SQL** | **SQL.js (SQLite en Wasm)** | Carga archivos `.sqlite` o scripts `.sql` del repositorio en memoria, renderizando tablas de resultados reales. |
| **C, C++, Java, Rust, Go, Bash** | **Piston Execution API / Clang-Wasm** | Envía el contenido del archivo `.c`, `.cpp` o `.java` al servicio de compilación en sandbox, devolviendo `stdout`, `stderr` y tiempo de ejecución real. |

---

## 6. Módulos Estandarizados Generados con `html-maker`

Cada una de las 5 asignaturas del 3er Año (1er Semestre) dispondrá de las siguientes vistas creadas bajo el estándar `html-maker`:

### A. Vista Teórica Interactiva (`teoria/tema-X.html`)
* **Layout:** Tres columnas con barra lateral de árbol de temas, área central con tipografía técnica de alta legibilidad e índice flotante a la derecha.
* **Componentes:** Integración de bloques ejecutables de código real vinculados a `/src-code/`, fórmulas matemáticas procesadas con KaTeX y diagramas técnicos con Mermaid.

### B. Ristra Extensa de Ejercicios Interactivos (`ejercicios/practica-tema-X.html`)
* **Diseño:** Lista vertical continua y modular de ejercicios con barra superior de filtros (*Dificultad, Estado de completitud, Tipo de ejercicio*).
* **Tipologías Implementadas:**
  1. *Programación con Test Runner:* Carga un script base de `/src-code/`, editor integrado y validación contra casos de prueba (`assert`) con salida visual de tests aprobados/fallados.
  2. *Cálculo y Razonamiento Lógico:* Validación inmediata de entradas numéricas o textuales con pistas progresivas y resolución paso a paso.
  3. *Trazas de Código y Completado:* Desafíos técnicos de predicción de salida o corrección de bugs en scripts reales.

### C. Simulador de Examen Tipo Test (`evaluacion/examen-test.html`)
* **Doble Modalidad:**
  * *Modo Práctica:* Retroalimentación inmediata con justificación técnica detallada en cada opción.
  * *Modo Examen:* Cronómetro activo, barajado aleatorio de preguntas desde el banco extenso y reporte final de calificación.
* **Cálculo de Calificación con Penalización:**

  $$
  \text{Calificación} = \max\left(0, \left(A - \frac{E}{k - 1}\right) \times \frac{10}{N}\right)
  $$

  *(Donde $A$ = Aciertos, $E$ = Errores, $k$ = Opciones por pregunta, $N$ = Preguntas totales).*

---

## 7. Plan de Ejecución Iterativo

### Fase 1: Núcleo y Arquitectura Base
* Configuración del repositorio en GitHub Pages y estructura de directorios neutral.
* Creación del `curriculum.json` con la definición de los 4 años y semestres.
* Implementación de los módulos JavaScript compartidos (`core-shell.js`, `code-runner.js`, `storage.js`).

### Fase 2: Construcción de Plantillas Maestras con `html-maker`
* Generación de la plantilla de **Tema Teórico** con sandboxes de código.
* Generación de la plantilla de **Ristra de Ejercicios** con validador integrado.
* Generación de la plantilla del **Simulador Tipo Test** con motor de métricas y penalización.

### Fase 3: Despliegue del 3er Año - 1er Semestre
* Instanciación de las 5 asignaturas dentro de `cursos/anio-3/semestre-1/`.
* Creación de los archivos de código funcional en `src-code/`.
* Aplicación de `html-maker` para redactar y ensamblar los temas, ejercicios y bancos de preguntas de las 5 materias iniciales.