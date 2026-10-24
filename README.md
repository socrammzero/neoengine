# NeoEngine — Ingeniería Electrónica de Telecomunicaciones

Plataforma interactiva de estudio, simulación en tiempo real y laboratorio de código para el Grado en **Ingeniería Electrónica de Telecomunicaciones**, diseñada como **Aplicación Web Progresiva (PWA)** instalable en cualquier dispositivo.

---

## 1. Características Principales de NeoEngine

- **Seguridad Criptográfica Integrada (RFC 6238 + HMAC-SHA256):**
  - Control de acceso mediante código dinámico de 6 dígitos que se renueva cada 30 segundos, calculado en el navegador mediante `crypto.subtle` nativo con ventana de tolerancia de ±1 paso (90 segundos).
  - Al autenticarse por primera vez, el dispositivo recibe un identificador único de terminal (`deviceId`) firmado mediante `HMAC-SHA256` con clave ofuscada por máscara XOR, recordando la autorización de forma permanente salvo borrado de caché o cierre de sesión manual (10 pulsaciones consecutivas sobre el logotipo de **NeoEngine**).
  - Verificación síncrona libre de parpadeo (*FOUC-Free*) y bloqueo temporal progresivo tras 5 intentos fallidos consecutivos.
- **Aplicación Web Instalable (PWA) y Auto-Redimensionado Universal:**
  - Instalable como aplicación nativa independiente en Windows, macOS, Linux, iOS/iPadOS y Android con soporte offline completo.
  - Diseño fluido que adapta automáticamente paneles, tablas técnicas, cronogramas SVG y editores de código a cualquier resolución de pantalla.
- **Buscador Universal Tolerante a Errores (`Ctrl + K`):**
  - Motor de búsqueda de texto completo sobre todos los temas, secciones, problemas resueltos, código fuente y cuestiones de examen, insensible a tildes, signos de interrogación (`¿?`) y errores ortográficos o tipográficos.
- **Módulo Desplegado: Programación Concurrente (3er Año · 1er Semestre):**
  - **7 Temas de Teoría Interactiva** con simuladores SVG reactivos (entrelazado de instrucciones, pila de hebras Pthreads, trazador de Peterson, colas POSIX y planificador de Tiempo Real RMS/EDF).
  - **11 Programas Ejecutables C11 POSIX y Java** con verificador estático integrado de normativa de evaluación.
  - **35 Problemas Resueltos Paso a Paso** distribuidos en 7 hojas de prácticas y **Simulador de Examen Final** con 21 cuestiones oficiales.
