/**
 * ENGINEERING WORKBENCH — CORE-SHELL.JS
 * Implementa el App Shell persistente bajo el estándar obligatorio html-maker:
 *  1. Detección nativa del tema del sistema + conmutador manual persistente en localStorage.
 *  2. Botón de alternancia (☰) en esquina superior izquierda con cierre hermético al 100%.
 *  3. Scrollspy automático mediante IntersectionObserver sobre main section[id].
 *  4. Selector jerárquico de Año -> Semestre -> Asignatura y Barra de Comandos (Ctrl + K).
 *  5. Primitivas gráficas reactivas en SVG puro (drawWave, plot, drawFSM) que responden al tema.
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
      // En cursos/anio-X/semestre-Y/asignatura-Z/index.html hay 4 segmentos (3 carpetas + archivo)
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
      btn.textContent = theme === "dark" ? "☀️ Claro" : "🌙 Oscuro";
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
     3. Toggle de Barra Lateral Izquierda (100% Hermético) y Scrollspy
     -------------------------------------------------------------------------- */
  function initSidebarAndScrollspy() {
    const toggleBtn = document.getElementById("toggleSidebar");
    const layout = document.querySelector(".layout");
    let backdrop = document.querySelector(".sidebar-backdrop");

    if (!backdrop && layout) {
      backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      document.body.appendChild(backdrop);
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
      });
    }

    // Scrollspy con IntersectionObserver (Estándar html-maker)
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
     4. Navegador Rápido de Asignaturas en el Sidebar y Botón de Lectura
     -------------------------------------------------------------------------- */
  const SUBJECTS_Y3_S1 = [
    { id: "programacion-concurrente", name: "Programación Concurrente (Activa)", path: "cursos/anio-3/semestre-1/programacion-concurrente/index.html" }
  ];

  function initCurriculumWidget() {
    const root = getRootPrefix();
    const subjectSelect = document.getElementById("sidebarSubjectSelect");
    const currentSubject = document.body.getAttribute("data-subject-id") || "";

    if (subjectSelect) {
      subjectSelect.innerHTML =
        `<option value="${root}index.html">⚡ Panel Global (4 Años)</option>` +
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

    // Botón de "Marcar Tema como Leído"
    const readBtn = document.getElementById("markTopicReadBtn");
    const pageId = document.body.getAttribute("data-page-id");
    if (readBtn && pageId && global.WorkbenchStorage) {
      const updateBtnUI = () => {
        const done = global.WorkbenchStorage.isTopicRead(pageId);
        readBtn.innerHTML = done ? "✓ Tema Completado" : "○ Marcar como Leído";
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

  /* --------------------------------------------------------------------------
     5. Barra de Comandos Global (Ctrl + K) con Índice de Búsqueda Instantáneo
     -------------------------------------------------------------------------- */
  const FALLBACK_SEARCH_INDEX = [
    { title: "Dashboard Principal — Engineering Workbench", category: "Vista Global", subject: "Plataforma", path: "index.html", keywords: ["inicio", "dashboard", "años"] },
    { title: "Programación Concurrente — Panel Maestro y Reglas de Oro (INFO.md)", category: "Asignatura Activa", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/index.html", keywords: ["info.md", "volatile", "sem_t", "pthreads"] },
    { title: "Tema 01: Introducción a la Programación Concurrente", category: "Teoría", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-01.html", keywords: ["interleaving", "entrelazado", "seccion critica", "str"] },
    { title: "Tema 02: Representación de Procesos y Soporte de la Concurrencia (Pthreads)", category: "Teoría", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-02.html", keywords: ["unix", "pthreads", "pthread_create", "pthread_join", "ids"] },
    { title: "Tema 03: Comunicación y Sincronización en Memoria Compartida", category: "Teoría", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-03.html", keywords: ["peterson", "lamport", "semaforos", "productor consumidor", "lectores escritores", "filosofos", "barbero"] },
    { title: "Tema 04: Comunicación mediante Paso de Mensajes (Colas POSIX y Select)", category: "Teoría", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-04.html", keywords: ["mqueue", "mq_open", "mq_send", "mq_receive", "select", "guardas"] },
    { title: "Tema 05: Programación Dirigida por Eventos y Señales POSIX", category: "Teoría", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-05.html", keywords: ["eventos", "sigaction", "pthread_sigmask", "sigwait", "sigwaitinfo", "sigqueue"] },
    { title: "Tema 06: La Concurrencia en Otros Lenguajes (Java, C#) y FreeRTOS", category: "Teoría", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-06.html", keywords: ["java", "synchronized", "c#", "freertos", "xtaskcreate", "vtaskdelayuntil"] },
    { title: "Tema 07: Programación de Sistemas de Tiempo Real en POSIX", category: "Teoría", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/teoria/tema-07.html", keywords: ["sched_fifo", "sched_rr", "mlockall", "clock_nanosleep", "timer_abstime", "normalizar", "prio_inherit"] },
    { title: "Simulador de Examen Final: Programación Concurrente (21 Cuestiones)", category: "Examen Test", subject: "Programación Concurrente", path: "cursos/anio-3/semestre-1/programacion-concurrente/evaluacion/examen-test.html", keywords: ["examen", "test", "evaluacion"] }
  ];

  function normalizeStr(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function initCommandPalette() {
    const root = getRootPrefix();
    let searchItems = FALLBACK_SEARCH_INDEX.slice();

    fetch(root + "data/search-index.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) searchItems = data;
      })
      .catch(() => {});

    let backdrop = document.getElementById("cmdPaletteBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "cmdPaletteBackdrop";
      backdrop.className = "cmd-backdrop";
      backdrop.setAttribute("role", "dialog");
      backdrop.setAttribute("aria-modal", "true");
      backdrop.setAttribute("aria-label", "Buscador global de la plataforma");
      backdrop.innerHTML = `
        <div class="cmd-modal">
          <div class="cmd-input-wrap">
            <span style="color:var(--accent);font-weight:700;">⌕</span>
            <input type="search" id="cmdSearchInput" class="cmd-input" placeholder="Buscar tema, algoritmo, laboratorio o simulador (ej. Round Robin, VLSM, SOLID, B+ Tree, A*)..." autocomplete="off" />
            <kbd style="font-size:0.72rem;padding:0.15rem 0.4rem;border:1px solid var(--line);border-radius:4px;color:var(--muted);">ESC</kbd>
          </div>
          <div id="cmdResultsList" class="cmd-results"></div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    const input = document.getElementById("cmdSearchInput");
    const resultsBox = document.getElementById("cmdResultsList");
    let selectedIndex = 0;
    let filtered = [];

    function renderResults(query = "") {
      const q = normalizeStr(query.trim());
      filtered = searchItems.filter((item) => {
        if (!q) return true;
        const haystack = normalizeStr(
          `${item.title} ${item.category} ${item.subject} ${(item.keywords || []).join(" ")}`
        );
        return haystack.includes(q);
      });

      selectedIndex = 0;
      if (filtered.length === 0) {
        resultsBox.innerHTML = `<div style="padding:1rem;color:var(--muted);text-align:center;font-size:0.86rem;">Sin coincidencias para "${query}". Prueba con otro término técnico.</div>`;
        return;
      }

      resultsBox.innerHTML = filtered
        .slice(0, 14)
        .map(
          (item, idx) => `
          <a href="${root}${item.path}" class="cmd-item ${idx === 0 ? "selected" : ""}" data-idx="${idx}">
            <div>
              <div class="cmd-item-title">${item.title}</div>
              <div class="cmd-item-sub">${item.subject} · ${item.category}</div>
            </div>
            <span class="pill" style="font-size:0.68rem;">Ir →</span>
          </a>
        `
        )
        .join("");
    }

    function openPalette() {
      backdrop.classList.add("open");
      input.value = "";
      renderResults("");
      setTimeout(() => input.focus(), 20);
    }

    function closePalette() {
      backdrop.classList.remove("open");
    }

    document.querySelectorAll(".cmd-trigger, [data-action='open-search']").forEach((btn) => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = "true";
        btn.addEventListener("click", openPalette);
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
          openPalette();
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
            window.location.href = target.getAttribute("href");
          }
        }
      }
    });
  }

  /* --------------------------------------------------------------------------
     6. Motores Interactivos en SVG Puro (Estándar html-maker: drawWave, plot)
     -------------------------------------------------------------------------- */
  function getCssVar(name, fallback) {
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return val || fallback;
  }

  /**
   * Generador de cronogramas digitales y diagramas de estados/buses (drawWave)
   */
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

    // Líneas verticales de ciclo / flanco
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
        // Bus multi-bit / Estado con transiciones cruzadas
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
        // Señal binaria 0/1
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

  /**
   * Trazador de curvas matemáticas/físicas con bisección de intersección opcional (plot)
   */
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

    // Rejilla horizontal y vertical
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

    // Ejes y etiquetas
    if (options.xLabel) {
      svg += `<text x="${padL + plotW / 2}" y="${H - 5}" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="11" text-anchor="middle">${options.xLabel}</text>`;
    }
    if (options.yLabel) {
      svg += `<text x="15" y="${padT + plotH / 2}" fill="${cTxt}" font-family="IBM Plex Mono, monospace" font-size="11" text-anchor="middle" transform="rotate(-90 15 ${padT + plotH / 2})">${options.yLabel}</text>`;
    }

    // Series
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

    // Intersección por bisección numérica entre las 2 primeras curvas si se solicita
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
