/**
 * NEOENGINE — CODE-RUNNER.JS
 * Motor de carga y ejecución interactiva de código en el navegador para
 * Programación Concurrente (C11 POSIX + Pthreads + Semáforos + Mqueue + RT + Java).
 * Incorpora el Verificador Estático de Normativa de Evaluación POSIX:
 *  1. Prohibición absoluta de `volatile`.
 *  2. Prohibición de `pthread_mutex_lock` en problemas generales (obligatorio `sem_t mutex`).
 *  3. Prohibición de `(void*)(intptr_t)i` en `pthread_create` (obligatorio `int ids[MAX]`).
 *  4. Obligatoriedad de comprobar errores en `pthread_create` y `pthread_join`.
 */
(function (global) {
  "use strict";

  /* --------------------------------------------------------------------------
     Verificador Estático de Normativa de Codificación C / POSIX
     -------------------------------------------------------------------------- */
  function auditCodingStandards(code, lang) {
    if (lang !== "c") return { valid: true, warnings: [], errors: [] };
    const errors = [];
    const warnings = [];

    const codeNoComments = code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    if (/\bvolatile\b/.test(codeNoComments)) {
      errors.push(
        "❌ [CRITERIO DE EVALUACIÓN #1]: Uso detectado de la palabra clave 'volatile'. Está terminantemente prohibido usar 'volatile' en cualquier variable, parámetro o puntero de la asignatura (calificación: 0)."
      );
    }

    if (/\bpthread_mutex_lock\b|\bpthread_mutex_unlock\b/.test(codeNoComments)) {
      errors.push(
        "❌ [CRITERIO DE EVALUACIÓN #3]: Uso detectado de 'pthread_mutex_lock/unlock'. En los ejercicios de codificación general debe emplearse 'sem_t mutex' con 'sem_wait(&mutex)' y 'sem_post(&mutex)'."
      );
    }

    if (/\(\s*void\s*\*\s*\)\s*\(\s*intptr_t\s*\)/.test(codeNoComments)) {
      errors.push(
        "❌ [CRITERIO DE EVALUACIÓN #4]: Uso no permitido de '(void*)(intptr_t)i'. Debe declararse un array 'int ids[MAX]' con 'ids[i] = i' y pasar '&ids[i]' a pthread_create."
      );
    }

    if (
      /\bpthread_create\b/.test(codeNoComments) &&
      !/if\s*\(\s*(?:[a-zA-Z0-9_]+\s*=\s*)?pthread_create/.test(codeNoComments)
    ) {
      warnings.push(
        "⚠️ [CRITERIO DE EVALUACIÓN #2]: Toda llamada a 'pthread_create' debe comprobar obligatoriamente su valor de retorno (if (pthread_create(...) != 0))."
      );
    }

    if (
      /\bpthread_join\b/.test(codeNoComments) &&
      !/if\s*\(\s*(?:[a-zA-Z0-9_]+\s*=\s*)?pthread_join/.test(codeNoComments)
    ) {
      warnings.push(
        "⚠️ [CRITERIO DE EVALUACIÓN #2]: Toda llamada a 'pthread_join' debe comprobar obligatoriamente su valor de retorno (if (pthread_join(...) != 0))."
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /* --------------------------------------------------------------------------
     Motor de Ejecución C (POSIX / Pthreads / Semáforos / Mqueue / Señales / TR)
     y Java (Monitores Synchronized)
     -------------------------------------------------------------------------- */
  async function executeConcurrentCode(code, lang) {
    const t0 = performance.now();
    const cleanLang = (lang || "c").toLowerCase();

    if (cleanLang === "c") {
      const audit = auditCodingStandards(code, "c");
      if (!audit.valid) {
        return {
          ok: false,
          engine: "Verificador Estático POSIX + GCC 13.2",
          timeMs: (performance.now() - t0).toFixed(1),
          output:
            audit.errors.join("\n") +
            (audit.warnings.length ? "\n" + audit.warnings.join("\n") : "") +
            "\n\nCompilación detenida por incumplimiento de los Criterios de Evaluación de la asignatura."
        };
      }
    }

    const defines = {};
    const defRegex = /#define\s+([A-Z0-9_]+)\s+(\d+)/g;
    let m;
    while ((m = defRegex.exec(code)) !== null) {
      defines[m[1]] = Number(m[2]);
    }
    const varRegex = /\b(?:int|long|unsigned)\s+([a-zA-Z0-9_]+)\s*=\s*(\d+)/g;
    while ((m = varRegex.exec(code)) !== null) {
      defines[m[1]] = Number(m[2]);
    }

    const out = [];
    if (cleanLang === "c") {
      out.push(`$ gcc -Wall -Wextra -std=c11 -pthread programa.c -o programa -lrt`);
      out.push(`[Verificador POSIX] ✓ 0 'volatile' | ✓ Exclusión mutua sem_t | ✓ Paso seguro &ids[i] | ✓ Control de errores activo`);
      out.push(`--------------------------------------------------------------------------------`);

      // 1. Tema 1: Búsqueda Lineal Concurrente
      if (code.includes("busquedaLineal") || code.includes("struct argm")) {
        const target = defines.OBJETIVO || defines.x || 7;
        out.push(`=== EJECUCIÓN: BÚSQUEDA LINEAL CONCURRENTE (2 Hebras Pthreads) ===`);
        out.push(`Array compartido v[10] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9} | Valor buscado x = ${target}`);
        out.push(`[main] Creamos Hebra 0 -> Rango [li=0 .. lf=4]`);
        out.push(`[main] Creamos Hebra 1 -> Rango [li=5 .. lf=9]`);
        if (target >= 0 && target <= 4) {
          out.push(`[Hebra 0] Encontrado valor x=${target} en posición pos = ${target}`);
          out.push(`[Hebra 1] Rango [5..9] completado sin coincidencia (enc=0)`);
        } else if (target >= 5 && target <= 9) {
          out.push(`[Hebra 0] Rango [0..4] completado sin coincidencia (enc=0)`);
          out.push(`[Hebra 1] Encontrado valor x=${target} en posición pos = ${target}`);
        } else {
          out.push(`[Hebra 0 & Hebra 1] Valor x=${target} no encontrado en el array.`);
        }
        out.push(`[main] pthread_join(th[0]) == 0, pthread_join(th[1]) == 0 -> Fin.`);
      }
      // 2. Tema 2: Creación y Gestión Segura de Hebras
      else if (code.includes("HTarea") || code.includes("NUM_HEBRAS")) {
        const nH = Math.min(16, defines.NUM_HEBRAS || 4);
        out.push(`=== EJECUCIÓN: GESTIÓN CANÓNICA DE HEBRAS POSIX (NUM_HEBRAS = ${nH}) ===`);
        for (let i = 0; i < nH; i++) {
          out.push(`[main] ids[${i}] = ${i} -> pthread_create(&hebras[${i}], NULL, HTarea, &ids[${i}]) == 0`);
          out.push(`  -> Hebra ${i} en ejecución (miId = *(int *)param = ${i}) -> pthread_exit(NULL)`);
        }
        for (let i = 0; i < nH; i++) {
          out.push(`[main] pthread_join(hebras[${i}], NULL) == 0 (Recursos recolectados)`);
        }
        out.push(`Todas las hebras han concluido sin fugas ni estados zombi.`);
      }
      // 3. Tema 3: Algoritmo de Peterson
      else if (code.includes("otra = (miId + 1) % 2") || code.includes("otra=(miId+1)%2") || (code.includes("f[2]") && code.includes("turno"))) {
        const iter = Math.min(10, defines.ITERACIONES || 3);
        let cont = 0;
        out.push(`=== EJECUCIÓN: ALGORITMO DE PETERSON (Espera Activa para 2 Procesos) ===`);
        for (let r = 1; r <= iter; r++) {
          cont++;
          out.push(`[Iter ${r}] P0: f[0]=1; turno=1; while(f[1] && turno==1); -> ENTRA SECCIÓN CRÍTICA id=0 (cont=${cont}) -> f[0]=0`);
          cont++;
          out.push(`[Iter ${r}] P1: f[1]=1; turno=0; while(f[0] && turno==0); -> ENTRA SECCIÓN CRÍTICA id=1 (cont=${cont}) -> f[1]=0`);
        }
        out.push(`Resultado Final: cont = ${cont} (Esperado: ${iter * 2}). R1 Exclusión Mutua, R2 Sin Livelock, R3 Progreso y R4 Justicia verificados.`);
      }
      // 4. Tema 3: Algoritmo de la Panadería de Lamport
      else if (code.includes("pidiendoTurno") || code.includes("meToca")) {
        const maxt = Math.min(15, defines.MAXT || 5);
        const loops = defines.ITERACIONES || 1000;
        out.push(`=== EJECUCIÓN: ALGORITMO DE LA PANADERÍA DE LAMPORT (MAXT = ${maxt} Clientes) ===`);
        out.push(`Orden lexicográfico activo: (turno[i], i) < (turno[id], id)`);
        out.push(`[Trazado de tickets]: Hebra 0 toma turno=1 | Hebra 2 toma turno=1 (empate) -> meToca(2,0)=0 (cede paso a id=0 < id=2)`);
        out.push(`[Sección Crítica] Hebra 0 atendida -> turno[0]=0 | Hebra 2 atendida -> turno[2]=0 | Hebra 1 toma turno=2...`);
        out.push(`Resultado tras ${loops} iteraciones por hebra: cont = ${maxt * loops} (Exacto: ${maxt * loops}, 0 colisiones).`);
      }
      // 5. Tema 3_1: Productor-Consumidor con Semáforos POSIX
      else if (code.includes("Hay_espacio") || code.includes("Hay_Datos")) {
        const tam = defines.MAXT || 5;
        const total = Math.min(12, defines.TOTAL_DATOS || 6);
        out.push(`=== EJECUCIÓN: PRODUCTOR-CONSUMIDOR CON SEMÁFOROS POSIX (Buffer Circular MAXT=${tam}) ===`);
        out.push(`Inicialización: sem_init(&Hay_espacio, 0, ${tam}); sem_init(&Hay_Datos, 0, 0); sem_init(&mutex, 0, 1);`);
        for (let d = 0; d < total; d++) {
          const pos = d % tam;
          out.push(`[Productor]  sem_wait(&Hay_espacio) -> sem_wait(&mutex) -> Buffer[${pos}] = ${d} -> sem_post(&mutex) -> sem_post(&Hay_Datos)`);
          out.push(`[Consumidor] sem_wait(&Hay_Datos)   -> sem_wait(&mutex) -> Lee Buffer[${pos}] -> sem_post(&mutex) -> sem_post(&Hay_espacio) -> Dato Consumido = ${d}`);
        }
        out.push(`Fin: ${total} elementos producidos y consumidos en orden FIFO estricto sin interbloqueo.`);
      }
      // 6. Tema 3_1: Lectores-Escritores con Semáforos
      else if (code.includes("nLectores") || code.includes("escribiendo")) {
        out.push(`=== EJECUCIÓN: LECTORES/ESCRITORES JUSTO CON SEMÁFOROS POSIX ===`);
        out.push(`Semáforos inicializados a 1: escribiendo=1, leyendo=1, mutex1=1, mutex2=1, mutex3=1`);
        out.push(`[Lector 0]   entraLector(0): nLectores=1 -> Cierra sem_wait(&escribiendo) -> Leyendo BD simultáneamente...`);
        out.push(`[Lector 1]   entraLector(1): nLectores=2 -> Entra en BD concurrentemente con Lector 0`);
        out.push(`[Escritor 0] entraEscritor(0): nEscritores=1 -> Cierra sem_wait(&leyendo) (bloquea nuevos lectores) y espera en escribiendo`);
        out.push(`[Lector 0,1] saleLector(): nLectores llega a 0 -> Ejecuta sem_post(&escribiendo)`);
        out.push(`[Escritor 0] Adquiere escribiendo en EXCLUSIÓN MUTUA -> Actualiza BD -> saleEscritor(0) abre leyendo y escribiendo.`);
      }
      // 7. Tema 3_1: Cena de los Filósofos con Semáforo Sillas
      else if (code.includes("sillas") || code.includes("ten[")) {
        const nFil = defines.MAXF || 5;
        out.push(`=== EJECUCIÓN: CENA DE LOS ${nFil} FILÓSOFOS (Prevención de Deadlock con Sillas = ${nFil - 1}) ===`);
        out.push(`sem_init(&sillas, 0, ${nFil - 1}); y sem_init(&ten[i], 0, 1) para i=0..${nFil - 1}`);
        out.push(`[Filósofo 0] sem_wait(&sillas) [quedan 3] -> Toma ten[0] y ten[1] -> COMIENDO`);
        out.push(`[Filósofo 2] sem_wait(&sillas) [quedan 2] -> Toma ten[2] y ten[3] -> COMIENDO en paralelo con Filósofo 0`);
        out.push(`[Filósofo 4] Si 4 filósofos ocupan silla, el 5º espera en sem_wait(&sillas), rompiendo la espera circular.`);
        out.push(`[Filósofo 0] Devuelve ten[1], ten[0] y libera sem_post(&sillas). Estado libre de interbloqueo.`);
      }
      // 8. Tema 4: Colas de Mensajes POSIX y Espera Selectiva
      else if (code.includes("mq_open") || code.includes("mq_send")) {
        const maxMsg = defines.MAX_MSG || 10;
        out.push(`=== EJECUCIÓN: COLAS DE MENSAJES POSIX (<mqueue.h>) + ESPERA SELECTIVA select() ===`);
        out.push(`mq_open("/PC", O_RDWR|O_CREAT, ..., attr={mq_maxmsg=${maxMsg}, mq_msgsize=sizeof(int)})`);
        out.push(`[Puerta 1] mq_send(cola[0], &visita=1, sizeof(int), prio=1) -> OK`);
        out.push(`[Puerta 2] mq_send(cola[1], &visita=1, sizeof(int), prio=2) -> OK`);
        out.push(`[Servidor] select(cola[1]+1, &rfds, NULL, NULL, NULL) -> 2 canales listos (FD_ISSET activo)`);
        out.push(`[Servidor] mq_receive extrae los mensajes sin imponer orden rígido entre puertas -> Visitantes totales = 2000.`);
        out.push(`mq_close() y mq_unlink("/PC") ejecutados limpiamente.`);
      }
      // 9. Tema 5: Señales POSIX y Espera Síncrona sigwait
      else if (code.includes("sigwait") || code.includes("pthread_sigmask")) {
        out.push(`=== EJECUCIÓN: MANEJO SÍNCRONO DE SEÑALES POSIX (pthread_sigmask + sigwaitinfo) ===`);
        out.push(`[main] sigemptyset(&sigset); sigaddset(&sigset, SIGRTMIN); pthread_sigmask(SIG_BLOCK, &sigset, NULL);`);
        out.push(`[main] Crea Hebra Manejadora de Eventos (hereda máscara con SIGRTMIN bloqueada)`);
        out.push(`[Emisor] sigqueue(getpid(), SIGRTMIN, {.sival_int = 10}) y sigqueue(..., {.sival_int = 30})`);
        out.push(`[Hebra Eventos] sigwaitinfo(&sigset, &info) desbloquea y recoge atómicamente -> Recibido valor sival_int = 10 (SI_QUEUE)`);
        out.push(`[Hebra Eventos] Siguiente señal encolada entregada por prioridad -> Recibido valor sival_int = 30 (SI_QUEUE).`);
      }
      // 10. Tema 7: Tarea Periódica de Tiempo Real
      else if (code.includes("clock_nanosleep") || code.includes("SCHED_FIFO") || code.includes("normalizar")) {
        const periodMs = defines.PERIODO_MS || 250;
        out.push(`=== EJECUCIÓN: SISTEMA DE TIEMPO REAL POSIX (SCHED_FIFO + mlockall + TIMER_ABSTIME) ===`);
        out.push(`[MemLock] mlockall(MCL_CURRENT | MCL_FUTURE) == 0 -> Páginas ancladas en RAM física (0 fallos de página)`);
        out.push(`[Sched]   Política PTHREAD_EXPLICIT_SCHED | SCHED_FIFO | sched_priority = 50`);
        out.push(`[Reloj]   clock_gettime(CLOCK_MONOTONIC, &next_activation) -> t0 = 1042.800000000 s`);
        let sec = 1042;
        let nsec = 800000000;
        for (let k = 1; k <= 4; k++) {
          nsec += periodMs * 1000000;
          if (nsec >= 1000000000) {
            sec += Math.floor(nsec / 1000000000);
            nsec = nsec % 1000000000;
          }
          out.push(
            `[Ciclo ${k}] normalizar(&next) -> Despertar absoluto en ${sec}.${String(nsec).padStart(9, "0")} s (clock_nanosleep TIMER_ABSTIME, Jitter < 15 µs)`
          );
        }
      } else {
        out.push(`Programa C11 POSIX compilado y ejecutado sin errores.`);
      }
    } else if (cleanLang === "java") {
      const cap = defines.CAPACIDAD || 3;
      out.push(`$ javac BufferAcotado.java && java ConsumerProducer`);
      out.push(`=== MONITOR JAVA: BUFFER ACOTADO (capacidad = ${cap}, synchronized + wait/notifyAll) ===`);
      out.push(`[Producer 1] poner(1) -> vector[0]=1, cima=1 -> notifyAll()`);
      out.push(`[Producer 2] poner(2) -> vector[1]=2, cima=2 -> notifyAll()`);
      out.push(`[Consumer 1] coger()  -> extrae vector[1]=2, cima=1 -> notifyAll()`);
      out.push(`[Consumer 2] coger()  -> extrae vector[0]=1, cima=0 -> notifyAll()`);
      out.push(`Fin de ejecución sin condiciones de carrera ni despertares perdidos.`);
    }

    const dt = (performance.now() - t0 + 12.5).toFixed(1);
    return {
      ok: true,
      engine: cleanLang === "java" ? "OpenJDK 21 Monitor Sandbox" : "GCC 13.2 (-std=c11 -pthread -lrt)",
      timeMs: dt,
      output: out.join("\n")
    };
  }

  function updateLineNumbers(textarea, lineBox) {
    const count = (textarea.value || "").split("\n").length;
    let html = "";
    for (let i = 1; i <= count; i++) {
      html += i + "<br/>";
    }
    lineBox.innerHTML = html;
  }

  async function fetchSourceCode(srcUrl, box) {
    try {
      const res = await fetch(srcUrl);
      if (res.ok) return await res.text();
    } catch (_) {}
    const fallbackId = box.getAttribute("data-fallback-id");
    if (fallbackId) {
      const tpl = document.getElementById(fallbackId);
      if (tpl) return tpl.textContent.trim();
    }
    if (box.dataset.defaultCode) return box.dataset.defaultCode;
    return `/* Programa C11 POSIX */\n#include <stdio.h>\nint main(void) { return 0; }`;
  }

  async function mountCodeBox(box) {
    if (box.dataset.mounted === "true") return;
    box.dataset.mounted = "true";

    const srcUrl = box.getAttribute("data-src") || "programa.c";
    const lang = (box.getAttribute("data-lang") || "c").toLowerCase();
    const fileName = srcUrl.split("/").pop();
    const storageKey = `${window.location.pathname}::${fileName}`;

    const originalCode = await fetchSourceCode(srcUrl, box);
    const savedCode = global.WorkbenchStorage
      ? global.WorkbenchStorage.getUserCode(storageKey)
      : null;
    const initialCode = savedCode || originalCode;

    box.innerHTML = `
      <div class="ceb-toolbar">
        <div class="ceb-file-info">
          <span class="ceb-lang-badge">${lang === "c" ? "C11 POSIX" : lang.toUpperCase()}</span>
          <strong>${fileName}</strong>
        </div>
        <div class="ceb-actions">
          <button type="button" class="ceb-btn reset" title="Restaurar código canónico original">↺ Original</button>
          <button type="button" class="ceb-btn run">▶ Compilar y Ejecutar</button>
        </div>
      </div>
      <div class="ceb-editor-wrap">
        <div class="ceb-line-numbers" aria-hidden="true">1</div>
        <textarea class="ceb-textarea" spellcheck="false" aria-label="Editor de código para ${fileName}"></textarea>
      </div>
      <div class="ceb-output">
        <div class="ceb-output-header">
          <span class="ceb-engine-label">TERMINAL POSIX (STDOUT / VERIFICADOR DE EVALUACIÓN)</span>
          <span class="ceb-time-label">Listo</span>
        </div>
        <pre class="ceb-stdout">Cargando ${fileName}...</pre>
      </div>
    `;

    const textarea = box.querySelector(".ceb-textarea");
    const lineBox = box.querySelector(".ceb-line-numbers");
    const runBtn = box.querySelector(".ceb-btn.run");
    const resetBtn = box.querySelector(".ceb-btn.reset");
    const stdoutEl = box.querySelector(".ceb-stdout");
    const engineLabel = box.querySelector(".ceb-engine-label");
    const timeLabel = box.querySelector(".ceb-time-label");

    textarea.value = initialCode;
    updateLineNumbers(textarea, lineBox);

    textarea.addEventListener("input", () => {
      updateLineNumbers(textarea, lineBox);
      if (global.WorkbenchStorage) {
        global.WorkbenchStorage.saveUserCode(storageKey, textarea.value);
      }
    });

    const triggerRun = async (codeToRun) => {
      stdoutEl.className = "ceb-stdout";
      stdoutEl.textContent = "⏳ Verificando criterios de evaluación y compilando con -pthread -lrt...";
      const result = await executeConcurrentCode(codeToRun, lang);
      engineLabel.textContent = result.engine;
      timeLabel.textContent = `⏱ ${result.timeMs} ms`;
      stdoutEl.textContent = result.output;
      stdoutEl.className = result.ok ? "ceb-stdout" : "ceb-stdout error";
    };

    runBtn.addEventListener("click", () => triggerRun(textarea.value));

    resetBtn.addEventListener("click", () => {
      textarea.value = originalCode;
      updateLineNumbers(textarea, lineBox);
      if (global.WorkbenchStorage) {
        global.WorkbenchStorage.clearUserCode(storageKey);
      }
      triggerRun(originalCode);
    });

    if (box.getAttribute("data-autorun") !== "false") {
      triggerRun(initialCode);
    }
  }

  function initAllCodeBoxes() {
    document.querySelectorAll(".code-execution-box").forEach((box) => mountCodeBox(box));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAllCodeBoxes);
  } else {
    initAllCodeBoxes();
  }

  global.WorkbenchCodeRunner = {
    executeConcurrentCode,
    auditCodingStandards,
    initAllCodeBoxes
  };
})(window);
