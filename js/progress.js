/**
 * Multiplication Quest - Progress Module
 * Manages player progression, level definitions, XP rewards, level unlock requirements,
 * session records, and both in-game and daily streak tracking.
 */
const Progress = (() => {
  'use strict';

  // Level definitions with unlocked tables, timers, and minimum XP
  const LEVELS = [
    { level: 1, name: 'Multiplication Explorer', tables: [1, 2, 10], timer: null, minXP: 0 },
    { level: 2, name: 'Number Adventurer', tables: [2, 3, 4, 5, 10], timer: 30000, minXP: 100 },
    { level: 3, name: 'Multiplication Hero', tables: [1, 2, 3, 4, 5], timer: 25000, minXP: 300 },
    { level: 4, name: 'Math Champion', tables: [1, 2, 3, 4, 5, 6, 7], timer: 20000, minXP: 600 },
    { level: 5, name: 'Math Superstar', tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], timer: 15000, minXP: 1000 },
    { level: 6, name: 'Multiplication Master', tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], timer: null, minXP: 1500 }, // adaptive
  ];

  // XP rewards structure
  const XP = {
    correct: 10,
    streak3: 5,
    streak5: 10,
    streak10: 20,
    speedBonus: 5, // per second under par time
    perfectRound: 50,
    levelComplete: 100,
  };

  // Ephemeral in-game consecutive correct answer streak
  let currentInGameStreak = 0;

  /**
   * Helper to retrieve GameStorage safely.
   */
  const getStorage = () => {
    return window.GameStorage || (typeof GameStorage !== 'undefined' ? GameStorage : null);
  };

  /**
   * Returns current calendar date in 'YYYY-MM-DD' format.
   */
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * Returns level definition object for given level number.
   * Clamps level between 1 and 6. Defaults to current level if omitted.
   * @param {number} [level]
   * @returns {Object} Level definition
   */
  const getLevelInfo = (level) => {
    const targetLevel = typeof level === 'number' ? level : getCurrentLevel();
    const clampedLevel = Math.max(1, Math.min(LEVELS.length, Math.floor(targetLevel)));
    return { ...LEVELS[clampedLevel - 1] };
  };

  /**
   * Returns the player's current level number from storage.
   * @returns {number}
   */
  const getCurrentLevel = () => {
    const storage = getStorage();
    if (!storage) return 1;
    const lvl = storage.get('currentLevel');
    return typeof lvl === 'number' && lvl >= 1 ? Math.min(lvl, LEVELS.length) : 1;
  };

  /**
   * Returns the list of active multiplication tables for a given level.
   * @param {number} [level]
   * @returns {Array<number>}
   */
  const getTables = (level) => {
    const info = getLevelInfo(level);
    return [...info.tables];
  };

  /**
   * Returns timer duration in milliseconds for the given level.
   * Considers adaptive timer settings for level 6 or saved adaptive adjustments.
   * @param {number} [level]
   * @returns {number|null} Duration in ms, or null if untimed
   */
  const getTimerDuration = (level) => {
    const targetLevel = typeof level === 'number' ? level : getCurrentLevel();
    const storage = getStorage();

    // Check if adaptive system provides or overrides the duration
    if (window.Adaptive && typeof window.Adaptive.getTimerDuration === 'function') {
      const adaptiveTimer = window.Adaptive.getTimerDuration(targetLevel);
      if (adaptiveTimer !== undefined) {
        return adaptiveTimer;
      }
    }

    if (storage) {
      const storedAdaptive = storage.get(`adaptiveData.timerDurations.${targetLevel}`);
      if (typeof storedAdaptive === 'number') {
        return storedAdaptive;
      }
    }

    const info = getLevelInfo(targetLevel);
    return info.timer;
  };

  /**
   * Returns minimum XP required to reach a specific level.
   * @param {number} level
   * @returns {number}
   */
  const getXPForLevel = (level) => {
    const clamped = Math.max(1, Math.min(LEVELS.length, Math.floor(level)));
    return LEVELS[clamped - 1].minXP;
  };

  /**
   * Computes progress toward unlocking the next level.
   * @returns {{ current: number, needed: number, percentage: number, currentXP: number, nextLevelXP: number }}
   */
  const getXPProgress = () => {
    const storage = getStorage();
    const totalXP = storage ? (storage.get('totalXP') || 0) : 0;
    const currentLevel = getCurrentLevel();

    if (currentLevel >= LEVELS.length) {
      const maxMinXP = LEVELS[LEVELS.length - 1].minXP;
      return {
        current: totalXP - maxMinXP,
        needed: 0,
        percentage: 100,
        currentXP: totalXP,
        nextLevelXP: maxMinXP,
        isMaxLevel: true,
      };
    }

    const currentLevelMinXP = LEVELS[currentLevel - 1].minXP;
    const nextLevelMinXP = LEVELS[currentLevel].minXP;
    const needed = nextLevelMinXP - currentLevelMinXP;
    const current = Math.max(0, totalXP - currentLevelMinXP);
    const percentage = Math.min(100, Math.max(0, Math.round((current / needed) * 100)));

    return {
      current,
      needed,
      percentage,
      currentXP: totalXP,
      nextLevelXP: nextLevelMinXP,
      isMaxLevel: false,
    };
  };

  /**
   * Adds XP, checks if the player qualifies for level-up, updates storage.
   * @param {number} amount
   * @returns {{ newXP: number, leveledUp: boolean, newLevel: number, oldLevel: number }}
   */
  const addXP = (amount) => {
    const storage = getStorage();
    const xpGain = typeof amount === 'number' && amount > 0 ? Math.floor(amount) : 0;
    if (!storage) {
      return { newXP: xpGain, leveledUp: false, newLevel: 1, oldLevel: 1 };
    }

    const oldXP = storage.get('totalXP') || 0;
    const newXP = oldXP + xpGain;
    const oldLevel = getCurrentLevel();

    // Determine the highest level unlocked based on newXP
    let newLevel = oldLevel;
    for (let i = LEVELS.length; i >= 1; i--) {
      if (newXP >= LEVELS[i - 1].minXP) {
        newLevel = Math.max(oldLevel, i);
        break;
      }
    }

    const leveledUp = newLevel > oldLevel;

    storage.setState({
      totalXP: newXP,
      currentLevel: newLevel,
    });

    return {
      newXP,
      leveledUp,
      newLevel,
      oldLevel,
    };
  };

  /**
   * Adds stars to player total and persists.
   * @param {number} count
   * @returns {number} New total stars
   */
  const addStars = (count) => {
    const storage = getStorage();
    const starCount = typeof count === 'number' && count > 0 ? Math.floor(count) : 0;
    if (!storage) return starCount;

    const currentStars = storage.get('totalStars') || 0;
    const newStars = currentStars + starCount;
    storage.set('totalStars', newStars);
    return newStars;
  };

  /**
   * Evaluates if player should advance to next level based on session metrics or XP.
   * @param {Object} [sessionStats] - { accuracy, questionsCount, ... }
   * @returns {boolean} True if level unlock condition is met
   */
  const checkLevelUnlock = (sessionStats) => {
    const currentLevel = getCurrentLevel();
    if (currentLevel >= LEVELS.length) {
      return false;
    }

    const storage = getStorage();
    const totalXP = storage ? (storage.get('totalXP') || 0) : 0;
    const nextLevelMinXP = LEVELS[currentLevel].minXP;

    // Check XP-based unlock
    if (totalXP >= nextLevelMinXP) {
      return true;
    }

    // Check session performance unlock (>= 80% accuracy with at least 5 questions)
    if (sessionStats && typeof sessionStats === 'object') {
      const accuracy = typeof sessionStats.accuracy === 'number' ? sessionStats.accuracy : 0;
      const count = typeof sessionStats.questionsCount === 'number' ? sessionStats.questionsCount : 0;
      if (accuracy >= 0.8 && count >= 5) {
        return true;
      }
    }

    // Check adaptive advancement if available
    if (window.Adaptive && typeof window.Adaptive.checkLevelAdvancement === 'function' && storage) {
      const history = storage.get('sessionHistory') || [];
      const currentLevelSessions = history.filter((s) => s.level === currentLevel).slice(-3);
      if (window.Adaptive.checkLevelAdvancement(currentLevel, currentLevelSessions)) {
        return true;
      }
    }

    return false;
  };

  /**
   * Updates daily streak by comparing last play date with current date.
   * @returns {number} Current daily streak count
   */
  const updateDailyStreak = () => {
    const storage = getStorage();
    if (!storage) return 1;

    const todayStr = getTodayDateString();
    const lastPlayDate = storage.get('lastPlayDate');
    let streak = storage.get('currentStreak') || 0;
    let bestStreak = storage.get('bestStreak') || 0;

    if (!lastPlayDate) {
      // First play ever
      streak = 1;
    } else if (lastPlayDate === todayStr) {
      // Already played today, preserve current streak
      streak = Math.max(1, streak);
    } else {
      const today = new Date(todayStr);
      const last = new Date(lastPlayDate);
      const diffMs = today.getTime() - last.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive calendar day
        streak += 1;
      } else {
        // Missed one or more days, streak resets to 1
        streak = 1;
      }
    }

    if (streak > bestStreak) {
      bestStreak = streak;
    }

    storage.setState({
      lastPlayDate: todayStr,
      currentStreak: streak,
      bestStreak: bestStreak,
    });

    return streak;
  };

  /**
   * Retrieves player's current daily streak.
   * @returns {number}
   */
  const getDailyStreak = () => {
    const storage = getStorage();
    if (!storage) return 0;
    return storage.get('currentStreak') || 0;
  };

  /**
   * Returns current in-game consecutive correct streak.
   * @returns {number}
   */
  const getInGameStreak = () => {
    return currentInGameStreak;
  };

  /**
   * Resets in-game consecutive correct streak to 0.
   * @returns {number}
   */
  const resetInGameStreak = () => {
    currentInGameStreak = 0;
    return currentInGameStreak;
  };

  /**
   * Increments in-game streak by 1 and updates best streak in storage if surpassed.
   * @returns {number} New in-game streak
   */
  const incrementInGameStreak = () => {
    currentInGameStreak += 1;
    const storage = getStorage();
    if (storage) {
      const best = storage.get('bestStreak') || 0;
      if (currentInGameStreak > best) {
        storage.set('bestStreak', currentInGameStreak);
      }
    }
    return currentInGameStreak;
  };

  /**
   * Records completed game session, updates questions/correct counters, awards XP/stars,
   * updates daily streak, and checks for level progression.
   * @param {Object} sessionData
   * @returns {Object} Complete session summary including XP gained and level status
   */
  const recordSession = (sessionData) => {
    const storage = getStorage();
    if (!storage || !sessionData) {
      return { success: false };
    }

    const questionsCount = sessionData.questionsCount || 0;
    const correctCount = sessionData.correctCount || 0;
    const starsEarned = sessionData.stars || 0;
    const accuracy = questionsCount > 0 ? correctCount / questionsCount : 0;

    // Calculate base and bonus XP for this session
    let earnedXP = sessionData.xp || 0;
    if (!earnedXP) {
      earnedXP = correctCount * XP.correct;
      if (accuracy === 1.0 && questionsCount >= 5) {
        earnedXP += XP.perfectRound;
      }
    }

    // Update cumulative player totals
    const currentTotalQ = storage.get('totalQuestionsAnswered') || 0;
    const currentTotalC = storage.get('totalCorrectAnswers') || 0;

    storage.setState({
      totalQuestionsAnswered: currentTotalQ + questionsCount,
      totalCorrectAnswers: currentTotalC + correctCount,
    });

    // Update daily streak
    const dailyStreak = updateDailyStreak();

    // Award XP and stars
    const xpResult = addXP(earnedXP);
    if (starsEarned > 0) {
      addStars(starsEarned);
    }

    // Save session to history
    const sessionRecord = {
      date: sessionData.date || new Date().toISOString(),
      mode: sessionData.mode || 'practice',
      score: sessionData.score || 0,
      accuracy: Number(accuracy.toFixed(3)),
      avgTime: sessionData.avgTime || 0,
      stars: starsEarned,
      level: sessionData.level || getCurrentLevel(),
      questionsCount,
      correctCount,
      earnedXP,
    };

    storage.addSession(sessionRecord);

    // Feed adaptive engine if available
    if (window.Adaptive && typeof window.Adaptive.adjustAfterSession === 'function') {
      window.Adaptive.adjustAfterSession(sessionRecord.level, {
        accuracy: sessionRecord.accuracy,
        avgTime: sessionRecord.avgTime,
        timerDuration: getTimerDuration(sessionRecord.level),
        correctCount: sessionRecord.correctCount,
        questionsCount: sessionRecord.questionsCount,
      });
    }

    return {
      session: sessionRecord,
      xpGained: earnedXP,
      totalXP: xpResult.newXP,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
      dailyStreak,
    };
  };

  /**
   * Returns a complete statistics snapshot for dashboards and UI displays.
   * @returns {Object}
   */
  const getStats = () => {
    const storage = getStorage();
    const currentLevel = getCurrentLevel();
    const levelInfo = getLevelInfo(currentLevel);

    if (!storage) {
      return {
        playerName: 'Explorer',
        currentLevel,
        levelName: levelInfo.name,
        totalXP: 0,
        totalStars: 0,
        totalQuestionsAnswered: 0,
        totalCorrectAnswers: 0,
        accuracy: 0,
        inGameStreak: currentInGameStreak,
        bestStreak: 0,
        dailyStreak: 0,
        xpProgress: getXPProgress(),
        tables: getTables(currentLevel),
      };
    }

    const state = storage.getState();
    const accuracy = storage.getOverallAccuracy();

    return {
      playerName: state.playerName || 'Explorer',
      currentLevel,
      levelName: levelInfo.name,
      totalXP: state.totalXP || 0,
      totalStars: state.totalStars || 0,
      totalQuestionsAnswered: state.totalQuestionsAnswered || 0,
      totalCorrectAnswers: state.totalCorrectAnswers || 0,
      accuracy: Number((accuracy * 100).toFixed(1)),
      inGameStreak: currentInGameStreak,
      bestStreak: state.bestStreak || 0,
      dailyStreak: state.currentStreak || 0,
      xpProgress: getXPProgress(),
      tables: getTables(currentLevel),
      tableStats: state.tableStats || {},
      recentSessions: (state.sessionHistory || []).slice(-5).reverse(),
    };
  };

  return {
    LEVELS,
    XP,
    getLevelInfo,
    getCurrentLevel,
    getTables,
    getTimerDuration,
    addXP,
    addStars,
    getXPForLevel,
    getXPProgress,
    checkLevelUnlock,
    recordSession,
    getDailyStreak,
    updateDailyStreak,
    getInGameStreak,
    resetInGameStreak,
    incrementInGameStreak,
    getStats,
  };
})();

// Attach to global window
window.Progress = Progress;
