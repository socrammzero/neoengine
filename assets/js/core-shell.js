/**
 * NEOENGINE — CORE-SHELL.JS
 * Plataforma Interactiva de Ingeniería Electrónica de Telecomunicaciones:
 *  1. Detección nativa del tema del sistema + conmutador manual persistente en localStorage.
 *  2. Botón de alternancia (☰) en esquina superior izquierda con cierre hermético al 100%.
 *  3. Scrollspy automático mediante IntersectionObserver sobre main section[id].
 *  4. Buscador Universal Tolerante a Fallos (Ctrl + K): insensible a acentos, signos de
 *     interrogación/puntuación, errores ortográficos (fonética española) y erratas tipográficas
 *     (distancia Damerau-Levenshtein + trigramas) sobre todo el contenido de las asignaturas.
 *  5. Gestor de instalación como App Web (PWA) adaptable a cualquier dispositivo.
 *  6. Primitivas gráficas reactivas en SVG puro (drawWave, plot).
 */
(function (global) {
  "use strict";

  /* --------------------------------------------------------------------------
     1. Cálculo de Ruta Raíz Relativa para Navegación Multi-Nivel
     -------------------------------------------------------------------------- */
  function getRootPrefix() {
    const explicit = document.documentElement.getAttribute("data-root");
    if (explicit !== null) return explicit;
    const path = window.location.pathname.replace(/\\/g, "/");
    if (path.includes("/cursos/")) {
      const afterCursos = path.split("/cursos/")[1] || "";
      const segments = afterCursos.split("/").filter(Boolean);
      const depth = segments.length;
      return "../".repeat(depth);
    }
    return "./";
  }

  /* --------------------------------------------------------------------------
     2. Gestión Completa de Modo Claro/Oscuro (Sistema + Manual + LocalStorage)
     -------------------------------------------------------------------------- */
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const applyTheme = (theme, persist = false) => {
    document.documentElement.setAttribute("data-theme", theme);
    if (persist) {
      try {
        localStorage.setItem("theme", theme);
      } catch (_) {}
    }
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.innerHTML = theme === "dark" ? "☀️ <span class='hide-xs'>Claro</span>" : "🌙 <span class='hide-xs'>Oscuro</span>";
      btn.setAttribute(
        "aria-label",
        `Cambiar a modo ${theme === "dark" ? "claro" : "oscuro"}`
      );
    }
  };

  function initThemeSystem() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem("theme");
    } catch (_) {}
    const initialTheme = savedTheme || getSystemTheme();
    applyTheme(initialTheme, false);

    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn && !themeBtn.dataset.bound) {
      themeBtn.dataset.bound = "true";
      themeBtn.addEventListener("click", () => {
        const activeTheme =
          document.documentElement.getAttribute("data-theme") || getSystemTheme();
        const nextTheme = activeTheme === "dark" ? "light" : "dark";
        applyTheme(nextTheme, true);
        if (typeof window.redrawCharts === "function") window.redrawCharts();
      });
    }

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        let manual = null;
        try {
          manual = localStorage.getItem("theme");
        } catch (_) {}
        if (!manual) {
          applyTheme(e.matches ? "dark" : "light", false);
          if (typeof window.redrawCharts === "function") window.redrawCharts();
        }
      });
  }

  /* --------------------------------------------------------------------------
     3. Identidad Visual NeoEngine, Barra Lateral (100% Hermética) y Scrollspy
     -------------------------------------------------------------------------- */
  const MINI_NEO_LOGO_SVG = `<svg class="neo-brand-svg neo-logo-trigger" viewBox="0 0 256 256" width="28" height="28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="8" y="8" width="240" height="240" rx="52" fill="#0d1822" stroke="#3cc9b8" stroke-width="8"/>
    <path d="M 52 64 A 96 96 0 0 1 204 64" fill="none" stroke="#3cc9b8" stroke-width="6" stroke-linecap="round" opacity="0.65"/>
    <path d="M 204 192 A 96 96 0 0 1 52 192" fill="none" stroke="#3cc9b8" stroke-width="6" stroke-linecap="round" opacity="0.65"/>
    <rect x="60" y="60" width="136" height="136" rx="24" fill="#091118" stroke="#3cc9b8" stroke-width="6"/>
    <path d="M 88 164 L 88 92 L 138 158 L 168 92 L 168 164" fill="none" stroke="#3cc9b8" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 74 128 L 96 128 L 106 102 L 118 154 L 130 96 L 142 154 L 152 114 L 162 128 L 182 128" fill="none" stroke="#f2a33a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  function injectNeoEngineBranding() {
    const brandTitle = document.querySelector(".sidebar-brand-title");
    if (brandTitle && !brandTitle.dataset.branded) {
      brandTitle.dataset.branded = "true";
      brandTitle.classList.add("neo-logo-trigger");
      brandTitle.title = "NeoEngine — Ingeniería Electrónica de Telecomunicaciones";
      const currentText = brandTitle.textContent.replace(/⚡/g, "").trim();
      const label =
        currentText && !/NeoEngine|NeoEngine/i.test(currentText)
          ? currentText
          : "NeoEngine";
      brandTitle.innerHTML = `${MINI_NEO_LOGO_SVG}<span>${label}</span>`;
    }
  }

  function initSidebarAndScrollspy() {
    injectNeoEngineBranding();

    const toggleBtn = document.getElementById("toggleSidebar");
    const layout = document.querySelector(".layout");
    let backdrop = document.querySelector(".sidebar-backdrop");

    if (!backdrop && layout) {
      backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      document.body.appendChild(backdrop);
    }

    // En móviles (< 900px), iniciar con el drawer cerrado por defecto para maximizar espacio
    if (layout && window.innerWidth <= 900 && !layout.dataset.mobileInit) {
      layout.dataset.mobileInit = "true";
      layout.classList.add("sidebar-collapsed");
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
    }

    if (toggleBtn && layout && !toggleBtn.dataset.bound) {
      toggleBtn.dataset.bound = "true";
      toggleBtn.addEventListener("click", () => {
        const isCollapsed = layout.classList.toggle("sidebar-collapsed");
        toggleBtn.setAttribute("aria-expanded", String(!isCollapsed));
        if (backdrop && window.innerWidth <= 900) {
          backdrop.classList.toggle("active", !isCollapsed);
        }
      });
    }

    if (backdrop) {
      backdrop.addEventListener("click", () => {
        if (layout) layout.classList.add("sidebar-collapsed");
        backdrop.classList.remove("active");
        if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
      });
    }

    // Cerrar el drawer móvil al pulsar un enlace de ancla interno
    document.querySelectorAll(".sidebar nav a[href^='#']").forEach((a) => {
      a.addEventListener("click", () => {
        if (window.innerWidth <= 900 && layout) {
          layout.classList.add("sidebar-collapsed");
          if (backdrop) backdrop.classList.remove("active");
          if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
        }
      });
    });

    // Envolver automáticamente tablas técnicas para auto-redimensionado horizontal limpio en móviles
    document.querySelectorAll("table.tech-table").forEach((tbl) => {
      if (!tbl.parentElement.classList.contains("table-scroll-wrap")) {
        const wrap = document.createElement("div");
        wrap.className = "table-scroll-wrap";
        tbl.parentNode.insertBefore(wrap, tbl);
        wrap.appendChild(tbl);
      }
    });

    // Scrollspy con IntersectionObserver
    const links = document.querySelectorAll(".sidebar nav a[href^='#']");
    const sections = document.querySelectorAll("main section[id]");
    if (links.length > 0 && sections.length > 0 && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              links.forEach((l) =>
                l.classList.toggle(
                  "active",
                  l.getAttribute("href") === "#" + e.target.id
                )
              );
            }
          });
        },
        { rootMargin: "-10% 0px -70% 0px" }
      );
      sections.forEach((s) => obs.observe(s));
    }
  }

  /* --------------------------------------------------------------------------
     4. Navegador Rápido de Asignaturas y Gestor de Instalación PWA
     -------------------------------------------------------------------------- */
  const SUBJECTS_Y3_S1 = [
    {
      id: "programacion-concurrente",
      name: "Programación Concurrente (Activa)",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/index.html"
    }
  ];

  function initCurriculumWidget() {
    const root = getRootPrefix();
    const subjectSelect = document.getElementById("sidebarSubjectSelect");
    const currentSubject = document.body.getAttribute("data-subject-id") || "";

    if (subjectSelect) {
      subjectSelect.innerHTML =
        `<option value="${root}index.html">⚡ NeoEngine · Panel Global (4 Años)</option>` +
        SUBJECTS_Y3_S1.map(
          (s) =>
            `<option value="${root}${s.path}" ${
              s.id === currentSubject ? "selected" : ""
            }>${s.name}</option>`
        ).join("");

      subjectSelect.addEventListener("change", (e) => {
        if (e.target.value) window.location.href = e.target.value;
      });
    }

    const readBtn = document.getElementById("markTopicReadBtn");
    const pageId = document.body.getAttribute("data-page-id");
    if (readBtn && pageId && global.WorkbenchStorage) {
      const updateBtnUI = () => {
        const done = global.WorkbenchStorage.isTopicRead(pageId);
        readBtn.innerHTML = done
          ? "✓ <span class='hide-xs'>Completado</span>"
          : "○ <span class='hide-xs'>Marcar Leído</span>";
        readBtn.className = done ? "btn-top pill ok" : "btn-top";
      };
      updateBtnUI();
      readBtn.addEventListener("click", () => {
        if (global.WorkbenchStorage.isTopicRead(pageId)) {
          global.WorkbenchStorage.unmarkTopicRead(pageId);
        } else {
          global.WorkbenchStorage.markTopicRead(pageId, {
            title: document.title,
            subjectId: currentSubject
          });
        }
        updateBtnUI();
      });
    }
  }

  let deferredInstallPrompt = null;

  function initPwaInstaller() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      document.querySelectorAll(".neo-install-btn").forEach((b) => {
        b.style.display = "inline-flex";
      });
    });

    const topbarRight = document.querySelector(".topbar-right");
    if (topbarRight && !document.getElementById("installAppBtn")) {
      const installBtn = document.createElement("button");
      installBtn.type = "button";
      installBtn.id = "installAppBtn";
      installBtn.className = "btn-top neo-install-btn";
      installBtn.setAttribute("aria-label", "Instalar aplicación NeoEngine en el dispositivo");
      installBtn.innerHTML = `📲 <span class="hide-sm">Instalar App</span>`;
      const themeBtn = document.getElementById("themeToggle");
      if (themeBtn) {
        topbarRight.insertBefore(installBtn, themeBtn);
      } else {
        topbarRight.appendChild(installBtn);
      }

      installBtn.addEventListener("click", async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice.catch(() => {});
          deferredInstallPrompt = null;
        } else {
          showInstallGuideModal();
        }
      });
    }
  }

  function showInstallGuideModal() {
    let modal = document.getElementById("neoInstallModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "neoInstallModal";
      modal.className = "cmd-backdrop open";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Instalar NeoEngine como Aplicación");
      modal.innerHTML = `
        <div class="cmd-modal" style="max-width:540px;padding:1.4rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.85rem;">
            <div style="display:flex;align-items:center;gap:0.65rem;">
              ${MINI_NEO_LOGO_SVG}
              <h3 style="margin:0;font-size:1.2rem;">Instalar NeoEngine en tu Dispositivo</h3>
            </div>
            <button type="button" id="closeInstallModalBtn" class="btn-top">✕</button>
          </div>
          <p style="font-size:0.9rem;color:var(--muted);margin-top:0;">
            <strong>NeoEngine</strong> es una Aplicación Web Progresiva (PWA) con soporte offline completo y auto-redimensionado para móvil, tablet y escritorio:
          </p>
          <div style="display:grid;gap:0.65rem;font-size:0.86rem;">
            <div style="padding:0.75rem;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;">
              <strong>💻 Windows / macOS / Linux (Edge, Chrome, Brave):</strong><br/>
              Haz clic en el icono <strong>Instalar NeoEngine (⊕ / 🖥️)</strong> situado a la derecha de la barra de direcciones o abre el menú del navegador (<code>⋮</code>) → <em>Aplicaciones → Instalar este sitio como una aplicación</em>.
            </div>
            <div style="padding:0.75rem;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;">
              <strong>📱 iPhone / iPad (Safari / iOS):</strong><br/>
              Pulsa el botón <strong>Compartir (↑)</strong> en la barra de Safari y selecciona <strong>«Añadir a pantalla de inicio»</strong>.
            </div>
            <div style="padding:0.75rem;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;">
              <strong>🤖 Android (Chrome / Edge):</strong><br/>
              Abre el menú (<code>⋮</code>) y selecciona <strong>«Instalar aplicación»</strong> o <strong>«Añadir a pantalla de inicio»</strong>.
            </div>
          </div>
          <div style="margin-top:1.1rem;text-align:right;">
            <button type="button" id="okInstallModalBtn" class="btn-action">Entendido</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const close = () => modal.classList.remove("open");
      modal.querySelector("#closeInstallModalBtn").addEventListener("click", close);
      modal.querySelector("#okInstallModalBtn").addEventListener("click", close);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) close();
      });
    } else {
      modal.classList.add("open");
    }
  }

  /* --------------------------------------------------------------------------
     5. Buscador Universal Tolerante a Errores, Acentos e Interrogaciones (Ctrl+K)
     -------------------------------------------------------------------------- */
  const STOP_WORDS_ES = new Set([
    "que", "como", "cual", "cuales", "donde", "cuando", "quien", "por", "para",
    "con", "sin", "sobre", "entre", "hacia", "hasta", "desde", "del", "las",
    "los", "una", "uno", "unas", "unos", "esta", "este", "estos", "estas",
    "ese", "esa", "esos", "esas", "son", "sea", "fue", "era", "hay", "tiene",
    "tienen", "puede", "pueden", "puedo", "hacer", "hace", "sirve", "funciona"
  ]);

  /**
   * Normalización limpia: minúsculas, sin tildes/diéresis, sin signos ¿?¡!.,;:()[]
   */
  function normalizeText(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!.,;:()"'«»\[\]{}<>\/\\|+*~`^]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Esqueleto fonético/ortográfico español para tolerar confusiones b/v, c/s/z, ll/y, g/j, h muda, k/qu/c y letras dobles
   */
  function toSpanishPhonetic(word) {
    return normalizeText(word)
      .replace(/h/g, "")
      .replace(/qu/g, "k")
      .replace(/c([ei])/g, "s$1")
      .replace(/c/g, "k")
      .replace(/z/g, "s")
      .replace(/v/g, "b")
      .replace(/ll/g, "y")
      .replace(/g([ei])/g, "j$1")
      .replace(/ñ/g, "n")
      .replace(/w/g, "u")
      .replace(/x/g, "ks")
      .replace(/([a-z])\1+/g, "$1");
  }

  /**
   * Distancia de edición de Damerau-Levenshtein (inserción, borrado, sustitución y transposición adyacente)
   */
  function damerauLevenshtein(a, b) {
    const la = a.length;
    const lb = b.length;
    if (la === 0) return lb;
    if (lb === 0) return la;
    if (Math.abs(la - lb) > 4) return Math.abs(la - lb);

    const dp = Array.from({ length: la + 1 }, () => new Uint16Array(lb + 1));
    for (let i = 0; i <= la; i++) dp[i][0] = i;
    for (let j = 0; j <= lb; j++) dp[0][j] = j;

    for (let i = 1; i <= la; i++) {
      for (let j = 1; j <= lb; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let val = Math.min(
          dp[i - 1][j] + 1, // borrado
          dp[i][j - 1] + 1, // inserción
          dp[i - 1][j - 1] + cost // sustitución
        );
        if (
          i > 1 &&
          j > 1 &&
          a[i - 1] === b[j - 2] &&
          a[i - 2] === b[j - 1]
        ) {
          val = Math.min(val, dp[i - 2][j - 2] + 1); // transposición
        }
        dp[i][j] = val;
      }
    }
    return dp[la][lb];
  }

  /**
   * Coeficiente de similitud de trigramas para palabras mal escritas
   */
  function trigramSimilarity(a, b) {
    if (a.length < 3 || b.length < 3) return a === b ? 1 : 0;
    const setA = new Set();
    const setB = new Set();
    for (let i = 0; i <= a.length - 3; i++) setA.add(a.slice(i, i + 3));
    for (let i = 0; i <= b.length - 3; i++) setB.add(b.slice(i, i + 3));
    let inter = 0;
    setA.forEach((t) => {
      if (setB.has(t)) inter++;
    });
    return (2 * inter) / (setA.size + setB.size || 1);
  }

  /**
   * Prepara un ítem del índice para búsqueda ultrarrápida exacta, fonética y difusa
   */
  function prepareIndexedItem(item) {
    const rawCorpus = `${item.title || ""} ${item.category || ""} ${item.subject || ""} ${(item.keywords || []).join(" ")} ${item.content || ""}`;
    const normCorpus = normalizeText(rawCorpus);
    const normTitle = normalizeText(item.title || "");
    const words = Array.from(
      new Set(normCorpus.split(/[\s\-_]+/).filter((w) => w.length >= 2))
    );
    const phoneticWords = words.map(toSpanishPhonetic);
    const phoneticCorpus = phoneticWords.join(" ");

    return {
      ...item,
      _normCorpus: normCorpus,
      _normTitle: normTitle,
      _words: words,
      _phoneticWords: phoneticWords,
      _phoneticCorpus: phoneticCorpus
    };
  }

  /**
   * Evalúa la puntuación de relevancia de un ítem frente a una consulta arbitraria
   * (con o sin tildes, signos de interrogación o errores ortográficos/tipográficos)
   */
  function scoreSearchItem(preparedItem, rawQuery) {
    const cleanQ = normalizeText(rawQuery);
    if (!cleanQ) return { score: 1, snippet: preparedItem.content || "" };

    // 1. Coincidencia exacta de frase completa en título o cuerpo
    let totalScore = 0;
    if (preparedItem._normTitle.includes(cleanQ)) {
      totalScore += 180;
    } else if (preparedItem._normCorpus.includes(cleanQ)) {
      totalScore += 120;
    }

    // Extraer tokens de la consulta filtrando stop-words si hay palabras clave sustantivas
    const allTokens = cleanQ.split(/\s+/).filter((t) => t.length >= 2);
    const contentTokens = allTokens.filter((t) => !STOP_WORDS_ES.has(t));
    const queryTokens = contentTokens.length > 0 ? contentTokens : allTokens;

    if (queryTokens.length === 0) {
      return { score: totalScore, snippet: preparedItem.content || "" };
    }

    let matchedTokens = 0;

    for (const qTok of queryTokens) {
      const qPhon = toSpanishPhonetic(qTok);
      let bestTokenScore = 0;

      // A) Subcadena exacta en título o corpus
      if (preparedItem._normTitle.includes(qTok)) {
        bestTokenScore = 95;
      } else if (preparedItem._normCorpus.includes(qTok)) {
        bestTokenScore = 75;
      }
      // B) Coincidencia fonética directa (ej. "hevras" -> "ebras", "esclusion" -> "esklusion", "semafaros")
      else if (qPhon.length >= 3 && preparedItem._phoneticCorpus.includes(qPhon)) {
        bestTokenScore = 62;
      }
      // C) Búsqueda difusa palabra por palabra (Damerau-Levenshtein + Fonética + Trigramas)
      else {
        const maxDist = qTok.length <= 4 ? 1 : qTok.length <= 8 ? 2 : 3;
        for (let i = 0; i < preparedItem._words.length; i++) {
          const w = preparedItem._words[i];
          const wPhon = preparedItem._phoneticWords[i];

          // Prefijo cercano
          if (w.startsWith(qTok) || qTok.startsWith(w)) {
            bestTokenScore = Math.max(bestTokenScore, 60);
            break;
          }

          // Distancia de edición sobre la palabra normalizada
          const dist = damerauLevenshtein(qTok, w);
          if (dist <= maxDist) {
            const sc = Math.max(25, 58 - dist * 14);
            if (sc > bestTokenScore) bestTokenScore = sc;
          }

          // Distancia de edición sobre el esqueleto fonético
          if (qPhon.length >= 3 && wPhon.length >= 3) {
            const pDist = damerauLevenshtein(qPhon, wPhon);
            const maxPDist = qPhon.length <= 5 ? 1 : 2;
            if (pDist <= maxPDist) {
              const sc = Math.max(22, 52 - pDist * 14);
              if (sc > bestTokenScore) bestTokenScore = sc;
            }
          }

          // Similitud por trigramas para palabras largas con múltiples erratas
          if (qTok.length >= 5 && w.length >= 5) {
            const sim = trigramSimilarity(qTok, w);
            if (sim >= 0.45) {
              const sc = Math.round(sim * 50);
              if (sc > bestTokenScore) bestTokenScore = sc;
            }
          }
        }
      }

      if (bestTokenScore > 0) {
        matchedTokens++;
        totalScore += bestTokenScore;
      }
    }

    // Requerir que al menos la mayoría de los tokens con significado tengan coincidencia (exacta o difusa)
    const minRequired = queryTokens.length <= 2 ? queryTokens.length : Math.ceil(queryTokens.length * 0.65);
    if (matchedTokens < minRequired) {
      return { score: 0, snippet: "" };
    }

    return {
      score: totalScore,
      snippet: preparedItem.content || ""
    };
  }

  const FALLBACK_SEARCH_INDEX = [
    {
      title: "Panel Principal — NeoEngine (Ingeniería Electrónica de Telecomunicaciones)",
      category: "Vista Global",
      subject: "NeoEngine",
      path: "index.html",
      keywords: ["inicio", "dashboard", "años", "grados", "telecomunicaciones", "electronica"],
      content: "Panel global de asignaturas de Ingeniería Electrónica de Telecomunicaciones, simuladores interactivos y laboratorio POSIX."
    },
    {
      title: "Programación Concurrente — Panel Maestro y Criterios de Evaluación",
      category: "Asignatura Activa",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/index.html",
      keywords: ["volatile", "sem_t", "pthreads", "criterios", "evaluacion"],
      content: "Normativa de codificación C11 POSIX: prohibido volatile, uso de sem_t mutex, paso de &ids[i] y control de errores en pthread_create y pthread_join."
    },
    {
      title: "Tema 01: Introducción a la Programación Concurrente y STR",
      category: "Teoría",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-01.html",
      keywords: ["interleaving", "entrelazado", "seccion critica", "str", "atomicidad", "carrera"],
      content: "Conceptos de concurrencia, paralelismo, sistemas distribuidos, sistemas de tiempo real, entrelazado de instrucciones load/inc/store y exclusión mutua."
    },
    {
      title: "Tema 02: Representación de Procesos y Hebras POSIX (Pthreads)",
      category: "Teoría",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-02.html",
      keywords: ["unix", "pthreads", "pthread_create", "pthread_join", "ids", "fork", "hebras"],
      content: "Estados de un proceso UNIX, modelo de hebras POSIX, creación segura con pthread_create, recolección con pthread_join y paso de identificadores mediante array int ids[MAX]."
    },
    {
      title: "Tema 03: Comunicación y Sincronización en Memoria Compartida",
      category: "Teoría",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-03.html",
      keywords: ["peterson", "lamport", "panaderia", "semaforos", "productor consumidor", "lectores escritores", "filosofos", "barbero", "monitores", "test_and_set"],
      content: "Problema de los Jardines, intentos fallidos, Algoritmo de Peterson, Panadería de Lamport, Semáforos POSIX (sem_wait, sem_post), Productor-Consumidor circular, Lectores-Escritores justo, Cena de los Filósofos con sillas, Monitores y Barbero Dormilón."
    },
    {
      title: "Tema 04: Comunicación mediante Paso de Mensajes (Colas POSIX y Select)",
      category: "Teoría",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-04.html",
      keywords: ["mqueue", "mq_open", "mq_send", "mq_receive", "select", "guardas", "rendezvous", "ada", "canales"],
      content: "Paso de mensajes síncrono y asíncrono, buzones y puertos, Colas POSIX <mqueue.h>, espera selectiva con select() y FD_ISSET, y cita Ada Rendezvous."
    },
    {
      title: "Tema 05: Control de Eventos y Señales POSIX",
      category: "Teoría",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-05.html",
      keywords: ["eventos", "sigaction", "pthread_sigmask", "sigwait", "sigwaitinfo", "sigqueue", "senales", "sigrtmin"],
      content: "Señales UNIX y de Tiempo Real (SIGRTMIN..SIGRTMAX), máscaras de bloqueo por hebra con pthread_sigmask, envío con valor sigqueue y tratamiento síncrono mediante sigwait y sigwaitinfo."
    },
    {
      title: "Tema 06: La Concurrencia en Otros Lenguajes (Java, C#) y FreeRTOS",
      category: "Teoría",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-06.html",
      keywords: ["java", "synchronized", "wait", "notifyall", "c#", "lock", "freertos", "xtaskcreate", "vtaskdelayuntil", "arduino"],
      content: "Monitores en Java (synchronized, wait en bucle while, notifyAll), multihilo en C# (.NET Task, Monitor, lock) y multitarea de tiempo real en FreeRTOS sobre Arduino (xTaskCreate, vTaskDelayUntil, colas y mutex con herencia de prioridad)."
    },
    {
      title: "Tema 07: Sistemas de Tiempo Real y Planificación en POSIX",
      category: "Teoría",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-07.html",
      keywords: ["sched_fifo", "sched_rr", "mlockall", "clock_nanosleep", "timer_abstime", "normalizar", "prio_inherit", "rms", "edf", "liu layland", "inversion prioridad"],
      content: "Planificación cíclica, RMS (Rate Monotonic) con cota de Liu y Layland, EDF (Earliest Deadline First), inversión de prioridad (herencia PRIO_INHERIT y techo PRIO_PROTECT), bloqueo de memoria mlockall y tareas periódicas sin deriva con clock_nanosleep(TIMER_ABSTIME)."
    },
    {
      title: "Simulador de Examen Final: Programación Concurrente (21 Cuestiones)",
      category: "Evaluación",
      subject: "Programación Concurrente",
      path: "cursos/anio-3/semestre-1/programacion-concurrente/evaluacion/examen-test.html",
      keywords: ["examen", "test", "evaluacion", "preguntas", "simulacro"],
      content: "Simulador cronometrado con 21 preguntas oficiales de opción múltiple, cálculo de penalización -E/3 y justificación técnica detallada."
    }
  ];

  function initCommandPalette() {
    const root = getRootPrefix();
    let indexedItems = FALLBACK_SEARCH_INDEX.map(prepareIndexedItem);

    fetch(root + "data/search-index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          indexedItems = data.map(prepareIndexedItem);
        }
      })
      .catch(() => {});

    let backdrop = document.getElementById("cmdPaletteBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "cmdPaletteBackdrop";
      backdrop.className = "cmd-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.setAttribute("aria-label", "Buscador universal de NeoEngine");
      backdrop.innerHTML = `
        <div class="cmd-modal">
          <div class="cmd-input-wrap">
            <span style="color:var(--accent);font-weight:700;font-size:1.1rem;">⌕</span>
            <input
              type="search"
              id="cmdSearchInput"
              class="cmd-input"
              placeholder="Busca cualquier concepto, pregunta, fórmula o código (con o sin tildes o erratas)..."
              autocomplete="off"
              spellcheck="false"
            />
            <kbd style="font-size:0.72rem;padding:0.15rem 0.4rem;border:1px solid var(--line);border-radius:4px;color:var(--muted);">ESC</kbd>
          </div>
          <div class="cmd-search-hint">
            <span>✓ Tolerante a tildes, signos (¿?) y errores ortográficos</span>
            <span id="cmdMatchCounter"></span>
          </div>
          <div id="cmdResultsList" class="cmd-results"></div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    const input = document.getElementById("cmdSearchInput");
    const resultsBox = document.getElementById("cmdResultsList");
    const counterEl = document.getElementById("cmdMatchCounter");
    let selectedIndex = 0;
    let currentMatches = [];

    function renderResults(query = "") {
      const trimmed = query.trim();
      if (!trimmed) {
        currentMatches = indexedItems.slice(0, 18).map((it) => ({
          item: it,
          score: 1,
          snippet: it.content || ""
        }));
      } else {
        const scored = [];
        for (const it of indexedItems) {
          const res = scoreSearchItem(it, trimmed);
          if (res.score > 0) {
            scored.push({ item: it, score: res.score, snippet: res.snippet });
          }
        }
        scored.sort((a, b) => b.score - a.score);
        currentMatches = scored.slice(0, 25);
      }

      if (counterEl) {
        counterEl.textContent = trimmed
          ? `${currentMatches.length} resultado${currentMatches.length === 1 ? "" : "s"}`
          : `${indexedItems.length} entradas indexadas`;
      }

      selectedIndex = 0;
      if (currentMatches.length === 0) {
        resultsBox.innerHTML = `<div style="padding:1.25rem;color:var(--muted);text-align:center;font-size:0.88rem;">
          No se encontraron coincidencias para <strong>"${trimmed}"</strong>.<br/>
          <span style="font-size:0.78rem;">Prueba con cualquier palabra clave como <code>semaforo</code>, <code>peterson</code>, <code>hebras</code>, <code>mensajes</code>, <code>rms</code> o <code>java</code>.</span>
        </div>`;
        return;
      }

      resultsBox.innerHTML = currentMatches
        .map(({ item, snippet }, idx) => {
          const shortSnippet = snippet
            ? `<div class="cmd-item-snippet">${snippet.slice(0, 135)}${snippet.length > 135 ? "…" : ""}</div>`
            : "";
          return `
            <a href="${root}${item.path}" class="cmd-item ${idx === 0 ? "selected" : ""}" data-idx="${idx}">
              <div style="min-width:0;flex:1;">
                <div class="cmd-item-title">${item.title}</div>
                <div class="cmd-item-sub">${item.subject} · ${item.category}</div>
                ${shortSnippet}
              </div>
              <span class="pill" style="font-size:0.68rem;flex-shrink:0;">Ir →</span>
            </a>
          `;
        })
        .join("");

      resultsBox.querySelectorAll(".cmd-item").forEach((link) => {
        link.addEventListener("click", () => {
          closePalette();
        });
      });
    }

    function openPalette(initialQuery = "") {
      backdrop.classList.add("open");
      input.value = initialQuery;
      renderResults(initialQuery);
      setTimeout(() => input.focus(), 20);
    }

    function closePalette() {
      backdrop.classList.remove("open");
    }

    document.querySelectorAll(".cmd-trigger, [data-action='open-search']").forEach((btn) => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = "true";
        btn.addEventListener("click", () => openPalette(""));
      }
    });

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closePalette();
    });

    input.addEventListener("input", (e) => renderResults(e.target.value));

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (backdrop.classList.contains("open")) {
          closePalette();
        } else {
          openPalette("");
        }
      } else if (e.key === "Escape" && backdrop.classList.contains("open")) {
        closePalette();
      } else if (backdrop.classList.contains("open")) {
        const items = resultsBox.querySelectorAll(".cmd-item");
        if (!items.length) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          items[selectedIndex]?.classList.remove("selected");
          selectedIndex = (selectedIndex + 1) % items.length;
          items[selectedIndex]?.classList.add("selected");
          items[selectedIndex]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          items[selectedIndex]?.classList.remove("selected");
          selectedIndex = (selectedIndex - 1 + items.length) % items.length;
          items[selectedIndex]?.classList.add("selected");
          items[selectedIndex]?.scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
          e.preventDefault();
          const target = items[selectedIndex];
          if (target && target.getAttribute("href")) {
            closePalette();
            window.location.href = target.getAttribute("href");
          }
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     6. Motores Interactivos en SVG Puro (drawWave, plot)
     -------------------------------------------------------------------------- */
  function getCssVar(name, fallback) {
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  }

  function drawWave(containerOrId, signals, options = {}) {
    const el =
      typeof containerOrId === "string"
        ? document.getElementById(containerOrId)
        : containerOrId;
    if (!el || !Array.isArray(signals) || signals.length === 0) return;

    const steps = signals[0].v.length;
    const stepW = options.stepWidth || 58;
    const rowH = options.rowHeight || 44;
    const labelW = options.labelWidth || 125;
    const padT = 26;
    const padB = 18;
    const width = labelW + steps * stepW + 24;
    const height = padT + signals.length * rowH + padB;

    const cGrid = getCssVar("--scope-line", "#24343a");
    const cTxt = getCssVar("--scope-txt", "#b8c7c3");
    const cAccent = getCssVar("--accent", "#3cc9b8");
    const cSig = getCssVar("--sig", "#f2a33a");
    const cOk = getCssVar("--ok", "#4cc387");

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cronograma técnico interactivo">`;
    svg += `<defs>
      <pattern id="glitchHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke="${cSig}" stroke-width="2" stroke-opacity="0.45"/>
      </pattern>
    </defs>`;

    for (let i = 0; i <= steps; i++) {
      const x = labelW + i * stepW;
      svg += `<line x1="${x}" y1="${padT - 10}" x2="${x}" y2="${height - padB}" stroke="${cGrid}" stroke-dasharray="3 3" stroke-width="1"/>`;
      if (i < steps) {
        svg += `<text x="${x + stepW / 2}" y="16" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="11" text-anchor="middle">T${i}</text>`;
      }
    }

    signals.forEach((sig, rIdx) => {
      const yTop = padT + rIdx * rowH + 6;
      const yBot = padT + (rIdx + 1) * rowH - 8;
      const yMid = (yTop + yBot) / 2;
      const strokeCol =
        sig.col === "sig" ? cSig : sig.col === "state" ? cOk : cAccent;

      svg += `<text x="${labelW - 12}" y="${yMid + 4}" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="12" font-weight="600" text-anchor="end">${sig.name}</text>`;

      if (sig.bus) {
        let i = 0;
        while (i < steps) {
          let j = i + 1;
          while (j < steps && sig.v[j] === sig.v[i]) j++;
          const x1 = labelW + i * stepW;
          const x2 = labelW + j * stepW;
          const bev = 5;
          const isIdle = sig.v[i] === "IDLE" || sig.v[i] === "—" || sig.v[i] === "WAIT";
          const fillOp = isIdle ? "0.08" : "0.18";
          svg += `<polygon points="${x1},${yMid} ${x1 + bev},${yTop} ${x2 - bev},${yTop} ${x2},${yMid} ${x2 - bev},${yBot} ${x1 + bev},${yBot}" fill="${strokeCol}" fill-opacity="${fillOp}" stroke="${strokeCol}" stroke-width="1.8"/>`;
          svg += `<text x="${(x1 + x2) / 2}" y="${yMid + 4}" fill="#e6edf3" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600" text-anchor="middle">${sig.v[i]}</text>`;
          i = j;
        }
      } else {
        let d = "";
        for (let i = 0; i < steps; i++) {
          const x1 = labelW + i * stepW;
          const x2 = x1 + stepW;
          const val = Number(sig.v[i]) ? 1 : 0;
          const y = val ? yTop : yBot;
          if (i === 0) {
            d += `M ${x1} ${y} L ${x2} ${y}`;
          } else {
            const prevVal = Number(sig.v[i - 1]) ? 1 : 0;
            const prevY = prevVal ? yTop : yBot;
            if (prevY !== y) d += ` L ${x1} ${y}`;
            d += ` L ${x2} ${y}`;
          }
        }
        svg += `<path d="${d}" fill="none" stroke="${strokeCol}" stroke-width="2.2" stroke-linejoin="round"/>`;
      }
    });

    svg += `</svg>`;
    el.innerHTML = svg;
  }

  function plot(containerOrId, seriesList, options = {}) {
    const el =
      typeof containerOrId === "string"
        ? document.getElementById(containerOrId)
        : containerOrId;
    if (!el || !Array.isArray(seriesList) || seriesList.length === 0) return;

    const W = options.width || 680;
    const H = options.height || 260;
    const padL = 56;
    const padR = 24;
    const padT = 22;
    const padB = 38;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const xMin = options.xMin ?? 0;
    const xMax = options.xMax ?? 10;
    const yMin = options.yMin ?? 0;
    const yMax = options.yMax ?? 100;

    const X = (x) => padL + ((x - xMin) / (xMax - xMin || 1)) * plotW;
    const Y = (y) => padT + plotH - ((y - yMin) / (yMax - yMin || 1)) * plotH;

    const cGrid = getCssVar("--scope-line", "#24343a");
    const cTxt = getCssVar("--scope-txt", "#b8c7c3");
    const colors = [
      getCssVar("--accent", "#3cc9b8"),
      getCssVar("--sig", "#f2a33a"),
      getCssVar("--ok", "#4cc387"),
      "#ff7b6e"
    ];

    let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gráfica técnica interactiva">`;

    for (let i = 0; i <= 4; i++) {
      const yVal = yMin + ((yMax - yMin) * i) / 4;
      const yPos = Y(yVal);
      svg += `<line x1="${padL}" y1="${yPos}" x2="${W - padR}" y2="${yPos}" stroke="${cGrid}" stroke-dasharray="3 3" stroke-width="1"/>`;
      svg += `<text x="${padL - 8}" y="${yPos + 4}" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="10.5" text-anchor="end">${yVal.toFixed(options.yDecimals ?? 0)}</text>`;
    }

    for (let i = 0; i <= 5; i++) {
      const xVal = xMin + ((xMax - xMin) * i) / 5;
      const xPos = X(xVal);
      svg += `<line x1="${xPos}" y1="${padT}" x2="${xPos}" y2="${H - padB}" stroke="${cGrid}" stroke-dasharray="3 3" stroke-width="1"/>`;
      svg += `<text x="${xPos}" y="${H - padB + 16}" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="10.5" text-anchor="middle">${xVal.toFixed(options.xDecimals ?? 0)}</text>`;
    }

    if (options.xLabel) {
      svg += `<text x="${padL + plotW / 2}" y="${H - 5}" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="11" text-anchor="middle">${options.xLabel}</text>`;
    }
    if (options.yLabel) {
      svg += `<text x="15" y="${padT + plotH / 2}" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="11" text-anchor="middle" transform="rotate(-90 15 ${padT + plotH / 2})">${options.yLabel}</text>`;
    }

    const samples = options.samples || 80;
    seriesList.forEach((s, idx) => {
      const col = s.color || colors[idx % colors.length];
      let d = "";
      for (let i = 0; i <= samples; i++) {
        const xv = xMin + ((xMax - xMin) * i) / samples;
        const yv = Math.max(yMin, Math.min(yMax, s.fn(xv)));
        d += (i === 0 ? "M " : " L ") + `${X(xv).toFixed(1)} ${Y(yv).toFixed(1)}`;
      }
      svg += `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.4"/>`;
      if (s.label) {
        const lx = padL + 12 + idx * 165;
        svg += `<rect x="${lx}" y="${padT + 6}" width="10" height="10" rx="2" fill="${col}"/>`;
        svg += `<text x="${lx + 15}" y="${padT + 15}" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="11">${s.label}</text>`;
      }
    });

    if (options.showIntersection && seriesList.length >= 2) {
      const f1 = seriesList[0].fn;
      const f2 = seriesList[1].fn;
      let prevX = xMin;
      let prevDiff = f1(prevX) - f2(prevX);
      for (let i = 1; i <= samples; i++) {
        const currX = xMin + ((xMax - xMin) * i) / samples;
        const currDiff = f1(currX) - f2(currX);
        if (prevDiff * currDiff <= 0 && Math.abs(prevDiff - currDiff) > 1e-6) {
          let a = prevX,
            b = currX;
          for (let iter = 0; iter < 20; iter++) {
            const m = 0.5 * (a + b);
            const dm = f1(m) - f2(m);
            if (prevDiff * dm <= 0) b = m;
            else {
              a = m;
              prevDiff = dm;
            }
          }
          const ix = 0.5 * (a + b);
          const iy = f1(ix);
          if (iy >= yMin && iy <= yMax) {
            const cx = X(ix);
            const cy = Y(iy);
            svg += `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${H - padB}" stroke="#f2a33a" stroke-dasharray="4 3" stroke-width="1.3"/>`;
            svg += `<circle cx="${cx}" cy="${cy}" r="5" fill="#f2a33a" stroke="#0a0f10" stroke-width="2"/>`;
            svg += `<text x="${Math.min(W - padR - 60, cx + 8)}" y="${Math.max(padT + 16, cy - 8)}" fill="#f2a33a" font-family="IBM Plex Mono, monospace" font-size="11" font-weight="600">(${ix.toFixed(1)}, ${iy.toFixed(1)})</text>`;
          }
          break;
        }
        prevX = currX;
        prevDiff = currDiff;
      }
    }

    svg += `</svg>`;
    el.innerHTML = svg;
  }

  /* --------------------------------------------------------------------------
     7. Inicialización General al Cargar el DOM
     -------------------------------------------------------------------------- */
  function initCoreShell() {
    initThemeSystem();
    initSidebarAndScrollspy();
    initCurriculumWidget();
    initPwaInstaller();
    initCommandPalette();

    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      const root = getRootPrefix();
      navigator.serviceWorker.register(root + "sw.js").catch(() => {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCoreShell);
  } else {
    initCoreShell();
  }

  global.WorkbenchCharts = {
    drawWave,
    plot
  };
})(window);
