/**
 * NeoEngine — EXAM-ENGINE.JS
 * Simulador de Evaluación Tipo Test (evaluacion/examen-test.html):
 *  - Doble Modalidad:
 *      1. Modo Práctica: Corrección inmediata pregunta a pregunta con justificación técnica.
 *      2. Modo Examen: Cronómetro activo, barajado Fisher-Yates desde banco-preguntas.json y acta final.
 *  - Cálculo exacto con penalización (Sección 6.C de PLAN.md):
 *      Calificación = max(0, (A - E / (k - 1)) * (10 / N))
 */
(function (global) {
  "use strict";

  function shuffleArray(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function cloneAndPrepareQuestions(sourceList, shuffleQuestions = false, shuffleOptions = false) {
    const list = sourceList.map((item) => {
      const q = { ...item, options: item.options.slice() };
      if (!shuffleOptions) return q;
      const originalCorrectText = item.options[item.answer];
      for (let i = q.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
      }
      q.answer = q.options.indexOf(originalCorrectText);
      return q;
    });
    return shuffleQuestions ? shuffleArray(list) : list;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  async function loadQuestionBank(container) {
    const bankUrl = container.getAttribute("data-bank") || "./banco-preguntas.json";
    try {
      const res = await fetch(bankUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
        if (data && Array.isArray(data.questions)) return data.questions;
      }
    } catch (_) {}

    const fallbackScript = document.getElementById("examBankFallback");
    if (fallbackScript) {
      try {
        const parsed = JSON.parse(fallbackScript.textContent);
        return Array.isArray(parsed) ? parsed : parsed.questions || [];
      } catch (_) {}
    }
    return [];
  }

  async function initExamSimulator() {
    const rootEl = document.getElementById("examSimulatorRoot");
    if (!rootEl) return;

    const subjectId = document.body.getAttribute("data-subject-id") || "asignatura-01";
    const subjectName =
      document.body.getAttribute("data-subject-name") || "Módulo de Ingeniería";
    const rawQuestions = await loadQuestionBank(rootEl);
    if (!rawQuestions.length) {
      rootEl.innerHTML = `<div class="warn"><strong class="tag">Error de Carga</strong>No se pudo cargar el banco de preguntas del módulo.</div>`;
      return;
    }

    let mode = "practica"; // "practica" | "examen"
    let questions = rawQuestions.slice();
    let answers = {}; // { [qIndex]: selectedOptionIndex }
    let graded = false;
    let timerSeconds = 25 * 60;
    let elapsedSeconds = 0;
    let timerInterval = null;

    const modePracticaBtn = document.getElementById("modePracticaBtn");
    const modeExamenBtn = document.getElementById("modeExamenBtn");
    const shuffleBtn = document.getElementById("examShuffleBtn");
    const finishBtn = document.getElementById("examFinishBtn");
    const allSolBtn = document.getElementById("allSol");
    const timerDisplay = document.getElementById("examTimerDisplay");
    const matrixContainer = document.getElementById("examQuestionMatrix");
    const questionsContainer = document.getElementById("examQuestionsList");
    const scoreboardBox = document.getElementById("examScoreboard");
    const historyBody = document.getElementById("examHistoryTableBody");

    function startTimer() {
      stopTimer();
      timerSeconds = 25 * 60;
      elapsedSeconds = 0;
      if (timerDisplay) timerDisplay.textContent = formatTime(timerSeconds);
      timerInterval = setInterval(() => {
        if (graded) return;
        elapsedSeconds++;
        if (mode === "examen") {
          timerSeconds = Math.max(0, timerSeconds - 1);
          if (timerDisplay) timerDisplay.textContent = formatTime(timerSeconds);
          if (timerSeconds === 0) {
            gradeExam();
          }
        } else {
          if (timerDisplay) timerDisplay.textContent = formatTime(elapsedSeconds);
        }
      }, 1000);
    }

    function stopTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }

    function computeMetrics() {
      const N = questions.length;
      const k = 4;
      let A = 0;
      let E = 0;
      let blank = 0;

      questions.forEach((q, idx) => {
        const sel = answers[idx];
        if (sel === undefined || sel === null) {
          blank++;
        } else if (sel === q.answer) {
          A++;
        } else {
          E++;
        }
      });

      const penalty = E / (k - 1);
      const netHits = A - penalty;
      const score = Math.max(0, netHits * (10 / N));
      return { N, k, A, E, blank, penalty, score };
    }

    function updateLiveScoreboard() {
      const { N, A, E, blank, penalty, score } = computeMetrics();
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };
      setVal("statTotalQ", N);
      setVal("statHits", A);
      setVal("statErrors", E);
      setVal("statBlank", blank);
      setVal("statPenalty", "-" + penalty.toFixed(2));
      setVal("statFinalScore", graded || mode === "practica" ? score.toFixed(2) + " / 10" : "En curso");

      const scoreCard = document.getElementById("statScoreCard");
      if (scoreCard && (graded || mode === "practica")) {
        scoreCard.className = score >= 5.0 ? "ro good" : "ro badv";
      }
    }

    function renderMatrix() {
      if (!matrixContainer) return;
      matrixContainer.innerHTML = questions
        .map((q, idx) => {
          const sel = answers[idx];
          let cls = "q-matrix-btn";
          if (sel !== undefined) {
            if (mode === "practica" || graded) {
              cls += sel === q.answer ? " correct" : " wrong";
            } else {
              cls += " answered";
            }
          }
          return `<button type="button" class="${cls}" data-jump="${idx}">P${idx + 1}</button>`;
        })
        .join("");

      matrixContainer.querySelectorAll("[data-jump]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = document.getElementById(`q-card-${btn.dataset.jump}`);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    }

    function renderQuestions() {
      if (!questionsContainer) return;
      const letters = ["A", "B", "C", "D"];

      questionsContainer.innerHTML = questions
        .map((q, qIdx) => {
          const sel = answers[qIdx];
          const showResult = graded || (mode === "practica" && sel !== undefined);

          const optsHtml = q.options
            .map((optText, oIdx) => {
              let cls = "q-option";
              if (sel === oIdx) cls += " selected";
              if (showResult) {
                if (oIdx === q.answer) cls += " correct";
                else if (sel === oIdx && oIdx !== q.answer) cls += " wrong";
              }
              return `
                <button type="button" class="${cls}" data-q="${qIdx}" data-opt="${oIdx}" ${
                graded ? "disabled" : ""
              }>
                  <span class="pill" style="font-weight:700;min-width:28px;justify-content:center;">${
                    letters[oIdx] || oIdx + 1
                  }</span>
                  <span>${optText}</span>
                </button>
              `;
            })
            .join("");

          return `
            <article class="card" id="q-card-${qIdx}" style="scroll-margin-top:5rem;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;margin-bottom:0.65rem;flex-wrap:wrap;">
                <span class="pill accent">Cuestión #${qIdx + 1} · ${q.topic || " Evaluable"}</span>
                <span class="pill">${q.difficulty || "Nivel Examen"} · Penalización -0.33 Aciertos</span>
              </div>
              <h3 style="font-size:1.1rem;font-family:var(--f-body);font-weight:600;margin-bottom:0.9rem;">${
                q.question
              }</h3>
              <div class="q-options-wrap">${optsHtml}</div>
              <details class="sol" style="margin-top:0.85rem;" ${showResult ? "open" : ""}>
                <summary>Justificación Técnica y Resolución</summary>
                <div style="font-size:0.9rem;color:var(--ink);">
                  <p style="margin:0 0 0.4rem;"><strong>Respuesta Correcta: Opción ${
                    letters[q.answer]
                  }.</strong></p>
                  <p style="margin:0;color:var(--muted);">${q.explanation}</p>
                </div>
              </details>
            </article>
          `;
        })
        .join("");

      questionsContainer.querySelectorAll(".q-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (graded) return;
          const qIdx = Number(btn.getAttribute("data-q"));
          const oIdx = Number(btn.getAttribute("data-opt"));
          if (answers[qIdx] === oIdx && mode === "examen") {
            delete answers[qIdx]; // Permitir dejar en blanco en modo examen
          } else {
            answers[qIdx] = oIdx;
          }
          renderQuestions();
          renderMatrix();
          updateLiveScoreboard();
        });
      });
    }

    function renderHistory() {
      if (!historyBody || !global.WorkbenchStorage) return;
      const list = global.WorkbenchStorage.getExamHistory(subjectId);
      if (list.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);">Aún no hay simulacros registrados en este módulo. Finaliza una evaluación para guardar métricas.</td></tr>`;
        return;
      }
      historyBody.innerHTML = list
        .slice(0, 8)
        .map(
          (item) => `
          <tr class="${item.score >= 5 ? "hi" : ""}">
            <td>${new Date(item.date).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</td>
            <td>${item.mode.toUpperCase()}</td>
            <td>${item.correct} / ${item.total}</td>
            <td>${item.wrong}</td>
            <td>${item.blank}</td>
            <td><strong>${Number(item.score).toFixed(2)} / 10</strong></td>
          </tr>
        `
        )
        .join("");
    }

    function gradeExam() {
      graded = true;
      stopTimer();
      const metrics = computeMetrics();
      renderQuestions();
      renderMatrix();
      updateLiveScoreboard();

      if (global.WorkbenchStorage) {
        global.WorkbenchStorage.recordExamAttempt({
          subjectId,
          subjectName,
          mode,
          total: metrics.N,
          correct: metrics.A,
          wrong: metrics.E,
          blank: metrics.blank,
          score: Number(metrics.score.toFixed(2)),
          durationSec: elapsedSeconds
        });
      }
      renderHistory();
      if (scoreboardBox) {
        scoreboardBox.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function resetSession(newMode, doShuffle = false) {
      mode = newMode;
      graded = false;
      answers = {};
      questions = cloneAndPrepareQuestions(rawQuestions, doShuffle, doShuffle);

      if (modePracticaBtn && modeExamenBtn) {
        modePracticaBtn.classList.toggle("active", mode === "practica");
        modeExamenBtn.classList.toggle("active", mode === "examen");
      }

      renderQuestions();
      renderMatrix();
      updateLiveScoreboard();
      startTimer();
    }

    const clearHistoryBtn = document.getElementById("clearExamHistoryBtn");
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener("click", () => {
        if (!global.WorkbenchStorage) return;
        const currentList = global.WorkbenchStorage.getExamHistory(subjectId);
        if (!currentList || currentList.length === 0) {
          alert("No hay registros en el historial para borrar.");
          return;
        }
        if (window.confirm("¿Desea eliminar todo el historial de evaluaciones de este módulo? Esta acción no se puede deshacer.")) {
          global.WorkbenchStorage.clearExamHistory(subjectId);
          renderHistory();
        }
      });
    }

    if (modePracticaBtn) {
      modePracticaBtn.addEventListener("click", () => resetSession("practica", false));
    }
    if (modeExamenBtn) {
      modeExamenBtn.addEventListener("click", () => resetSession("examen", true));
    }
    if (shuffleBtn) {
      shuffleBtn.addEventListener("click", () => resetSession(mode, true));
    }
    if (finishBtn) {
      finishBtn.addEventListener("click", gradeExam);
    }

    if (allSolBtn) {
      let openAll = false;
      allSolBtn.addEventListener("click", () => {
        openAll = !openAll;
        document.querySelectorAll("details.sol").forEach((d) => {
          d.open = openAll;
        });
        allSolBtn.innerHTML = openAll
          ? "<span class='all-sol-full'>▲ Ocultar Todas las Soluciones</span><span class='all-sol-short'>▲ Ocultar</span>"
          : "<span class='all-sol-full'>▼ Mostrar Todas las Soluciones</span><span class='all-sol-short'>▼ Soluciones</span>";
      });
    }

    renderHistory();
    resetSession("practica", false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExamSimulator);
  } else {
    initExamSimulator();
  }
})(window);
