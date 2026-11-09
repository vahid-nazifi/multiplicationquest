/**
 * Multiplication Quest - GameStorage Module
 * Complete localStorage abstraction with deep-merge fallbacks, dot-notation access,
 * session history tracking, and per-table performance metrics.
 */
const GameStorage = (() => {
  'use strict';

  const KEY = 'mquest_v1';

  /**
   * Generates a pristine copy of the default state.
   * Tables 1-10 are explicitly initialized.
   */
  const createDefaultState = () => {
    const state = {
      version: 1,
      playerName: 'Explorer',
      currentLevel: 1,
      totalXP: 0,
      totalStars: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      bestStreak: 0,
      currentStreak: 0, // cross-session streak (daily)
      achievements: [], // array of achievement IDs
      tableStats: {},
      sessionHistory: [], // last 30 sessions: { date, mode, score, accuracy, avgTime, stars, level }
      settings: {
        soundEnabled: true,
        musicEnabled: false, // off by default to not startle
        timerTickEnabled: false,
        timerVisibility: 'visible', // 'visible', 'icon', 'hidden'
        answerMode: 'multiple-choice', // or 'keypad'
        animationsEnabled: true,
        difficulty: 'adaptive',
      },
      adaptiveData: {
        timerDurations: {}, // level => current timer duration in ms
        sessionAccuracies: [], // last 10 session accuracies
        lastAdjustmentDate: null,
      },
      dailyChallenge: {
        lastDate: null,
        completed: false,
        streak: 0,
      },
      lastPlayDate: null,
    };

    for (let i = 1; i <= 10; i++) {
      state.tableStats[i] = { answered: 0, correct: 0, totalTime: 0, sessions: 0 };
    }

    return state;
  };

  /**
   * Performs a safe deep clone of serializable data.
   */
  const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(deepClone);
    }
    const cloned = {};
    for (const key of Object.keys(obj)) {
      cloned[key] = deepClone(obj[key]);
    }
    return cloned;
  };

  /**
   * Recursively merges source into target object without mutating target.
   * Preserves arrays from source rather than concatenating them.
   */
  const deepMerge = (target, source) => {
    const result = deepClone(target);
    if (!source || typeof source !== 'object') {
      return result;
    }
    for (const key of Object.keys(source)) {
      const sourceVal = source[key];
      if (sourceVal === undefined) {
        continue;
      }
      if (
        sourceVal !== null &&
        typeof sourceVal === 'object' &&
        !Array.isArray(sourceVal)
      ) {
        result[key] = deepMerge(
          result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
            ? result[key]
            : {},
          sourceVal
        );
      } else {
        result[key] = deepClone(sourceVal);
      }
    }
    return result;
  };

  /**
   * In-memory cache holding state if localStorage is unavailable or blocked.
   */
  let memoryCache = null;

  /**
   * Tests if localStorage is accessible in the current execution context.
   */
  const isLocalStorageAvailable = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const testKey = '__mquest_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * Internal loader: reads and parses state from localStorage,
   * merging any missing schema keys with default state values.
   */
  const loadState = () => {
    const defaults = createDefaultState();

    if (!isLocalStorageAvailable()) {
      if (!memoryCache) {
        memoryCache = defaults;
      }
      return deepClone(memoryCache);
    }

    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) {
        memoryCache = defaults;
        saveState(memoryCache);
        return deepClone(memoryCache);
      }

      const parsed = JSON.parse(raw);
      const merged = deepMerge(defaults, parsed);

      // Guarantee all standard tables 1-10 exist in tableStats
      for (let i = 1; i <= 10; i++) {
        if (!merged.tableStats[i]) {
          merged.tableStats[i] = { answered: 0, correct: 0, totalTime: 0, sessions: 0 };
        }
      }

      memoryCache = merged;
      return deepClone(memoryCache);
    } catch (err) {
      console.warn('[GameStorage] Failed to parse stored state, falling back to defaults:', err);
      memoryCache = defaults;
      return deepClone(memoryCache);
    }
  };

  /**
   * Internal saver: writes serialized state to localStorage and keeps cache updated.
   */
  const saveState = (stateToSave) => {
    memoryCache = deepClone(stateToSave);

    if (!isLocalStorageAvailable()) {
      return true;
    }

    try {
      const serialized = JSON.stringify(memoryCache);
      window.localStorage.setItem(KEY, serialized);
      return true;
    } catch (err) {
      console.error('[GameStorage] Failed to save state to localStorage:', err);
      return false;
    }
  };

  // Pre-load on startup
  loadState();

  return {
    /**
     * Returns full state merged with defaults for missing keys.
     * Always returns an isolated deep clone to prevent direct outside mutations.
     * @returns {Object} Full game state
     */
    getState() {
      return loadState();
    },

    /**
     * Partially updates state and persists changes.
     * @param {Object} updates - Subset of state to merge
     * @returns {Object} Updated state clone
     */
    setState(updates) {
      if (!updates || typeof updates !== 'object') {
        return loadState();
      }
      const current = loadState();
      const updated = deepMerge(current, updates);
      saveState(updated);
      return deepClone(updated);
    },

    /**
     * Dot-notation path getter.
     * e.g., get('settings.soundEnabled') or get('adaptiveData.timerDurations.2')
     * @param {string} path - Dot-separated property path
     * @returns {*} Value at path or undefined
     */
    get(path) {
      if (typeof path !== 'string' || !path.trim()) {
        return undefined;
      }
      const state = loadState();
      const parts = path.split('.');
      let current = state;

      for (let i = 0; i < parts.length; i++) {
        const key = parts[i];
        if (current === null || current === undefined || typeof current !== 'object') {
          return undefined;
        }
        current = current[key];
      }

      return deepClone(current);
    },

    /**
     * Dot-notation path setter.
     * e.g., set('settings.soundEnabled', false)
     * @param {string} path - Dot-separated property path
     * @param {*} value - Value to set
     * @returns {boolean} True if successfully updated and saved
     */
    set(path, value) {
      if (typeof path !== 'string' || !path.trim()) {
        return false;
      }
      const state = loadState();
      const parts = path.split('.');
      let current = state;

      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
          current[key] = {};
        }
        current = current[key];
      }

      const finalKey = parts[parts.length - 1];
      current[finalKey] = deepClone(value);

      return saveState(state);
    },

    /**
     * Serializes and saves state to storage.
     * @param {Object} state - Complete state object to save
     * @returns {boolean} True if successfully written
     */
    save(state) {
      if (!state || typeof state !== 'object') {
        return false;
      }
      return saveState(state);
    },

    /**
     * Resets game progress to defaults, but preserves player settings.
     * @returns {Object} Reset state clone
     */
    reset() {
      const currentState = loadState();
      const freshDefaults = createDefaultState();

      // Preserve player settings across standard reset
      freshDefaults.settings = deepClone(currentState.settings || freshDefaults.settings);
      freshDefaults.playerName = currentState.playerName || freshDefaults.playerName;

      saveState(freshDefaults);
      return deepClone(freshDefaults);
    },

    /**
     * Completely resets all state, including settings, back to factory defaults.
     * @returns {Object} Fresh default state clone
     */
    resetAll() {
      const freshDefaults = createDefaultState();
      saveState(freshDefaults);
      return deepClone(freshDefaults);
    },

    /**
     * Appends a session to sessionHistory, keeping only the last 30 entries.
     * @param {Object} sessionData - { date, mode, score, accuracy, avgTime, stars, level, ... }
     * @returns {Object} Updated sessionHistory array clone
     */
    addSession(sessionData) {
      if (!sessionData || typeof sessionData !== 'object') {
        return loadState().sessionHistory;
      }

      const state = loadState();
      const session = {
        date: sessionData.date || new Date().toISOString(),
        mode: sessionData.mode || 'practice',
        score: typeof sessionData.score === 'number' ? sessionData.score : 0,
        accuracy: typeof sessionData.accuracy === 'number' ? sessionData.accuracy : 0,
        avgTime: typeof sessionData.avgTime === 'number' ? sessionData.avgTime : 0,
        stars: typeof sessionData.stars === 'number' ? sessionData.stars : 0,
        level: typeof sessionData.level === 'number' ? sessionData.level : state.currentLevel,
        questionsCount: typeof sessionData.questionsCount === 'number' ? sessionData.questionsCount : 0,
        correctCount: typeof sessionData.correctCount === 'number' ? sessionData.correctCount : 0,
      };

      if (!Array.isArray(state.sessionHistory)) {
        state.sessionHistory = [];
      }

      state.sessionHistory.push(session);

      // Keep only the last 30 sessions
      if (state.sessionHistory.length > 30) {
        state.sessionHistory = state.sessionHistory.slice(-30);
      }

      saveState(state);
      return deepClone(state.sessionHistory);
    },

    /**
     * Updates statistics for a specific multiplication table.
     * @param {number|string} table - Table number (1-10)
     * @param {boolean} isCorrect - Whether question was answered correctly
     * @param {number} time - Time taken to answer in milliseconds
     * @returns {Object} Updated table stats clone
     */
    updateTableStat(table, isCorrect, time) {
      const tableNum = parseInt(table, 10);
      if (isNaN(tableNum) || tableNum < 1) {
        return null;
      }

      const state = loadState();
      if (!state.tableStats[tableNum]) {
        state.tableStats[tableNum] = { answered: 0, correct: 0, totalTime: 0, sessions: 0 };
      }

      const stat = state.tableStats[tableNum];
      stat.answered += 1;
      if (isCorrect) {
        stat.correct += 1;
      }
      const timeMs = typeof time === 'number' && time >= 0 ? time : 0;
      stat.totalTime += timeMs;

      saveState(state);
      return deepClone(stat);
    },

    /**
     * Returns accuracy (0 to 1) for a specific table.
     * @param {number|string} table - Table number (1-10)
     * @returns {number} Accuracy between 0 and 1
     */
    getTableAccuracy(table) {
      const tableNum = parseInt(table, 10);
      const state = loadState();
      const stat = state.tableStats && state.tableStats[tableNum];
      if (!stat || stat.answered === 0) {
        return 0;
      }
      return stat.correct / stat.answered;
    },

    /**
     * Computes overall accuracy (0 to 1) across all questions answered.
     * @returns {number} Overall accuracy between 0 and 1
     */
    getOverallAccuracy() {
      const state = loadState();
      if (state.totalQuestionsAnswered > 0) {
        return state.totalCorrectAnswers / state.totalQuestionsAnswered;
      }

      // Fallback: sum up all table stats
      let totalAnswered = 0;
      let totalCorrect = 0;
      if (state.tableStats) {
        for (const key of Object.keys(state.tableStats)) {
          const t = state.tableStats[key];
          if (t && typeof t.answered === 'number') {
            totalAnswered += t.answered;
            totalCorrect += (t.correct || 0);
          }
        }
      }

      return totalAnswered > 0 ? totalCorrect / totalAnswered : 0;
    },
  };
})();

// Attach to global window
window.GameStorage = GameStorage;
