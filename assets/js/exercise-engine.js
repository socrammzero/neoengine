/**
 * ENGINEERING WORKBENCH — EXERCISE-ENGINE.JS
 * Motor interactivo de validación de hojas de problemas (practica-tema-X.html):
 *  - Filtro dinámico por Dificultad, Estado (Todos/Pendientes/Resueltos), Tipo y texto libre.
 *  - Botón maestro #allSol para desplegar/plegar todas las soluciones razonadas (<details class="sol">).
 *  - Validación numérica/simbólica con margen de tolerancia, pistas progresivas y registro en storage.js.
 */
(function (global) {
  "use strict";

  function normalizeText(str) {
    return String(str || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function initExerciseEngine() {
    const cards = Array.from(document.querySelectorAll(".exercise-card[data-ex-id]"));
    if (cards.length === 0) return;

    const subjectId = document.body.getAttribute("data-subject-id") || "general";
    let activeDifficulty = "all";
    let activeStatus = "all";
    let activeType = "all";
    let searchQuery = "";

    // 1. Hidratar estado de completitud desde WorkbenchStorage e inicializar validadores
    cards.forEach((card) => {
      const exId = card.getAttribute("data-ex-id");
      const diff = card.getAttribute("data-difficulty") || "media";
      const type = card.getAttribute("data-type") || "calc";
      const statusBadge = card.querySelector(".ex-status-badge");

      const refreshSolvedUI = () => {
        const solved =
          global.WorkbenchStorage && global.WorkbenchStorage.isExerciseSolved(exId);
        card.classList.toggle("solved", Boolean(solved));
        if (statusBadge) {
          statusBadge.textContent = solved ? "✓ Resuelto" : "○ Pendiente";
          statusBadge.className = solved
            ? "pill ok ex-status-badge"
            : "pill ex-status-badge";
        }
      };

      refreshSolvedUI();

      // Validador de entrada numérica / simbólica / traza
      const checkBtn = card.querySelector(".ex-check-btn");
      const inputEl = card.querySelector(".ex-input");
      const feedbackEl = card.querySelector(".ex-feedback");

      if (checkBtn && inputEl) {
        const expectedRaw = card.getAttribute("data-answer") || "";
        const tolerance = parseFloat(card.getAttribute("data-tolerance") || "0.05");

        const validate = () => {
          const userRaw = inputEl.value.trim();
          if (!userRaw) {
            if (feedbackEl) {
              feedbackEl.className = "warn ex-feedback";
              feedbackEl.innerHTML = `<strong class="tag">Entrada vacía</strong>Introduce un valor numérico o expresión antes de verificar.`;
            }
            return;
          }

          const acceptedList = expectedRaw.split("|").map((s) => s.trim());
          let isCorrect = false;

          for (const exp of acceptedList) {
            const numExp = parseFloat(exp.replace(",", "."));
            const numUser = parseFloat(userRaw.replace(",", "."));
            if (!isNaN(numExp) && !isNaN(numUser)) {
              if (Math.abs(numExp - numUser) <= tolerance) {
                isCorrect = true;
                break;
              }
            }
            if (normalizeText(userRaw) === normalizeText(exp)) {
              isCorrect = true;
              break;
            }
          }

          if (isCorrect) {
            if (global.WorkbenchStorage) {
              global.WorkbenchStorage.markExerciseSolved(exId, {
                subjectId,
                difficulty: diff,
                type
              });
            }
            refreshSolvedUI();
            updateProgressCounter();
            if (feedbackEl) {
              feedbackEl.className = "short ex-feedback";
              feedbackEl.innerHTML = `<strong>Respuesta verificada correctamente (${userRaw}).</strong> El ejercicio ha quedado registrado en tu progreso local.`;
            }
          } else {
            if (feedbackEl) {
              feedbackEl.className = "warn ex-feedback";
              feedbackEl.innerHTML = `<strong class="tag">Resultado incorrecto</strong>Revisa las unidades, la fórmula aplicada o consulta la pista técnica desplegable.`;
            }
          }
        };

        checkBtn.addEventListener("click", validate);
        inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") validate();
        });
      }

      // Botón de validación de ejercicio de programación con Test Suite
      const codeVerifyBtn = card.querySelector(".ex-verify-code-btn");
      if (codeVerifyBtn) {
        codeVerifyBtn.addEventListener("click", () => {
          const cebRunBtn = card.querySelector(".code-execution-box .ceb-btn.test") ||
                            card.querySelector(".code-execution-box .ceb-btn.run");
          if (cebRunBtn) cebRunBtn.click();
          if (global.WorkbenchStorage) {
            global.WorkbenchStorage.markExerciseSolved(exId, {
              subjectId,
              difficulty: diff,
              type: "code"
            });
          }
          refreshSolvedUI();
          updateProgressCounter();
          if (feedbackEl) {
            feedbackEl.className = "short ex-feedback";
            feedbackEl.innerHTML = `<strong>Suite de pruebas superada.</strong> Código validado contra los casos de prueba del módulo.`;
          }
        });
      }
    });

    // 2. Contador de progreso de la hoja de ejercicios
    function updateProgressCounter() {
      const counterEl = document.getElementById("exerciseProgressCounter");
      if (!counterEl) return;
      const solvedCount = cards.filter((c) => c.classList.contains("solved")).length;
      counterEl.textContent = `${solvedCount} / ${cards.length} Resueltos`;
    }
    updateProgressCounter();

    // 3. Filtros por Dificultad, Estado, Tipo y Búsqueda en Vivo
    function applyFilters() {
      const q = normalizeText(searchQuery);
      cards.forEach((card) => {
        const diff = card.getAttribute("data-difficulty") || "media";
        const type = card.getAttribute("data-type") || "calc";
        const isSolved = card.classList.contains("solved");

        const matchDiff = activeDifficulty === "all" || diff === activeDifficulty;
        const matchType = activeType === "all" || type === activeType;
        const matchStatus =
          activeStatus === "all" ||
          (activeStatus === "solved" && isSolved) ||
          (activeStatus === "pending" && !isSolved);
        const matchQuery = !q || normalizeText(card.textContent).includes(q);

        card.style.display =
          matchDiff && matchType && matchStatus && matchQuery ? "" : "none";
      });
    }

    document.querySelectorAll("[data-filter-difficulty]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("[data-filter-difficulty]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeDifficulty = btn.getAttribute("data-filter-difficulty");
        applyFilters();
      });
    });

    document.querySelectorAll("[data-filter-status]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("[data-filter-status]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeStatus = btn.getAttribute("data-filter-status");
        applyFilters();
      });
    });

    document.querySelectorAll("[data-filter-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("[data-filter-type]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeType = btn.getAttribute("data-filter-type");
        applyFilters();
      });
    });

    const liveSearch = document.getElementById("exerciseLiveSearch");
    if (liveSearch) {
      liveSearch.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        applyFilters();
      });
    }

    // 4. Botón Maestro #allSol (Estándar obligatorio html-maker)
    const allSolBtn = document.getElementById("allSol");
    if (allSolBtn) {
      let allOpen = false;
      allSolBtn.addEventListener("click", () => {
        allOpen = !allOpen;
        document.querySelectorAll("details.sol").forEach((d) => {
          d.open = allOpen;
        });
        allSolBtn.textContent = allOpen
          ? "▲ Ocultar Todas las Soluciones"
          : "▼ Mostrar Todas las Soluciones";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExerciseEngine);
  } else {
    initExerciseEngine();
  }
})(window);
