# Engineering Workbench — Plataforma Web Interactiva de Estudio e Investigación

Entorno técnico autónomo de estudio, laboratorio de programación y simulación de evaluación construido bajo arquitectura **Progressive Web App (PWA)** estática para **GitHub Pages**, siguiendo el protocolo de diseño **`html-maker`**, las reglas críticas de **`INFO.md`** y principios estrictos de privacidad, neutralidad y anonimato.

---

## 1. Arquitectura Técnica y Características Clave

- **App Shell Persistente y Cierre Hermético (`html-maker`):**
  - Barra lateral izquierda colapsable al 100% con botón de control (`☰`) en la esquina superior izquierda, selector de asignaturas y seguimiento automático de lectura mediante `IntersectionObserver` (*Scrollspy*).
  - Detección nativa del esquema de color del sistema operativo (`prefers-color-scheme: dark`) con conmutador manual persistente en `localStorage` y redibujado dinámico de gráficas SVG.
  - Transiciones suaves entre documentos multi-página mediante la **View Transitions API** (`@view-transition { navigation: auto; }`).
- **Buscador Global Instantáneo (`Ctrl + K`):**
  - Paleta de comandos alimentada por `data/search-index.json` para saltar en milisegundos a cualquiera de los 7 temas, hojas de problemas, simulador de examen o archivos de código C11 POSIX / Java.
- **Motor de Ejecución de Código Real y Auditor `INFO.md` (`assets/js/code-runner.js`):**
  - Los contenedores `.code-execution-box` cargan mediante `fetch()` los archivos físicos alojados en `src-code/`, permitiendo su edición en vivo y verificando automáticamente las directivas de `INFO.md` (prohibición de `volatile`, prohibición de `pthread_mutex_lock` en favor de `sem_t mutex`, paso obligatorio de `&ids[i]` y control de errores en `pthread_create` y `pthread_join`).
- **Simulador de Evaluación Tipo Test (`assets/js/exam-engine.js`):**
  - Doble modalidad (*Modo Práctica* con justificación inmediata y *Modo Examen* con cronómetro y barajado aleatorio desde `banco-preguntas.json`) aplicando la fórmula de penalización:
    $$\text{Calificación} = \max\left(0, \left(A - \frac{E}{k - 1}\right) \times \frac{10}{N}\right)$$

---

## 2. Estructura del Repositorio (Foco: Programación Concurrente)

```text
.
├── index.html                          # Dashboard principal
├── manifest.json                       # Manifiesto PWA instalable
├── sw.js                               # Service Worker para caché offline
├── assets/
│   ├── css/app.css                     # Sistema de diseño html-maker + View Transitions
│   └── js/
│       ├── storage.js                  # Persistencia local híbrida (localStorage + IndexedDB)
│       ├── core-shell.js               # Sidebar hermético, Scrollspy, Tema, Ctrl+K y SVG Charts
│       ├── code-runner.js              # Carga fetch(), ejecución C/POSIX/Java y Auditor INFO.md
│       ├── exercise-engine.js          # Motor de hojas de problemas y filtros dinámicos
│       └── exam-engine.js              # Motor de exámenes tipo test y analíticas
├── data/
│   ├── curriculum.json                 # Mapa curricular real
│   └── search-index.json               # Índice de búsqueda global para Ctrl+K
├── templates/                          # Plantillas maestras generadas con html-maker
│   ├── plantilla-tema-teorico.html
│   ├── plantilla-ristra-ejercicios.html
│   └── plantilla-simulador-test.html
├── scripts/
│   └── audit-privacy.js                # Auditor pre-commit de privacidad, html-maker e INFO.md
└── cursos/
    └── anio-3/
        └── semestre-1/
            └── programacion-concurrente/
                ├── index.html
                ├── teoria/             # Temas 01 a 07 interactivos
                ├── ejercicios/         # Prácticas de los Temas 01 a 07
                ├── evaluacion/         # Simulador de Examen Final + banco-preguntas.json (21 Q)
                └── src-code/           # 11 programas C11 POSIX y Java reales y ejecutables
```
