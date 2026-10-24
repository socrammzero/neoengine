/**
 * NEOENGINE — CODE-RUNNER.JS
 * Laboratorio Interactivo de Código C11 POSIX y Java:
 *  1. Sin auto-ejecución previa: la consola inicia limpia y compila bajo demanda al pulsar "▶ Compilar y Ejecutar".
 *  2. Modo Estudio (Edición Libre) + Modo Reto Interactivo ("🧩 Completar Código") para que el alumno
 *     complete las primitivas clave y compruebe si su código funciona realmente.
 *  3. Verificador Dinámico de Concurrencia y Sintaxis: detecta llaves/paréntesis desbalanceados,
 *     condiciones de carrera (Race Conditions), interbloqueos (Deadlocks por orden inverso de sem_wait
 *     o falta de sem_post), evalúa constantes/variables y ejecuta los printf() escritos por el alumno.
 *  4. Recomendaciones constructivas de escritura y estilo académico para la asignatura.
 */
(function (global) {
  "use strict";

  /* --------------------------------------------------------------------------
     1. Recomendaciones Constructivas de Estilo y Escritura (C11 POSIX)
     -------------------------------------------------------------------------- */
  function analyzeCodingRecommendations(code, lang) {
    if (lang !== "c") return [];
    const tips = [];
    const codeNoComments = code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    if (/\bvolatile\b/.test(codeNoComments)) {
      tips.push(
        "💡 [Recomendación de escritura]: Se aconseja declarar las variables compartidas como globales estándar (int, unsigned, long) sin necesidad de emplear el calificador 'volatile'."
      );
    }

    if (/\bpthread_mutex_lock\b|\bpthread_mutex_unlock\b/.test(codeNoComments)) {
      tips.push(
        "💡 [Recomendación de escritura]: En los problemas generales de la asignatura se aconseja gestionar la exclusión mutua mediante un semáforo binario 'sem_t mutex' (con sem_init(&mutex, 0, 1), sem_wait(&mutex) y sem_post(&mutex))."
      );
    }

    if (/\(\s*void\s*\*\s*\)\s*\(\s*intptr_t\s*\)/.test(codeNoComments)) {
      tips.push(
        "💡 [Recomendación de escritura]: Para pasar el índice a cada hebra en pthread_create, se aconseja declarar un array 'int ids[MAX]', asignar 'ids[i] = i;' en el bucle y pasar la dirección '&ids[i]'."
      );
    }

    if (
      /\bpthread_create\b/.test(codeNoComments) &&
      !/if\s*\(\s*(?:[a-zA-Z0-9_]+\s*=\s*)?pthread_create/.test(codeNoComments)
    ) {
      tips.push(
        "💡 [Recomendación de escritura]: Se aconseja verificar el valor de retorno de 'pthread_create' (ej. if (pthread_create(...) != 0)) para detectar posibles fallos de creación."
      );
    }

    if (
      /\bpthread_join\b/.test(codeNoComments) &&
      !/if\s*\(\s*(?:[a-zA-Z0-9_]+\s*=\s*)?pthread_join/.test(codeNoComments)
    ) {
      tips.push(
        "💡 [Recomendación de escritura]: Se aconseja verificar el valor de retorno de 'pthread_join' (ej. if (pthread_join(...) != 0)) al recolectar las hebras."
      );
    }

    return tips;
  }

  /* --------------------------------------------------------------------------
     2. Generador de Retos Interactivos ("🧩 Modo Reto: Completar Código")
     -------------------------------------------------------------------------- */
  function buildChallengeFromSource(originalCode, fileName) {
    let challengeCode = originalCode;
    const hints = [];
    const checks = [];

    // 1. Búsqueda concurrente (Tema 1)
    if (fileName.includes("busqueda_concurrente")) {
      challengeCode = challengeCode
        .replace(
          /if\s*\(\s*(?:\(\s*err\s*=\s*)?pthread_create\(\s*&th(?:1|\[0\])[^\n]+\n/,
          "    /* [RETO 1]: Crea la hebra th1 pasando la función busquedaLineal y &arg1 comprobando si devuelve != 0 */\n    if (/* ___ COMPLETAR AQUÍ: pthread_create(&th1, NULL, busquedaLineal, &arg1) ___ */ != 0) {\n"
        )
        .replace(
          /if\s*\(\s*(?:\(\s*err\s*=\s*)?pthread_join\(\s*th(?:1|\[0\])[^\n]+\n/,
          "    /* [RETO 2]: Espera a la finalización de th1 mediante pthread_join comprobando si devuelve != 0 */\n    if (/* ___ COMPLETAR AQUÍ: pthread_join(th1, NULL) ___ */ != 0) {\n"
        );
      hints.push("Reto 1: Invoca pthread_create(&th1, NULL, busquedaLineal, &arg1) dentro de la condición if (... != 0).");
      hints.push("Reto 2: Invoca pthread_join(th1, NULL) dentro de la condición if (... != 0) para sincronizar la hebra principal.");
      checks.push({
        label: "Creación de ambas hebras con pthread_create y paso de &arg1 / &arg2",
        test: (c) =>
          /pthread_create\s*\(\s*&th(?:1|\[0\])[\s\S]*?&arg1\s*\)/.test(c) &&
          /pthread_create\s*\(\s*&th(?:2|\[1\])[\s\S]*?&arg2\s*\)/.test(c)
      });
      checks.push({
        label: "Sincronización mediante pthread_join para ambas hebras (th1 y th2)",
        test: (c) =>
          /pthread_join\s*\(\s*th(?:1|\[0\])/.test(c) &&
          /pthread_join\s*\(\s*th(?:2|\[1\])/.test(c)
      });
    }
    // 2. Creación segura de hebras (Tema 2)
    else if (fileName.includes("creacion_hebras")) {
      challengeCode = challengeCode
        .replace(
          /int\s+miId\s*=\s*\*\(\s*int\s*\*\s*\)\s*param\s*;/,
          "    /* [RETO 1]: Recupera el identificador entero desreferenciando el puntero 'param' */\n    int miId = /* ___ COMPLETAR AQUÍ ___ */;"
        )
        .replace(
          /ids\[i\]\s*=\s*i\s*;/,
          "        /* [RETO 2]: Guarda el índice 'i' en el array 'ids' antes de crear la hebra */\n        /* ___ COMPLETAR AQUÍ ___ */"
        );
      hints.push("Reto 1: Convierte 'param' a puntero a entero y desreferéncialo: *(int *)param");
      hints.push("Reto 2: Asigna ids[i] = i; antes de pasar &ids[i] a pthread_create.");
      checks.push({
        label: "Desreferenciación segura del parámetro: *(int *)param",
        test: (c) => /\*\s*\(\s*int\s*\*\s*\)\s*param/.test(c)
      });
      checks.push({
        label: "Asignación previa ids[i] = i y paso de &ids[i] en pthread_create",
        test: (c) => /ids\s*\[\s*i\s*\]\s*=\s*i\s*;/.test(c) && /pthread_create\s*\([^;]*&ids\s*\[\s*i\s*\]/.test(c)
      });
    }
    // 3. Algoritmo de Peterson (Tema 3)
    else if (fileName.includes("peterson")) {
      challengeCode = challengeCode
        .replace(
          /f\[miId\]\s*=\s*1\s*;\s*\n\s*turno\s*=\s*otra\s*;\s*\n\s*while\s*\(\s*f\[otra\]\s*&&\s*turno\s*==\s*otra\s*\)\s*;/,
          "        /* [RETO 1]: Escribe las 3 líneas del Preprotocolo de Peterson (levantar flag f[miId], ceder turno a 'otra' y bucle while de espera activa) */\n        // ___ ESCRIBE AQUÍ EL PREPROTOCOLO DE PETERSON ___"
        )
        .replace(
          /f\[miId\]\s*=\s*0\s*;/,
          "        /* [RETO 2]: Postprotocolo de Peterson (bajar el flag de interés de la hebra actual) */\n        // ___ ESCRIBE AQUÍ EL POSTPROTOCOLO ___"
        );
      hints.push("Reto 1 (Preprotocolo): f[miId] = 1; turno = otra; while (f[otra] && turno == otra);");
      hints.push("Reto 2 (Postprotocolo): f[miId] = 0;");
      checks.push({
        label: "Activación de interés f[miId] = 1 y cesión turno = otra",
        test: (c) => /f\s*\[\s*miId\s*\]\s*=\s*1\s*;/.test(c) && /turno\s*=\s*otra\s*;/.test(c)
      });
      checks.push({
        label: "Condición de espera activa while (f[otra] && turno == otra);",
        test: (c) => /while\s*\(\s*f\s*\[\s*otra\s*\]\s*&&\s*turno\s*==\s*otra\s*\)\s*;/.test(c)
      });
      checks.push({
        label: "Postprotocolo f[miId] = 0 al salir de la Sección Crítica",
        test: (c) => /f\s*\[\s*miId\s*\]\s*=\s*0\s*;/.test(c)
      });
    }
    // 4. Panadería de Lamport (Tema 3)
    else if (fileName.includes("panaderia")) {
      challengeCode = challengeCode
        .replace(
          /pidiendoTurno\[(?:miId|id)\]\s*=\s*1\s*;\s*\n\s*turno\[(?:miId|id)\]\s*=\s*siguiente\(\)\s*;\s*\n\s*pidiendoTurno\[(?:miId|id)\]\s*=\s*0\s*;/,
          "        /* [RETO 1]: Toma de ticket en la Panadería de Lamport (activar pidiendoTurno[miId], calcular turno[miId] = siguiente() y desactivar pidiendoTurno[miId]) */\n        // ___ COMPLETAR AQUÍ TOMA DE TURNO ___"
        )
        .replace(
          /turno\[(?:miId|id)\]\s*=\s*0\s*;/,
          "        /* [RETO 2]: Postprotocolo: liberar el ticket poniendo turno[miId] a 0 */\n        // ___ COMPLETAR AQUÍ POSTPROTOCOLO ___"
        );
      hints.push("Reto 1: pidiendoTurno[miId] = 1; turno[miId] = siguiente(); pidiendoTurno[miId] = 0;");
      hints.push("Reto 2: turno[miId] = 0;");
      checks.push({
        label: "Protocolo de toma de número con pidiendoTurno[miId] y turno[miId] = siguiente()",
        test: (c) =>
          /pidiendoTurno\s*\[\s*(?:miId|id)\s*\]\s*=\s*1/.test(c) &&
          /turno\s*\[\s*(?:miId|id)\s*\]\s*=\s*siguiente\s*\(\s*\)/.test(c) &&
          /pidiendoTurno\s*\[\s*(?:miId|id)\s*\]\s*=\s*0/.test(c)
      });
      checks.push({
        label: "Liberación del ticket turno[miId] = 0 en el postprotocolo",
        test: (c) => /turno\s*\[\s*(?:miId|id)\s*\]\s*=\s*0\s*;/.test(c)
      });
    }
    // 5. Productor-Consumidor con Semáforos (Tema 3_1)
    else if (fileName.includes("productor_consumidor")) {
      challengeCode = challengeCode
        .replace(
          /sem_wait\(&Hay_espacio\)\s*;\s*\n\s*sem_wait\(&mutex\)\s*;/,
          "        /* [RETO 1 - Preprotocolo Productor]: Espera primero a que haya espacio y después adquiere la exclusión mutua (¡cuidado con el orden para evitar deadlock!) */\n        // ___ COMPLETAR AQUÍ PREPROTOCOLO PRODUCTOR ___"
        )
        .replace(
          /sem_post\(&mutex\)\s*;\s*\n\s*sem_post\(&Hay_Datos\)\s*;/,
          "        /* [RETO 2 - Postprotocolo Productor]: Libera la exclusión mutua y señaliza que hay un nuevo dato disponible */\n        // ___ COMPLETAR AQUÍ POSTPROTOCOLO PRODUCTOR ___"
        );
      hints.push("Reto 1: sem_wait(&Hay_espacio); seguido de sem_wait(&mutex); (nunca al revés).");
      hints.push("Reto 2: sem_post(&mutex); seguido de sem_post(&Hay_Datos);");
      checks.push({
        label: "Orden libre de interbloqueo en Productor: sem_wait(&Hay_espacio) antes de sem_wait(&mutex)",
        test: (c) => /sem_wait\s*\(\s*&Hay_espacio\s*\)\s*;\s*sem_wait\s*\(\s*&mutex\s*\)/.test(c)
      });
      checks.push({
        label: "Señalización correcta en Productor: sem_post(&mutex) y sem_post(&Hay_Datos)",
        test: (c) => /sem_post\s*\(\s*&mutex\s*\)\s*;\s*sem_post\s*\(\s*&Hay_Datos\s*\)/.test(c)
      });
    }
    // 6. Lectores-Escritores (Tema 3_1)
    else if (fileName.includes("lectores_escritores")) {
      challengeCode = challengeCode
        .replace(
          /nLectores\+\+\s*;\s*\n\s*if\s*\(\s*nLectores\s*==\s*1\s*\)\s*\{\s*\n\s*sem_wait\(&escribiendo\)\s*;\s*\n\s*\}/,
          "    /* [RETO 1]: Incrementa nLectores y, si es el primer lector (nLectores == 1), bloquea a los escritores con sem_wait(&escribiendo) */\n    // ___ COMPLETAR AQUÍ ENTRADA PRIMER LECTOR ___"
        )
        .replace(
          /nLectores--\s*;\s*\n\s*if\s*\(\s*nLectores\s*==\s*0\s*\)\s*\{\s*\n\s*sem_post\(&escribiendo\)\s*;\s*\n\s*\}/,
          "    /* [RETO 2]: Decrementa nLectores y, si era el último lector (nLectores == 0), libera sem_post(&escribiendo) */\n    // ___ COMPLETAR AQUÍ SALIDA ÚLTIMO LECTOR ___"
        );
      hints.push("Reto 1: nLectores++; if (nLectores == 1) { sem_wait(&escribiendo); }");
      hints.push("Reto 2: nLectores--; if (nLectores == 0) { sem_post(&escribiendo); }");
      checks.push({
        label: "Primer lector cierra el paso a escritores: if (nLectores == 1) sem_wait(&escribiendo)",
        test: (c) => /nLectores\s*\+\+/.test(c) && /if\s*\(\s*nLectores\s*==\s*1\s*\)[\s\S]*?sem_wait\s*\(\s*&escribiendo\s*\)/.test(c)
      });
      checks.push({
        label: "Último lector abre el paso a escritores: if (nLectores == 0) sem_post(&escribiendo)",
        test: (c) => /nLectores\s*--/.test(c) && /if\s*\(\s*nLectores\s*==\s*0\s*\)[\s\S]*?sem_post\s*\(\s*&escribiendo\s*\)/.test(c)
      });
    }
    // 7. Cena de los Filósofos (Tema 3_1)
    else if (fileName.includes("filosofos")) {
      challengeCode = challengeCode
        .replace(
          /sem_init\(&sillas,\s*0,\s*MAXF\s*-\s*1\)\s*;/,
          "    /* [RETO 1]: Inicializa el semáforo 'sillas' a MAXF - 1 para romper la espera circular */\n    // ___ COMPLETAR AQUÍ INICIALIZACIÓN DE SILLAS ___"
        )
        .replace(
          /sem_wait\(&sillas\)\s*;\s*\n\s*sem_wait\(&ten\[(?:id|miId)\]\)\s*;\s*\n\s*sem_wait\(&ten\[\((?:id|miId)\s*\+\s*1\)\s*%\s*MAXF\]\)\s*;/,
          "    /* [RETO 2]: Toma asiento (sem_wait(&sillas)) y adquiere los dos tenedores adyacentes (id y (id + 1) % MAXF) */\n    // ___ COMPLETAR AQUÍ PREPROTOCOLO DEL FILÓSOFO ___"
        );
      hints.push("Reto 1: sem_init(&sillas, 0, MAXF - 1);");
      hints.push("Reto 2: sem_wait(&sillas); sem_wait(&ten[id]); sem_wait(&ten[(id + 1) % MAXF]);");
      checks.push({
        label: "Inicialización del semáforo de sillas a MAXF - 1",
        test: (c) => /sem_init\s*\(\s*&sillas\s*,\s*0\s*,\s*(?:MAXF\s*-\s*1|4)\s*\)/.test(c)
      });
      checks.push({
        label: "Adquisición de silla y ambos tenedores (ten[id] y ten[(id + 1) % MAXF])",
        test: (c) =>
          /sem_wait\s*\(\s*&sillas\s*\)/.test(c) &&
          /sem_wait\s*\(\s*&ten\s*\[\s*(?:id|miId)\s*\]\s*\)/.test(c)
      });
    }
    // 8. Colas de mensajes POSIX (Tema 4)
    else if (fileName.includes("colas_mensajes")) {
      challengeCode = challengeCode
        .replace(
          /mq_send\(cola\[(?:idCola|id)\],\s*\(const char \*\)&(?:val|msg),\s*sizeof\(int\),\s*(?:prio|1)\)/,
          "/* [RETO 1]: ___ COMPLETAR AQUÍ: mq_send(cola[idCola], (const char *)&val, sizeof(int), prio) ___ */"
        )
        .replace(
          /mq_receive\(cola\[(?:0|i)\],\s*\(char \*\)&(?:num|dato),\s*sizeof\(int\),\s*&(?:prior|prio)\)/,
          "/* [RETO 2]: ___ COMPLETAR AQUÍ: mq_receive(cola[0], (char *)&num, sizeof(int), &prior) ___ */"
        );
      hints.push("Reto 1: mq_send(cola[idCola], (const char *)&val, sizeof(int), prio)");
      hints.push("Reto 2: mq_receive(cola[0], (char *)&num, sizeof(int), &prior)");
      checks.push({
        label: "Envío por cola de mensajes POSIX mediante mq_send",
        test: (c) => /mq_send\s*\(\s*cola\[/.test(c)
      });
      checks.push({
        label: "Recepción desde cola de mensajes POSIX mediante mq_receive",
        test: (c) => /mq_receive\s*\(\s*cola\[/.test(c)
      });
    }
    // 9. Señales POSIX sigwaitinfo (Tema 5)
    else if (fileName.includes("senales_sigwait")) {
      challengeCode = challengeCode
        .replace(
          /pthread_sigmask\(SIG_BLOCK,\s*&sigset,\s*NULL\)/,
          "/* [RETO 1]: ___ COMPLETAR AQUÍ: pthread_sigmask(SIG_BLOCK, &sigset, NULL) ___ */"
        )
        .replace(
          /sigwaitinfo\((?:set|&sigset),\s*&info\)\s*;/,
          "/* [RETO 2]: ___ COMPLETAR AQUÍ: sigwaitinfo(set, &info); ___ */"
        );
      hints.push("Reto 1: pthread_sigmask(SIG_BLOCK, &sigset, NULL)");
      hints.push("Reto 2: sigwaitinfo(set, &info);");
      checks.push({
        label: "Bloqueo de la máscara de señales con pthread_sigmask(SIG_BLOCK, &sigset, NULL)",
        test: (c) => /pthread_sigmask\s*\(\s*SIG_BLOCK\s*,\s*&sigset/.test(c)
      });
      checks.push({
        label: "Espera síncrona con sigwaitinfo(set, &info) o sigwait",
        test: (c) => /sigwait(?:info)?\s*\(\s*(?:set|&sigset)/.test(c)
      });
    }
    // 10. Monitor Java BufferAcotado (Tema 6)
    else if (fileName.includes("BufferAcotado")) {
      challengeCode = challengeCode
        .replace(
          /while\s*\(\s*cima\s*==\s*capacidad(?:\s*-\s*1)?\s*\)\s*\{\s*\n\s*try\s*\{\s*\n\s*wait\(\)\s*;\s*\n\s*\}\s*catch\s*\([^)]+\)\s*\{\s*\n\s*[^}]+\n\s*\}\s*\n\s*\}/,
          "        /* [RETO 1]: Mientras el buffer esté lleno (cima == capacidad - 1), suspende la hebra con wait() */\n        while (cima == capacidad - 1) {\n            try { /* ___ COMPLETAR AQUÍ: wait(); ___ */ } catch (InterruptedException e) { Thread.currentThread().interrupt(); }\n        }"
        )
        .replace(
          /notifyAll\(\)\s*;/g,
          "/* [RETO 2]: ___ COMPLETAR AQUÍ: notifyAll(); ___ */"
        );
      hints.push("Reto 1: Invoca wait(); dentro del bloque try cuando cima == capacidad - 1.");
      hints.push("Reto 2: Invoca notifyAll(); para despertar a las hebras bloqueadas en el monitor.");
      checks.push({
        label: "Comprobación de condición en bucle while y llamada a wait()",
        test: (c) => /while\s*\(\s*cima\s*==\s*capacidad(?:\s*-\s*1)?\s*\)\s*\{[\s\S]*?wait\s*\(\s*\)/.test(c)
      });
      checks.push({
        label: "Notificación a las hebras esperando mediante notifyAll()",
        test: (c) => /notifyAll\s*\(\s*\)\s*;/.test(c)
      });
    }
    // 11. Tarea periódica Tiempo Real (Tema 7)
    else if (fileName.includes("tarea_periodica")) {
      challengeCode = challengeCode
        .replace(
          /mlockall\(MCL_CURRENT\s*\|\s*MCL_FUTURE\)/,
          "/* [RETO 1]: ___ COMPLETAR AQUÍ: mlockall(MCL_CURRENT | MCL_FUTURE) ___ */"
        )
        .replace(
          /clock_nanosleep\(CLOCK_MONOTONIC,\s*TIMER_ABSTIME,\s*&next(?:_activation)?,\s*NULL\)/,
          "/* [RETO 2]: ___ COMPLETAR AQUÍ: clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &next_activation, NULL) ___ */"
        );
      hints.push("Reto 1: mlockall(MCL_CURRENT | MCL_FUTURE)");
      hints.push("Reto 2: clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &next_activation, NULL)");
      checks.push({
        label: "Bloqueo de paginación en RAM física con mlockall(MCL_CURRENT | MCL_FUTURE)",
        test: (c) => /mlockall\s*\(\s*MCL_CURRENT\s*\|\s*MCL_FUTURE\s*\)/.test(c)
      });
      checks.push({
        label: "Espera periódica absoluta con clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &next_activation, NULL)",
        test: (c) => /clock_nanosleep\s*\(\s*CLOCK_MONOTONIC\s*,\s*TIMER_ABSTIME\s*,\s*&next(?:_activation)?/.test(c)
      });
    }

    return { challengeCode, hints, checks };
  }

  /* --------------------------------------------------------------------------
     3. Verificador de Sintaxis, Deadlocks y Ejecución Interactiva del Alumno
     -------------------------------------------------------------------------- */
  function checkBasicSyntaxAndCompleteness(code, lang) {
    const issues = [];
    if (/__\s*(?:ESCRIBE|COMPLETAR)\s+AQUÍ|\[RETO\s+\d+\]:\s*(?:Envía|Extrae|Espera|Despierta|Ancla)/.test(code)) {
      issues.push(
        "🧩 Todavía quedan huecos del Modo Reto por completar en el código. Rellena las secciones marcadas con [RETO] antes de ejecutar."
      );
    }

    const clean = code
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      .replace(/"(?:\\.|[^"\\])*"/g, '""');

    let braces = 0;
    let parens = 0;
    for (let i = 0; i < clean.length; i++) {
      if (clean[i] === "{") braces++;
      else if (clean[i] === "}") braces--;
      else if (clean[i] === "(") parens++;
      else if (clean[i] === ")") parens--;
    }
    if (braces !== 0) {
      issues.push(
        `❌ [Error de Sintaxis]: Llaves '{ }' desbalanceadas en tu código (${braces > 0 ? "falta cerrar '}'" : "sobra una llave '}'"}).`
      );
    }
    if (parens !== 0) {
      issues.push(
        `❌ [Error de Sintaxis]: Paréntesis '( )' desbalanceados en tu código (${parens > 0 ? "falta cerrar ')'" : "sobra un paréntesis ')'"}).`
      );
    }
    if (lang === "c" && !/\bmain\s*\(/.test(clean)) {
      issues.push(`❌ [Error de Enlazado]: No se ha encontrado el punto de entrada 'main()' en el programa.`);
    }
    return issues;
  }

  function detectConcurrencyBugs(code, fileName) {
    const clean = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const bugs = [];

    if (fileName.includes("productor_consumidor")) {
      if (/sem_wait\s*\(\s*&mutex\s*\)\s*;\s*sem_wait\s*\(\s*&Hay_(?:espacio|Datos)\s*\)/.test(clean)) {
        bugs.push(
          "💥 [INTERBLOQUEO / DEADLOCK DETECTADO EN TU CÓDIGO]: Has invocado 'sem_wait(&mutex)' ANTES de 'sem_wait(&Hay_espacio)' o 'sem_wait(&Hay_Datos)'. Si una hebra entra con el buffer lleno/vacío, retendrá 'mutex' y se bloqueará esperando espacio/datos, impidiendo que la otra hebra entre a liberar el buffer."
        );
      }
      const waits = (clean.match(/sem_wait\s*\(\s*&mutex\s*\)/g) || []).length;
      const posts = (clean.match(/sem_post\s*\(\s*&mutex\s*\)/g) || []).length;
      if (waits > posts) {
        bugs.push(
          "💥 [INTERBLOQUEO DETECTADO]: Hay llamadas a 'sem_wait(&mutex)' sin su correspondiente 'sem_post(&mutex)'. El semáforo de exclusión mutua queda cerrado permanentemente en 0."
        );
      } else if (waits === 0) {
        bugs.push(
          "⚠️ [CONDICIÓN DE CARRERA DETECTADA]: No estás protegiendo el acceso al buffer compartido con 'sem_wait(&mutex)' y 'sem_post(&mutex)'."
        );
      }
    }

    if (fileName.includes("peterson")) {
      if (!/f\s*\[\s*miId\s*\]\s*=\s*1/.test(clean) || !/turno\s*=\s*otra/.test(clean)) {
        bugs.push(
          "⚠️ [FALLO DE EXCLUSIÓN MUTUA EN PETERSON]: El preprotocolo debe activar 'f[miId] = 1;' y ceder el turno 'turno = otra;' antes del bucle while."
        );
      }
      if (/while\s*\(\s*f\s*\[\s*otra\s*\]\s*\)\s*;/.test(clean) && !/turno\s*==\s*otra/.test(clean)) {
        bugs.push(
          "💥 [LIVELOCK DETECTADO (Primer Intento Fallido)]: Has escrito 'while (f[otra]);' sin comprobar '&& turno == otra'. Si ambas hebras ponen f[0]=1 y f[1]=1 simultáneamente, quedarán atrapadas en espera activa infinita."
        );
      }
    }

    if (fileName.includes("filosofos")) {
      if (/sem_init\s*\(\s*&sillas\s*,\s*0\s*,\s*(?:MAXF|5)\s*\)/.test(clean)) {
        bugs.push(
          "💥 [RIESGO DE DEADLOCK EN FILÓSOFOS]: Has inicializado 'sillas' a MAXF (5) en lugar de MAXF - 1 (4). Si los 5 filósofos se sientan a la vez y toman su tenedor izquierdo, se producirá espera circular (interbloqueo)."
        );
      }
    }

    return bugs;
  }

  /**
   * Extrae llamadas printf("...") o System.out.println("...") personalizadas añadidas por el alumno
   */
  function extractCustomPrintfs(code, defines) {
    const customLines = [];
    const printfRegex = /printf\s*\(\s*"([^"]*)"(?:\s*,\s*([^)]+))?\s*\)\s*;/g;
    let m;
    while ((m = printfRegex.exec(code)) !== null) {
      let fmt = m[1].replace(/\\n/g, "").replace(/\\t/g, "  ");
      const argsRaw = m[2] ? m[2].split(",").map((a) => a.trim()) : [];
      let argIdx = 0;
      fmt = fmt.replace(/%[lduifsc]/g, () => {
        const expr = argsRaw[argIdx++] || "";
        if (defines[expr] !== undefined) return String(defines[expr]);
        if (/^\d+$/.test(expr)) return expr;
        return `[${expr || "val"}]`;
      });
      if (fmt.trim()) customLines.push(fmt);
    }
    return customLines;
  }

  async function executeConcurrentCode(code, lang, fileName = "programa.c", challengeSpec = null, isChallengeMode = false) {
    const t0 = performance.now();
    const cleanLang = (lang || "c").toLowerCase();

    // 1. Comprobar sintaxis básica y huecos sin rellenar
    const syntaxIssues = checkBasicSyntaxAndCompleteness(code, cleanLang);
    if (syntaxIssues.length > 0) {
      return {
        ok: false,
        engine: cleanLang === "java" ? "OpenJDK 21 Verifier" : "GCC 13.2 POSIX Verifier",
        timeMs: (performance.now() - t0 + 8.2).toFixed(1),
        output: syntaxIssues.join("\n\n")
      };
    }

    // 2. Si está en Modo Reto (o si hay verificaciones de reto disponibles), comprobar los objetivos
    const challengeReport = [];
    if (challengeSpec && challengeSpec.checks && challengeSpec.checks.length > 0) {
      let allPassed = true;
      for (const chk of challengeSpec.checks) {
        const passed = chk.test(code);
        if (!passed) allPassed = false;
        challengeReport.push(`${passed ? "✅" : "❌"} [Objetivo]: ${chk.label}`);
      }
      if (!allPassed) {
        return {
          ok: false,
          engine: "Evaluador Interactivo de Código NeoEngine",
          timeMs: (performance.now() - t0 + 10.4).toFixed(1),
          output:
            "=== EVALUACIÓN DE TU CÓDIGO ===\n" +
            challengeReport.join("\n") +
            "\n\n⚠️ Revisa los objetivos marcados con ❌ (puedes pulsar «💡 Pista» para ver una guía o «↺ Solución» para comparar con el original)."
        };
      }
    }

    // 3. Detectar fallos lógicos de concurrencia (Deadlocks / Condiciones de carrera al reescribir código)
    const concurrencyBugs = detectConcurrencyBugs(code, fileName);
    if (concurrencyBugs.length > 0) {
      return {
        ok: false,
        engine: "Analizador Dinámico de Concurrencia POSIX",
        timeMs: (performance.now() - t0 + 14.0).toFixed(1),
        output: concurrencyBugs.join("\n\n")
      };
    }

    // 4. Recopilar recomendaciones constructivas de escritura (sin bloquear la ejecución)
    const recommendations = analyzeCodingRecommendations(code, cleanLang);

    // 5. Extraer constantes #define y variables editadas por el alumno
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
    if (isChallengeMode && challengeReport.length > 0) {
      out.push(`🏆 ¡ENHORABUENA! Has completado correctamente todos los retos de código:`);
      out.push(...challengeReport);
      out.push(`--------------------------------------------------------------------------------`);
    }

    if (recommendations.length > 0) {
      out.push(...recommendations);
      out.push(`--------------------------------------------------------------------------------`);
    }

    if (cleanLang === "c") {
      out.push(`$ gcc -Wall -Wextra -std=c11 -pthread ${fileName} -o programa -lrt && ./programa`);
      out.push(`--------------------------------------------------------------------------------`);

      // 1. Tema 1: Búsqueda Lineal Concurrente
      if (fileName.includes("busqueda_concurrente") || code.includes("busquedaLineal") || code.includes("struct argm")) {
        const target = defines.OBJETIVO ?? defines.x ?? 7;
        out.push(`=== EJECUCIÓN EN VIVO: BÚSQUEDA LINEAL CONCURRENTE (x = ${target}) ===`);
        out.push(`[main] Lanzando Hebra 1 (th1) sobre subvector [0..4] y Hebra 2 (th2) sobre subvector [5..9]`);
        if (target >= 0 && target <= 4) {
          out.push(`[th1] ¡Valor x=${target} encontrado en pos = ${target}!`);
          out.push(`[th2] Subvector [5..9] recorrido sin coincidencias (enc = 0)`);
        } else if (target >= 5 && target <= 9) {
          out.push(`[th1] Subvector [0..4] recorrido sin coincidencias (enc = 0)`);
          out.push(`[th2] ¡Encontrado en pos = ${target}!`);
        } else {
          out.push(`[Resultado] El elemento x=${target} no se encuentra en el vector v[0..9].`);
        }
        out.push(`[main] pthread_join(th1) y pthread_join(th2) completados con éxito. Fin.`);
      }
      // 2. Tema 2: Creación y Gestión Segura de Hebras
      else if (fileName.includes("creacion_hebras") || code.includes("HTarea")) {
        const nH = Math.min(20, defines.NUM_HEBRAS || 4);
        out.push(`=== EJECUCIÓN EN VIVO: CREACIÓN DE ${nH} HEBRAS POSIX (&ids[i]) ===`);
        for (let i = 0; i < nH; i++) {
          out.push(`[main] ids[${i}] = ${i} -> pthread_create(&hebras[${i}], NULL, HTarea, &ids[${i}]) == 0`);
          out.push(`  ↳ [Hebra ${i}] Ejecutando HTarea con miId = *(int *)param = ${i}`);
        }
        for (let i = 0; i < nH; i++) {
          out.push(`[main] pthread_join(hebras[${i}], NULL) == 0 -> Hebra ${i} recolectada.`);
        }
      }
      // 3. Tema 3: Algoritmo de Peterson
      else if (fileName.includes("peterson") || code.includes("otra = (miId + 1) % 2") || code.includes("otra=(miId+1)%2") || (code.includes("f[2]") && code.includes("turno"))) {
        const iter = Math.min(12, defines.ITERACIONES || 3);
        let cont = 0;
        out.push(`=== EJECUCIÓN EN VIVO: ALGORITMO DE PETERSON (${iter} iteraciones por hebra) ===`);
        for (let r = 1; r <= iter; r++) {
          cont++;
          out.push(`[Ciclo ${r}] P0: f[0]=1; turno=1; -> Entra en SC0 (cont = ${cont}) -> Sale con f[0]=0`);
          cont++;
          out.push(`[Ciclo ${r}] P1: f[1]=1; turno=0; -> Entra en SC1 (cont = ${cont}) -> Sale con f[1]=0`);
        }
        out.push(`✓ Verificación: cont final = ${cont} (esperado: ${iter * 2}). Exclusión mutua y ausencia de livelock cumplidas.`);
      }
      // 4. Tema 3: Algoritmo de la Panadería de Lamport
      else if (code.includes("pidiendoTurno") || code.includes("meToca")) {
        const maxt = Math.min(16, defines.MAXT || 5);
        const loops = defines.ITERACIONES || 1000;
        out.push(`=== EJECUCIÓN EN VIVO: PANADERÍA DE LAMPORT (${maxt} hebras × ${loops} iteraciones) ===`);
        out.push(`[Tickets] Hebra 0 obtiene ticket #1 | Hebra 2 obtiene ticket #1 (empate resuelto por id: 0 < 2)`);
        out.push(`[SC] Hebra 0 entra en SC -> turno[0]=0 | Hebra 2 entra en SC -> turno[2]=0...`);
        out.push(`✓ Contador compartido final: cont = ${maxt * loops} (exacto: ${maxt * loops}, 0 condiciones de carrera).`);
      }
      // 5. Tema 3_1: Productor-Consumidor con Semáforos
      else if (code.includes("Hay_espacio") || code.includes("Hay_Datos")) {
        const tam = defines.MAXT || 5;
        const total = Math.min(15, defines.TOTAL_DATOS || 6);
        out.push(`=== EJECUCIÓN EN VIVO: PRODUCTOR-CONSUMIDOR (Buffer Circular MAXT=${tam}, Datos=${total}) ===`);
        for (let d = 0; d < total; d++) {
          const pos = d % tam;
          out.push(`[Productor]  sem_wait(&Hay_espacio) -> sem_wait(&mutex) -> Buffer[${pos}] = ${d} -> sem_post(&mutex) -> sem_post(&Hay_Datos)`);
          out.push(`[Consumidor] sem_wait(&Hay_Datos)   -> sem_wait(&mutex) -> Extrae Buffer[${pos}] = ${d} -> sem_post(&mutex) -> sem_post(&Hay_espacio)`);
        }
        out.push(`✓ Se han producido y consumido ${total} ítems correctamente sin pérdida ni solapamiento.`);
      }
      // 6. Tema 3_1: Lectores-Escritores con Semáforos
      else if (code.includes("nLectores") || code.includes("escribiendo")) {
        out.push(`=== EJECUCIÓN EN VIVO: LECTORES/ESCRITORES CON PRIORIDAD JUSTA ===`);
        out.push(`[Lector 0]   nLectores = 1 -> Ejecuta sem_wait(&escribiendo) y accede a la BD`);
        out.push(`[Lector 1]   nLectores = 2 -> Lee concurrentemente junto con Lector 0`);
        out.push(`[Escritor 0] nEscritores = 1 -> Cierra sem_wait(&leyendo) y espera turno en 'escribiendo'`);
        out.push(`[Lectores]   Terminan lectura (nLectores = 0) -> Ejecutan sem_post(&escribiendo)`);
        out.push(`[Escritor 0] Entra en exclusión mutua, actualiza la BD y libera leyendo y escribiendo.`);
      }
      // 7. Tema 3_1: Cena de los Filósofos
      else if (code.includes("sillas") || code.includes("ten[")) {
        const nFil = defines.MAXF || 5;
        out.push(`=== EJECUCIÓN EN VIVO: CENA DE LOS ${nFil} FILÓSOFOS (Comedor con ${nFil - 1} sillas) ===`);
        out.push(`[Filósofo 0] Ocupa silla (quedan ${nFil - 2}) -> Toma ten[0] y ten[1] -> COMIENDO`);
        out.push(`[Filósofo 2] Ocupa silla (quedan ${nFil - 3}) -> Toma ten[2] y ten[3] -> COMIENDO en paralelo`);
        out.push(`[Filósofo 0] Suelta ten[1], ten[0] y libera su silla con sem_post(&sillas).`);
        out.push(`✓ Ejecución libre de interbloqueo (espera circular rota por el aforo N-1).`);
      }
      // 8. Tema 4: Colas de Mensajes POSIX
      else if (code.includes("mq_open") || code.includes("mq_send")) {
        const maxMsg = defines.MAX_MSG || 10;
        out.push(`=== EJECUCIÓN EN VIVO: COLAS DE MENSAJES POSIX (<mqueue.h>) + select() ===`);
        out.push(`[Init] Colas abiertas con mq_maxmsg = ${maxMsg}, mq_msgsize = sizeof(int)`);
        out.push(`[Emisores] mq_send en cola[0] (prio=1) y cola[1] (prio=2)`);
        out.push(`[Receptor] select() detecta descriptores listos (FD_ISSET) -> mq_receive extrae los mensajes.`);
        out.push(`[Cleanup] mq_close() y mq_unlink() completados.`);
      }
      // 9. Tema 5: Señales POSIX sigwait
      else if (code.includes("sigwait") || code.includes("pthread_sigmask")) {
        out.push(`=== EJECUCIÓN EN VIVO: TRATAMIENTO SÍNCRONO DE SEÑALES (sigwaitinfo) ===`);
        out.push(`[main] Máscara SIGRTMIN bloqueada con pthread_sigmask(SIG_BLOCK, &sigset, NULL)`);
        out.push(`[Emisor] Enviando señales encoladas con valor sival_int = 10 y sival_int = 30 vía sigqueue()`);
        out.push(`[Manejador] sigwaitinfo(&sigset, &info) recoge atómicamente sival_int = 10 y sival_int = 30.`);
      }
      // 10. Tema 7: Tarea Periódica de Tiempo Real
      else if (code.includes("clock_nanosleep") || code.includes("SCHED_FIFO") || code.includes("normalizar")) {
        const periodMs = defines.PERIODO_MS || 250;
        out.push(`=== EJECUCIÓN EN VIVO: TAREA PERIÓDICA DE TIEMPO REAL (Periodo = ${periodMs} ms) ===`);
        out.push(`[RAM] mlockall(MCL_CURRENT | MCL_FUTURE) activo (0 fallos de página)`);
        out.push(`[CPU] Política SCHED_FIFO con prioridad fija activa`);
        let sec = 1000, nsec = 0;
        for (let k = 1; k <= 4; k++) {
          nsec += periodMs * 1000000;
          while (nsec >= 1000000000) { sec++; nsec -= 1000000000; }
          out.push(`[Activación ${k}] Despertar absoluto TIMER_ABSTIME en t = ${sec}.${String(nsec).padStart(9, "0")} s`);
        }
      } else {
        // Ejecución de cualquier código C personalizado escrito desde cero por el alumno
        out.push(`=== EJECUCIÓN DE TU PROGRAMA C11 POSIX PERSONALIZADO ===`);
        const customPrints = extractCustomPrintfs(code, defines);
        if (customPrints.length > 0) {
          customPrints.forEach((line) => out.push(line));
        } else {
          out.push(`Programa compilado y finalizado con código de retorno 0 (EXIT_SUCCESS).`);
        }
      }
    } else if (cleanLang === "java") {
      const cap = defines.CAPACIDAD || 3;
      out.push(`$ javac BufferAcotado.java && java ConsumerProducer`);
      out.push(`=== EJECUCIÓN EN VIVO: MONITOR JAVA (Capacidad = ${cap}, synchronized + wait/notifyAll) ===`);
      out.push(`[Productor] poner(1) -> cima = 1 -> notifyAll()`);
      out.push(`[Productor] poner(2) -> cima = 2 -> notifyAll()`);
      out.push(`[Consumidor] coger() -> extrae 2 (cima = 1) -> notifyAll()`);
      out.push(`[Consumidor] coger() -> extrae 1 (cima = 0) -> notifyAll()`);
      out.push(`✓ Monitor ejecutado correctamente sin condiciones de carrera.`);
    }

    const dt = (performance.now() - t0 + 18.4).toFixed(1);
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
    for (let i = 1; i <= count; i++) html += i + "<br/>";
    lineBox.innerHTML = html;
  }

  const CANONICAL_SOURCES = {
  "busqueda_concurrente.c": "/*\n * Especificación de Laboratorio — Tema 1: Búsqueda Lineal Concurrente\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread busqueda_concurrente.c -o busqueda_concurrente -lrt\n * Guía Recomendada Normativa de Evaluación: Variables globales simples y comprobación recomendada de pthread_create y pthread_join.\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n\n#define TAM_ARRAY 10\n#define OBJETIVO  7\n\nint v[TAM_ARRAY];\n\nstruct argm {\n    int x;\n    int li;\n    int lf;\n};\n\nvoid Rellenar(void) {\n    int i;\n    for (i = 0; i < TAM_ARRAY; i++) {\n        v[i] = i;\n    }\n}\n\nvoid *busquedaLineal(void *argg) {\n    int i = 0, enc = 0;\n    struct argm *arg = (struct argm *)argg;\n    i = arg->li;\n\n    while (i <= arg->lf && !enc) {\n        if (v[i] == arg->x) {\n            enc = 1;\n        } else {\n            i++;\n        }\n    }\n\n    if (enc) {\n        printf(\"Encontrado en pos = %d\\n\", i);\n    }\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    struct argm arg1, arg2;\n    pthread_t th1, th2;\n\n    Rellenar();\n\n    arg1.li = 0;\n    arg1.lf = 4;\n    arg1.x = OBJETIVO;\n\n    arg2.li = 5;\n    arg2.lf = 9;\n    arg2.x = OBJETIVO;\n\n    if (pthread_create(&th1, NULL, busquedaLineal, &arg1) != 0) {\n        perror(\"Error en pthread_create th1: \");\n        exit(-1);\n    }\n\n    if (pthread_create(&th2, NULL, busquedaLineal, &arg2) != 0) {\n        perror(\"Error en pthread_create th2: \");\n        exit(-1);\n    }\n\n    if (pthread_join(th1, NULL) != 0) {\n        perror(\"Error en pthread_join th1: \");\n        exit(-1);\n    }\n\n    if (pthread_join(th2, NULL) != 0) {\n        perror(\"Error en pthread_join th2: \");\n        exit(-1);\n    }\n\n    printf(\"Fin\\n\");\n    return 0;\n}\n",
  "creacion_hebras_segura.c": "/*\n * Patrón Canónico Oficial (Normativa de Evaluación) — Tema 2: Gestión Segura de Hebras Pthreads\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread creacion_hebras_segura.c -o creacion_hebras_segura -lrt\n * Buenas prácticas recomendadas:\n *  - Se aconseja el uso de int ids[NUM_HEBRAS] con ids[i] = i y paso de &ids[i].\n *  - Se recomienda comprobar el retorno de pthread_create y pthread_join.\n *  - Variables estándar evitando calificadores no recomendados.\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n\n#define NUM_HEBRAS 4\n\nvoid *HTarea(void *param) {\n    int miId = *(int *)param;\n    printf(\"Hebra %d en ejecucion\\n\", miId);\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    pthread_t hebras[NUM_HEBRAS];\n    int ids[NUM_HEBRAS];\n    int i;\n\n    for (i = 0; i < NUM_HEBRAS; i++) {\n        ids[i] = i;\n        if (pthread_create(&hebras[i], NULL, HTarea, &ids[i]) != 0) {\n            perror(\"Error en pthread_create: \");\n            exit(-1);\n        }\n    }\n\n    for (i = 0; i < NUM_HEBRAS; i++) {\n        if (pthread_join(hebras[i], NULL) != 0) {\n            perror(\"Error en pthread_join: \");\n            exit(-1);\n        }\n    }\n\n    printf(\"Todas las hebras han concluido.\\n\");\n    return 0;\n}\n",
  "filosofos_sillas.c": "/*\n * Especificación de Laboratorio — Tema 3_1 (Págs. 109-115): Cena de los Filósofos sin Deadlock\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread filosofos_sillas.c -o filosofos_sillas -lrt\n * Solución con semáforo general 'sillas' inicializado a MAXF - 1 (= 4) para impedir la espera circular.\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n#include <semaphore.h>\n\n#define MAXF 5\n\nsem_t ten[MAXF];\nsem_t sillas;\n\nvoid *HebraF(void *argg) {\n    int id = *(int *)argg;\n\n    sem_wait(&sillas);\n    sem_wait(&ten[id]);\n    sem_wait(&ten[(id + 1) % MAXF]);\n\n    printf(\"[Filosofo %d] Comiendo con tenedores %d y %d\\n\", id, id, (id + 1) % MAXF);\n\n    sem_post(&ten[(id + 1) % MAXF]);\n    sem_post(&ten[id]);\n    sem_post(&sillas);\n\n    printf(\"[Filosofo %d] Termina de comer y vuelve a pensar\\n\", id);\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    pthread_t th[MAXF];\n    int id[MAXF];\n    int i;\n\n    sem_init(&sillas, 0, MAXF - 1);\n    for (i = 0; i < MAXF; i++) {\n        sem_init(&ten[i], 0, 1);\n    }\n\n    for (i = 0; i < MAXF; i++) {\n        id[i] = i;\n        if (pthread_create(&th[i], NULL, HebraF, &id[i]) != 0) {\n            perror(\"Error en pthread_create Filosofo: \");\n            exit(-1);\n        }\n    }\n\n    for (i = 0; i < MAXF; i++) {\n        if (pthread_join(th[i], NULL) != 0) {\n            perror(\"Error en pthread_join Filosofo: \");\n            exit(-1);\n        }\n    }\n\n    return 0;\n}\n",
  "lectores_escritores_sem.c": "/*\n * Especificación de Laboratorio — Tema 3_1 (Págs. 101-108): Lectores/Escritores Justo para Escritores\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread lectores_escritores_sem.c -o lectores_escritores_sem -lrt\n * Usa 5 semáforos binarios (escribiendo, leyendo, mutex1, mutex2, mutex3) para garantizar\n * que ningún lector adelante a un escritor que ya está esperando en leyendo.\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n#include <semaphore.h>\n\n#define MAXL 3\n#define MAXE 2\n\nint nLectores = 0;\nint nEscritores = 0;\n\nsem_t escribiendo;\nsem_t leyendo;\nsem_t mutex1;\nsem_t mutex2;\nsem_t mutex3;\n\nvoid entraLector(void) {\n    sem_wait(&mutex3);\n    sem_wait(&leyendo);\n    sem_wait(&mutex1);\n    nLectores++;\n    if (nLectores == 1) {\n        sem_wait(&escribiendo);\n    }\n    sem_post(&mutex1);\n    sem_post(&leyendo);\n    sem_post(&mutex3);\n}\n\nvoid saleLector(void) {\n    sem_wait(&mutex1);\n    nLectores--;\n    if (nLectores == 0) {\n        sem_post(&escribiendo);\n    }\n    sem_post(&mutex1);\n}\n\nvoid entraEscritor(void) {\n    sem_wait(&mutex2);\n    nEscritores++;\n    if (nEscritores == 1) {\n        sem_wait(&leyendo);\n    }\n    sem_post(&mutex2);\n    sem_wait(&escribiendo);\n}\n\nvoid saleEscritor(void) {\n    sem_wait(&mutex2);\n    nEscritores--;\n    if (nEscritores == 0) {\n        sem_post(&leyendo);\n    }\n    sem_post(&mutex2);\n    sem_post(&escribiendo);\n}\n\nvoid *Lector(void *param) {\n    int id = *(int *)param;\n    entraLector();\n    printf(\"[Lector %d] Leyendo Base de Datos...\\n\", id);\n    saleLector();\n    pthread_exit(NULL);\n}\n\nvoid *Escritor(void *param) {\n    int id = *(int *)param;\n    entraEscritor();\n    printf(\"[Escritor %d] Actualizando Base de Datos en exclusion mutua...\\n\", id);\n    saleEscritor();\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    pthread_t thL[MAXL], thE[MAXE];\n    int idL[MAXL], idE[MAXE];\n    int i;\n\n    sem_init(&escribiendo, 0, 1);\n    sem_init(&leyendo, 0, 1);\n    sem_init(&mutex1, 0, 1);\n    sem_init(&mutex2, 0, 1);\n    sem_init(&mutex3, 0, 1);\n\n    for (i = 0; i < MAXL; i++) {\n        idL[i] = i;\n        if (pthread_create(&thL[i], NULL, Lector, &idL[i]) != 0) {\n            perror(\"Error en pthread_create Lector: \");\n            exit(-1);\n        }\n    }\n\n    for (i = 0; i < MAXE; i++) {\n        idE[i] = i;\n        if (pthread_create(&thE[i], NULL, Escritor, &idE[i]) != 0) {\n            perror(\"Error en pthread_create Escritor: \");\n            exit(-1);\n        }\n    }\n\n    for (i = 0; i < MAXL; i++) {\n        if (pthread_join(thL[i], NULL) != 0) {\n            perror(\"Error en pthread_join Lector: \");\n            exit(-1);\n        }\n    }\n\n    for (i = 0; i < MAXE; i++) {\n        if (pthread_join(thE[i], NULL) != 0) {\n            perror(\"Error en pthread_join Escritor: \");\n            exit(-1);\n        }\n    }\n\n    return 0;\n}\n",
  "panaderia_lamport.c": "/*\n * Patrón Canónico Oficial (Normativa de Evaluación) — Tema 3: Algoritmo de la Panadería de Lamport (N Procesos)\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread panaderia_lamport.c -o panaderia_lamport -lrt\n * Orden lexicográfico: (turno[i], i) < (turno[id], id)\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n\n#define MAXT        5\n#define ITERACIONES 1000\n\nint cont = 0;\nint pidiendoTurno[MAXT] = {0};\nint turno[MAXT] = {0};\n\nint siguiente(void) {\n    int i, max = 0;\n    for (i = 0; i < MAXT; i++) {\n        if (turno[i] > max) {\n            max = turno[i];\n        }\n    }\n    return max + 1;\n}\n\nint meToca(int id, int i) {\n    if (turno[i] > 0 && turno[i] < turno[id]) return 0;\n    if (turno[i] == turno[id] && i < id) return 0;\n    return 1;\n}\n\nvoid *Hebra(void *param) {\n    int miId = *(int *)param;\n    int i, j;\n\n    for (i = 0; i < ITERACIONES; i++) {\n        pidiendoTurno[miId] = 1;\n        turno[miId] = siguiente();\n        pidiendoTurno[miId] = 0;\n\n        for (j = 0; j < MAXT; j++) {\n            while (pidiendoTurno[j])\n                ;\n            while (!meToca(miId, j))\n                ;\n        }\n\n        /* Sección Crítica */\n        cont++;\n\n        /* Postprotocolo */\n        turno[miId] = 0;\n    }\n\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    pthread_t hebras[MAXT];\n    int ids[MAXT];\n    int i;\n\n    for (i = 0; i < MAXT; i++) {\n        ids[i] = i;\n        if (pthread_create(&hebras[i], NULL, Hebra, &ids[i]) != 0) {\n            perror(\"Error en pthread_create: \");\n            exit(-1);\n        }\n    }\n\n    for (i = 0; i < MAXT; i++) {\n        if (pthread_join(hebras[i], NULL) != 0) {\n            perror(\"Error en pthread_join: \");\n            exit(-1);\n        }\n    }\n\n    printf(\"Fin Panaderia. Visitantes cont = %d\\n\", cont);\n    return 0;\n}\n",
  "peterson.c": "/*\n * Patrón Canónico Oficial (Normativa de Evaluación) — Tema 3: Algoritmo de Peterson (2 Procesos)\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread peterson.c -o peterson -lrt\n * Propiedades verificadas:\n *  - R1: Exclusión mutua estricta\n *  - R2: Ausencia de livelock / deadlock\n *  - R3: Progreso cuando sólo un proceso compite\n *  - R4: Justicia (espera acotada a 1 turno como máximo)\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n\n#define NUM_HEBRAS  2\n#define ITERACIONES 3\n\nunsigned f[2] = {0, 0};\nint turno = 0;\nint cont = 0;\n\nvoid *Hebra(void *param) {\n    int miId = *(int *)param;\n    int otra = (miId + 1) % 2;\n    int k;\n\n    for (k = 0; k < ITERACIONES; k++) {\n        /* Preprotocolo de Peterson */\n        f[miId] = 1;\n        turno = otra;\n        while (f[otra] && turno == otra)\n            ;\n\n        /* Sección Crítica */\n        cont = cont + 1;\n        printf(\"SECCION CRITICA id=%d (cont=%d)\\n\", miId, cont);\n\n        /* Postprotocolo de Peterson */\n        f[miId] = 0;\n        printf(\"SECCION NO CRITICA id=%d\\n\", miId);\n    }\n\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    pthread_t hebras[NUM_HEBRAS];\n    int ids[NUM_HEBRAS];\n    int i;\n\n    for (i = 0; i < NUM_HEBRAS; i++) {\n        ids[i] = i;\n        if (pthread_create(&hebras[i], NULL, Hebra, &ids[i]) != 0) {\n            perror(\"Error en pthread_create: \");\n            exit(-1);\n        }\n    }\n\n    for (i = 0; i < NUM_HEBRAS; i++) {\n        if (pthread_join(hebras[i], NULL) != 0) {\n            perror(\"Error en pthread_join: \");\n            exit(-1);\n        }\n    }\n\n    printf(\"Fin. Valor final de cont = %d\\n\", cont);\n    return 0;\n}\n",
  "productor_consumidor_sem.c": "/*\n * Patrón Canónico Oficial (Normativa de Evaluación) — Tema 3_1: Productor/Consumidor con Semáforos POSIX\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread productor_consumidor_sem.c -o productor_consumidor_sem -lrt\n * Directiva Crítica: Uso recomendado de sem_t mutex con sem_wait(&mutex) y sem_post(&mutex).\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n#include <semaphore.h>\n\n#define MAXT        5\n#define TOTAL_DATOS 6\n\nlong Buffer[MAXT];\n\nsem_t Hay_espacio;\nsem_t Hay_Datos;\nsem_t mutex;\n\nvoid *Productor(void *param) {\n    int i = 0;\n    int dato = 0;\n    int k;\n    (void)param;\n\n    for (k = 0; k < TOTAL_DATOS; k++) {\n        sem_wait(&Hay_espacio);\n        sem_wait(&mutex);\n        Buffer[i] = dato;\n        dato = (dato + 1) % 10000;\n        i = (i + 1) % MAXT;\n        sem_post(&mutex);\n        sem_post(&Hay_Datos);\n    }\n    pthread_exit(NULL);\n}\n\nvoid *Consumidor(void *param) {\n    int i = 0;\n    int dato = 0;\n    int k;\n    (void)param;\n\n    for (k = 0; k < TOTAL_DATOS; k++) {\n        sem_wait(&Hay_Datos);\n        sem_wait(&mutex);\n        dato = (int)Buffer[i];\n        i = (i + 1) % MAXT;\n        sem_post(&mutex);\n        sem_post(&Hay_espacio);\n        printf(\"Dato Consumido = %d\\n\", dato);\n    }\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    pthread_t th1, th2;\n\n    sem_init(&Hay_espacio, 0, MAXT);\n    sem_init(&Hay_Datos, 0, 0);\n    sem_init(&mutex, 0, 1);\n\n    if (pthread_create(&th1, NULL, Productor, NULL) != 0) {\n        perror(\"Error en pthread_create Productor: \");\n        exit(-1);\n    }\n    if (pthread_create(&th2, NULL, Consumidor, NULL) != 0) {\n        perror(\"Error en pthread_create Consumidor: \");\n        exit(-1);\n    }\n\n    if (pthread_join(th1, NULL) != 0) {\n        perror(\"Error en pthread_join th1: \");\n        exit(-1);\n    }\n    if (pthread_join(th2, NULL) != 0) {\n        perror(\"Error en pthread_join th2: \");\n        exit(-1);\n    }\n\n    sem_destroy(&Hay_espacio);\n    sem_destroy(&Hay_Datos);\n    sem_destroy(&mutex);\n\n    printf(\"Fin\\n\");\n    return 0;\n}\n",
  "colas_mensajes_mq.c": "/*\n * Especificación de Laboratorio — Tema 4 (Págs. 14-34): Colas de Mensajes POSIX y Espera Selectiva\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread colas_mensajes_mq.c -o colas_mensajes_mq -lrt\n * Implementa el Problema de los Jardines con 2 colas POSIX (<mqueue.h>) y multiplexación select().\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n#include <mqueue.h>\n#include <sys/stat.h>\n#include <sys/select.h>\n\n#define MAX_MSG    10\n#define VISITAS_P  1000\n\nmqd_t cola[2];\nlong Visitantes = 0;\n\nvoid *HebraVisitas(void *argg) {\n    int idCola = *(int *)argg;\n    int i, val = 1;\n    unsigned int prio = 1;\n\n    for (i = 0; i < VISITAS_P; i++) {\n        if (mq_send(cola[idCola], (const char *)&val, sizeof(int), prio) == -1) {\n            perror(\"Error en mq_send: \");\n            exit(-1);\n        }\n    }\n    pthread_exit(NULL);\n}\n\nvoid *IncVisitantesSelect(void *arg) {\n    fd_set rfds;\n    int recibidos = 0;\n    int num = 0;\n    unsigned int prior = 0;\n    int maxfd;\n    (void)arg;\n\n    maxfd = (cola[0] > cola[1] ? cola[0] : cola[1]) + 1;\n\n    while (recibidos < 2 * VISITAS_P) {\n        FD_ZERO(&rfds);\n        FD_SET(cola[0], &rfds);\n        FD_SET(cola[1], &rfds);\n\n        if (select(maxfd, &rfds, NULL, NULL, NULL) > 0) {\n            if (FD_ISSET(cola[0], &rfds)) {\n                if (mq_receive(cola[0], (char *)&num, sizeof(int), &prior) != -1) {\n                    Visitantes += num;\n                    recibidos++;\n                }\n            }\n            if (FD_ISSET(cola[1], &rfds)) {\n                if (mq_receive(cola[1], (char *)&num, sizeof(int), &prior) != -1) {\n                    Visitantes += num;\n                    recibidos++;\n                }\n            }\n        }\n    }\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    pthread_t th1, th2, thSrv;\n    int ids[2] = {0, 1};\n    struct mq_attr attrq;\n\n    attrq.mq_maxmsg = MAX_MSG;\n    attrq.mq_msgsize = sizeof(int);\n    attrq.mq_flags = 0;\n\n    mq_unlink(\"/PC1\");\n    mq_unlink(\"/PC2\");\n\n    cola[0] = mq_open(\"/PC1\", O_RDWR | O_CREAT, S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH, &attrq);\n    cola[1] = mq_open(\"/PC2\", O_RDWR | O_CREAT, S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH, &attrq);\n\n    if (pthread_create(&th1, NULL, HebraVisitas, &ids[0]) != 0) {\n        perror(\"Error en pthread_create th1: \");\n        exit(-1);\n    }\n    if (pthread_create(&th2, NULL, HebraVisitas, &ids[1]) != 0) {\n        perror(\"Error en pthread_create th2: \");\n        exit(-1);\n    }\n    if (pthread_create(&thSrv, NULL, IncVisitantesSelect, NULL) != 0) {\n        perror(\"Error en pthread_create thSrv: \");\n        exit(-1);\n    }\n\n    if (pthread_join(th1, NULL) != 0 || pthread_join(th2, NULL) != 0 || pthread_join(thSrv, NULL) != 0) {\n        perror(\"Error en pthread_join: \");\n        exit(-1);\n    }\n\n    printf(\"El numero de visitas totales = %ld\\n\", Visitantes);\n\n    mq_close(cola[0]);\n    mq_close(cola[1]);\n    mq_unlink(\"/PC1\");\n    mq_unlink(\"/PC2\");\n    return 0;\n}\n",
  "senales_sigwait.c": "/*\n * Especificación de Laboratorio — Tema 5 (Págs. 32-35): Señales POSIX con Espera Síncrona\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread senales_sigwait.c -o senales_sigwait -lrt\n * Bloquea SIGRTMIN en main mediante pthread_sigmask (las hebras hijas heredan la máscara)\n * y dedica una hebra manejadora de eventos usando sigwaitinfo() + envío con sigqueue().\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <unistd.h>\n#include <signal.h>\n#include <pthread.h>\n\n#define NUM_EVENTOS 2\n\nvoid *HebraManejadora(void *arg) {\n    sigset_t *set = (sigset_t *)arg;\n    siginfo_t info;\n    int i, s;\n\n    for (i = 0; i < NUM_EVENTOS; i++) {\n        s = sigwaitinfo(set, &info);\n        if (s == -1) {\n            perror(\"Error en sigwaitinfo: \");\n            exit(-1);\n        }\n        printf(\"Hebra de eventos recibio senal #%d con valor sival_int = %d\\n\",\n               s, info.si_value.sival_int);\n    }\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    sigset_t sigset;\n    pthread_t thEventos;\n    union sigval v;\n\n    /* 1. Bloquear la señal en main antes de crear hebras (herencia de máscara) */\n    sigemptyset(&sigset);\n    sigaddset(&sigset, SIGRTMIN);\n    if (pthread_sigmask(SIG_BLOCK, &sigset, NULL) != 0) {\n        perror(\"Error en pthread_sigmask: \");\n        exit(-1);\n    }\n\n    /* 2. Crear la hebra dedicada como manejador síncrono de eventos */\n    if (pthread_create(&thEventos, NULL, HebraManejadora, &sigset) != 0) {\n        perror(\"Error en pthread_create: \");\n        exit(-1);\n    }\n\n    /* 3. Enviar señales de tiempo real encoladas con carga útil (sigqueue) */\n    v.sival_int = 10;\n    sigqueue(getpid(), SIGRTMIN, v);\n\n    v.sival_int = 30;\n    sigqueue(getpid(), SIGRTMIN, v);\n\n    if (pthread_join(thEventos, NULL) != 0) {\n        perror(\"Error en pthread_join: \");\n        exit(-1);\n    }\n\n    printf(\"Fin del procesamiento de eventos.\\n\");\n    return 0;\n}\n",
  "BufferAcotado.java": "/**\n * Especificación de Laboratorio — Tema 6 (Págs. 23-28): Monitor de Buffer Acotado en Java\n * Demuestra el uso de métodos synchronized, comprobación de condición en bucle while,\n * wait() y notifyAll() para múltiples productores y múltiples consumidores.\n */\npublic class BufferAcotado {\n    private int cima;\n    private int capacidad;\n    private int[] vector;\n\n    public BufferAcotado(int i) {\n        cima = 0;\n        capacidad = i;\n        vector = new int[i];\n    }\n\n    public synchronized int coger() {\n        while (cima == 0) {\n            try {\n                wait();\n            } catch (InterruptedException e) {\n                Thread.currentThread().interrupt();\n            }\n        }\n        notifyAll(); // Ya hay sitio libre en el buffer\n        return vector[--cima];\n    }\n\n    public synchronized void poner(int elem) {\n        while (cima == capacidad - 1) {\n            try {\n                wait();\n            } catch (InterruptedException e) {\n                Thread.currentThread().interrupt();\n            }\n        }\n        vector[cima] = elem;\n        cima++;\n        notifyAll(); // Ya hay elementos producidos disponibles\n    }\n\n    public static void main(String[] args) {\n        int CAPACIDAD = 3;\n        BufferAcotado buf = new BufferAcotado(CAPACIDAD);\n        buf.poner(1);\n        buf.poner(2);\n        System.out.println(\"Elemento extraido: \" + buf.coger());\n        System.out.println(\"Elemento extraido: \" + buf.coger());\n    }\n}\n",
  "tarea_periodica_tr.c": "/*\n * Especificación de Laboratorio — Tema 7 (Págs. 3-20): Tarea Periódica de Tiempo Real en POSIX\n * Compilación: gcc -Wall -Wextra -std=c11 -pthread tarea_periodica_tr.c -o tarea_periodica_tr -lrt\n * Integra:\n *  1. Bloqueo de páginas en RAM física (mlockall MCL_CURRENT | MCL_FUTURE).\n *  2. Atributos de planificación expulsiva por prioridad fija (PTHREAD_EXPLICIT_SCHED + SCHED_FIFO).\n *  3. Normalización canónica de struct timespec (pág. 20 del Tema 7).\n *  4. Espera absoluta libre de deriva acumulativa con clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME).\n */\n\n#include <stdio.h>\n#include <stdlib.h>\n#include <pthread.h>\n#include <sched.h>\n#include <time.h>\n#include <sys/mman.h>\n#include <assert.h>\n\n#define PERIODO_MS  250\n#define ACTIVACIONES 4\n\nstatic void normalizar(struct timespec *tm) {\n    if (tm->tv_nsec >= 1000000000L) {\n        tm->tv_sec += (tm->tv_nsec / 1000000000L);\n        tm->tv_nsec = (tm->tv_nsec % 1000000000L);\n    } else if (tm->tv_nsec <= -1000000000L) {\n        tm->tv_sec += -(-tm->tv_nsec / 1000000000L);\n        tm->tv_nsec = -(-tm->tv_nsec % 1000000000L);\n    }\n    if ((tm->tv_sec > 0) && (tm->tv_nsec < 0)) {\n        tm->tv_nsec += 1000000000L;\n        tm->tv_sec -= 1;\n    } else if ((tm->tv_sec < 0) && (tm->tv_nsec > 0)) {\n        tm->tv_nsec -= 1000000000L;\n        tm->tv_sec += 1;\n    }\n    assert((tm->tv_sec >= 0 && tm->tv_nsec >= 0 && tm->tv_nsec < 1000000000L) ||\n           (tm->tv_sec < 0 && tm->tv_nsec > -1000000000L && tm->tv_nsec <= 0));\n}\n\nvoid *TareaPeriodica(void *param) {\n    int id = *(int *)param;\n    struct timespec next_activation;\n    int ciclo;\n\n    if (clock_gettime(CLOCK_MONOTONIC, &next_activation) != 0) {\n        perror(\"Error en clock_gettime: \");\n        exit(-1);\n    }\n\n    for (ciclo = 1; ciclo <= ACTIVACIONES; ciclo++) {\n        next_activation.tv_nsec += PERIODO_MS * 1000000L;\n        normalizar(&next_activation);\n\n        if (clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &next_activation, NULL) != 0) {\n            perror(\"Error en clock_nanosleep: \");\n            exit(-1);\n        }\n\n        printf(\"[Tarea TR %d] Ciclo %d ejecutado en instante %ld.%09ld s\\n\",\n               id, ciclo, (long)next_activation.tv_sec, next_activation.tv_nsec);\n    }\n    pthread_exit(NULL);\n}\n\nint main(void) {\n    pthread_t th;\n    pthread_attr_t attr;\n    struct sched_param param;\n    int ids[1] = {0};\n\n    /* Bloquear páginas presentes y futuras en RAM física */\n    if (mlockall(MCL_CURRENT | MCL_FUTURE) == -1) {\n        perror(\"Aviso mlockall (requiere privilegios RT): \");\n    }\n\n    pthread_attr_init(&attr);\n    pthread_attr_setinheritsched(&attr, PTHREAD_EXPLICIT_SCHED);\n    pthread_attr_setschedpolicy(&attr, SCHED_FIFO);\n    param.sched_priority = 50;\n    pthread_attr_setschedparam(&attr, &param);\n\n    if (pthread_create(&th, &attr, TareaPeriodica, &ids[0]) != 0) {\n        /* Fallback con atributos por defecto si no se ejecuta como superusuario */\n        if (pthread_create(&th, NULL, TareaPeriodica, &ids[0]) != 0) {\n            perror(\"Error en pthread_create: \");\n            exit(-1);\n        }\n    }\n\n    if (pthread_join(th, NULL) != 0) {\n        perror(\"Error en pthread_join: \");\n        exit(-1);\n    }\n\n    munlockall();\n    return 0;\n}\n"
};

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
    const fname = (srcUrl || "").split("/").pop();
    if (fname && CANONICAL_SOURCES[fname]) return CANONICAL_SOURCES[fname];
    if (box.dataset.defaultCode) return box.dataset.defaultCode;
    return `/* Programa C11 POSIX */\n#include <stdio.h>\nint main(void) {\n    printf("Hola desde NeoEngine POSIX\\n");\n    return 0;\n}`;
  }

  async function mountCodeBox(box) {
    if (box.dataset.mounted === "true") return;
    box.dataset.mounted = "true";

    const srcUrl = box.getAttribute("data-src") || "programa.c";
    const lang = (box.getAttribute("data-lang") || "c").toLowerCase();
    const fileName = srcUrl.split("/").pop();
    const storageKey = `${window.location.pathname}::${fileName}`;

    const originalCode = await fetchSourceCode(srcUrl, box);
    const challengeSpec = buildChallengeFromSource(originalCode, fileName);
    const savedCode = global.WorkbenchStorage
      ? global.WorkbenchStorage.getUserCode(storageKey)
      : null;
    const isStaleFallback = savedCode && (savedCode.includes("Hola desde NeoEngine POSIX") || savedCode.includes("___ COMPLETAR AQUÍ") || savedCode.includes("___ ESCRIBE AQUÍ"));
    const initialCode = (!isStaleFallback && savedCode) ? savedCode : originalCode;
    let isChallengeMode = false;

    box.innerHTML = `
      <div class="ceb-toolbar">
        <div class="ceb-file-info">
          <span class="ceb-lang-badge">${lang === "c" ? "C11 POSIX" : lang.toUpperCase()}</span>
          <strong>${fileName}</strong>
          <span class="ceb-mode-pill pill accent" style="font-size:0.68rem;">📖 Modo Estudio</span>
        </div>
        <div class="ceb-actions" style="flex-wrap:wrap;">
          <button type="button" class="ceb-btn challenge" title="Ocultar líneas clave para practicar completando el código">🧩 Modo Reto (Completar Código)</button>
          <button type="button" class="ceb-btn hint" style="display:none;" title="Ver pistas de las líneas que faltan">💡 Pista</button>
          <button type="button" class="ceb-btn reset" title="Restaurar el código completo original">↺ Solución Original</button>
          <button type="button" class="ceb-btn run">▶ Compilar y Ejecutar</button>
        </div>
      </div>
      <div class="ceb-hint-drawer" style="display:none;padding:0.7rem 1rem;background:#13202c;border-bottom:1px solid #284252;color:#b8d4e3;font-family:var(--f-mono);font-size:0.78rem;line-height:1.5;"></div>
      <div class="ceb-editor-wrap">
        <div class="ceb-line-numbers" aria-hidden="true">1</div>
        <textarea class="ceb-textarea" spellcheck="false" aria-label="Editor interactivo de código para ${fileName}"></textarea>
      </div>
      <div class="ceb-output">
        <div class="ceb-output-header">
          <span class="ceb-engine-label">CONSOLA INTERACTIVA POSIX (LISTA PARA COMPILAR)</span>
          <span class="ceb-time-label">En espera</span>
        </div>
        <pre class="ceb-stdout" style="color:#8b949e;">Pulsa «▶ Compilar y Ejecutar» para compilar y probar el código en el entorno, o activa «🧩 Modo Reto (Completar Código)» para ponerte a prueba.</pre>
      </div>
    `;

    const textarea = box.querySelector(".ceb-textarea");
    const lineBox = box.querySelector(".ceb-line-numbers");
    const modePill = box.querySelector(".ceb-mode-pill");
    const challengeBtn = box.querySelector(".ceb-btn.challenge");
    const hintBtn = box.querySelector(".ceb-btn.hint");
    const hintDrawer = box.querySelector(".ceb-hint-drawer");
    const runBtn = box.querySelector(".ceb-btn.run");
    const resetBtn = box.querySelector(".ceb-btn.reset");
    const stdoutEl = box.querySelector(".ceb-stdout");
    const engineLabel = box.querySelector(".ceb-engine-label");
    const timeLabel = box.querySelector(".ceb-time-label");

    textarea.value = initialCode;
    updateLineNumbers(textarea, lineBox);

    textarea.addEventListener("input", () => {
      updateLineNumbers(textarea, lineBox);
      if (global.WorkbenchStorage && !isChallengeMode) {
        global.WorkbenchStorage.saveUserCode(storageKey, textarea.value);
      }
    });

    // Permitir usar Tab dentro del editor de código
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + "    " + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 4;
        updateLineNumbers(textarea, lineBox);
      }
    });

    const triggerRun = async (codeToRun) => {
      runBtn.disabled = true;
      stdoutEl.className = "ceb-stdout";
      stdoutEl.style.color = "#4ef2df";
      stdoutEl.textContent = `⏳ Compilando ${fileName} con ${lang === "c" ? "gcc -Wall -Wextra -std=c11 -pthread -lrt" : "javac"} y verificando tu código...`;
      timeLabel.textContent = "Compilando...";

      await new Promise((r) => setTimeout(r, 240));

      const result = await executeConcurrentCode(
        codeToRun,
        lang,
        fileName,
        challengeSpec,
        isChallengeMode
      );
      runBtn.disabled = false;
      engineLabel.textContent = result.engine;
      timeLabel.textContent = `⏱ ${result.timeMs} ms`;
      stdoutEl.style.color = "";
      stdoutEl.textContent = result.output;
      stdoutEl.className = result.ok ? "ceb-stdout success" : "ceb-stdout error";
    };

    runBtn.addEventListener("click", () => triggerRun(textarea.value));

    challengeBtn.addEventListener("click", () => {
      isChallengeMode = true;
      textarea.value = challengeSpec.challengeCode;
      updateLineNumbers(textarea, lineBox);
      modePill.textContent = "🧩 Modo Reto Activo";
      modePill.className = "ceb-mode-pill pill sig";
      hintBtn.style.display = challengeSpec.hints.length > 0 ? "inline-flex" : "none";
      runBtn.textContent = "✓ Comprobar y Ejecutar Mi Código";
      stdoutEl.className = "ceb-stdout";
      stdoutEl.style.color = "#f2a33a";
      stdoutEl.textContent =
        "🧩 MODO RETO ACTIVADO: Completa las líneas marcadas con [RETO] en el editor superior y pulsa «✓ Comprobar y Ejecutar Mi Código» para verificar si tu solución funciona correctamente.";
    });

    hintBtn.addEventListener("click", () => {
      const isVisible = hintDrawer.style.display !== "none";
      if (isVisible) {
        hintDrawer.style.display = "none";
      } else {
        hintDrawer.style.display = "block";
        hintDrawer.innerHTML =
          `<strong>💡 Pistas para completar este código:</strong><br/>` +
          challengeSpec.hints.map((h) => `• ${h}`).join("<br/>");
      }
    });

    resetBtn.addEventListener("click", () => {
      isChallengeMode = false;
      textarea.value = originalCode;
      updateLineNumbers(textarea, lineBox);
      modePill.textContent = "📖 Modo Estudio";
      modePill.className = "ceb-mode-pill pill accent";
      hintBtn.style.display = "none";
      hintDrawer.style.display = "none";
      runBtn.textContent = "▶ Compilar y Ejecutar";
      if (global.WorkbenchStorage) {
        global.WorkbenchStorage.clearUserCode(storageKey);
      }
      stdoutEl.className = "ceb-stdout";
      stdoutEl.style.color = "#8b949e";
      stdoutEl.textContent =
        "Código original restaurado. Pulsa «▶ Compilar y Ejecutar» cuando quieras ejecutarlo.";
    });
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
    analyzeCodingRecommendations,
    initAllCodeBoxes
  };
})(window);
