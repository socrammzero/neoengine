/**
 * NeoEngine — STORAGE.JS
 * Persistencia local híbrida (localStorage + IndexedDB) para progreso de temas,
 * ejercicios resueltos, código editado en sandboxes e historial de evaluaciones.
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "eng_workbench_state_v1";
  const DB_NAME = "NeoEngineDB";
  const DB_VERSION = 1;

  const defaultState = () => ({
    topicsRead: {},
    exercisesSolved: {},
    savedCode: {},
    examHistory: [],
    lastVisited: null,
    streakDays: 1,
    lastStudyDate: new Date().toISOString().slice(0, 10)
  });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (_) {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (state.lastStudyDate !== today) {
        state.streakDays = (state.streakDays || 1) + 1;
        state.lastStudyDate = today;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      syncIndexedDB(state);
      window.dispatchEvent(new CustomEvent("workbench:storage-updated", { detail: state }));
    } catch (_) {
      // Fallback silencioso en modo privado restringido
    }
  }

  function syncIndexedDB(state) {
    if (!("indexedDB" in window)) return;
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("snapshots")) {
          db.createObjectStore("snapshots", { keyPath: "id" });
        }
      };
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").put({ id: "latest", updatedAt: Date.now(), state });
      };
    } catch (_) {}
  }

  const WorkbenchStorage = {
    getState: loadState,

    markTopicRead(topicId, meta = {}) {
      const state = loadState();
      state.topicsRead[topicId] = {
        completedAt: new Date().toISOString(),
        title: meta.title || topicId,
        subjectId: meta.subjectId || ""
      };
      saveState(state);
      return state.topicsRead[topicId];
    },

    unmarkTopicRead(topicId) {
      const state = loadState();
      delete state.topicsRead[topicId];
      saveState(state);
    },

    isTopicRead(topicId) {
      const state = loadState();
      return Boolean(state.topicsRead[topicId]);
    },

    markExerciseSolved(exerciseId, meta = {}) {
      const state = loadState();
      const prev = state.exercisesSolved[exerciseId] || { attempts: 0 };
      state.exercisesSolved[exerciseId] = {
        solved: true,
        solvedAt: new Date().toISOString(),
        attempts: (prev.attempts || 0) + 1,
        subjectId: meta.subjectId || prev.subjectId || "",
        difficulty: meta.difficulty || prev.difficulty || "media",
        type: meta.type || prev.type || "code"
      };
      saveState(state);
      return state.exercisesSolved[exerciseId];
    },

    isExerciseSolved(exerciseId) {
      const state = loadState();
      return Boolean(state.exercisesSolved[exerciseId] && state.exercisesSolved[exerciseId].solved);
    },

    saveUserCode(srcKey, code) {
      const state = loadState();
      state.savedCode[srcKey] = {
        code,
        updatedAt: new Date().toISOString()
      };
      saveState(state);
    },

    getUserCode(srcKey) {
      const state = loadState();
      return state.savedCode[srcKey] ? state.savedCode[srcKey].code : null;
    },

    clearUserCode(srcKey) {
      const state = loadState();
      delete state.savedCode[srcKey];
      saveState(state);
    },

    recordExamAttempt(attempt) {
      const state = loadState();
      const entry = {
        id: "ex-" + Date.now(),
        date: new Date().toISOString(),
        subjectId: attempt.subjectId || "general",
        subjectName: attempt.subjectName || "Módulo Técnico",
        mode: attempt.mode || "examen",
        total: Number(attempt.total) || 10,
        correct: Number(attempt.correct) || 0,
        wrong: Number(attempt.wrong) || 0,
        blank: Number(attempt.blank) || 0,
        score: Number(attempt.score) || 0,
        durationSec: Number(attempt.durationSec) || 0
      };
      state.examHistory.unshift(entry);
      if (state.examHistory.length > 50) state.examHistory.length = 50;
      saveState(state);
      return entry;
    },

    getExamHistory(subjectId = null) {
      const state = loadState();
      if (!subjectId) return state.examHistory;
      return state.examHistory.filter((item) => item.subjectId === subjectId);
    },

    getStats() {
      const state = loadState();
      const topicsCount = Object.keys(state.topicsRead).length;
      const exercisesCount = Object.keys(state.exercisesSolved).length;
      const exams = state.examHistory || [];
      const avgScore =
        exams.length > 0
          ? (exams.reduce((acc, e) => acc + Number(e.score || 0), 0) / exams.length).toFixed(2)
          : "—";
      const bestScore =
        exams.length > 0
          ? Math.max(...exams.map((e) => Number(e.score || 0))).toFixed(2)
          : "—";

      return {
        topicsCount,
        exercisesCount,
        examsCount: exams.length,
        avgScore,
        bestScore,
        streakDays: state.streakDays || 1,
        savedSnippetsCount: Object.keys(state.savedCode).length
      };
    },

    resetAll() {
      const fresh = defaultState();
      saveState(fresh);
      return fresh;
    }
  };

  global.WorkbenchStorage = WorkbenchStorage;
})(window);
