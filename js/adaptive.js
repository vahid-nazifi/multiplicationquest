/**
 * Multiplication Quest - Adaptive Difficulty Engine
 * Dynamically adjusts question timers, balances table selection weights,
 * provides pedagogically sound hints for children, and generates encouraging feedback.
 */
const Adaptive = (() => {
  'use strict';

  // Base timer durations per level in milliseconds
  const BASE_TIMERS = {
    1: null,   // Untimed practice for Level 1
    2: 30000,  // 30 seconds
    3: 25000,  // 25 seconds
    4: 20000,  // 20 seconds
    5: 15000,  // 15 seconds
    6: 12000,  // 12 seconds base, starts adaptive tuning
  };

  const MIN_TIMER = 8000;   // Never go below 8 seconds
  const MAX_TIMER = 45000;  // Never go above 45 seconds
  const ADJUSTMENT_STEP_UP = 2000;   // Reduce timer by 2s when doing exceptionally well
  const ADJUSTMENT_STEP_DOWN = 3000; // Increase timer by 3s when struggling

  /**
   * Helper to retrieve GameStorage safely.
   */
  const getStorage = () => {
    return window.GameStorage || (typeof GameStorage !== 'undefined' ? GameStorage : null);
  };

  /**
   * Retrieves effective timer duration for a level, incorporating adaptive tuning.
   * @param {number} level - Level number (1-6)
   * @returns {number|null} Duration in milliseconds, or null if untimed
   */
  const getTimerDuration = (level) => {
    const lvl = typeof level === 'number' ? Math.floor(level) : 1;
    if (lvl === 1 || BASE_TIMERS[lvl] === null) {
      return null;
    }

    const storage = getStorage();
    if (storage) {
      const storedDuration = storage.get(`adaptiveData.timerDurations.${lvl}`);
      if (typeof storedDuration === 'number') {
        return Math.max(MIN_TIMER, Math.min(MAX_TIMER, storedDuration));
      }
    }

    const base = BASE_TIMERS[lvl];
    return typeof base === 'number' ? base : 15000;
  };

  /**
   * Computes selection weights for multiplication tables based on player accuracy.
   * Weak tables (<60% accuracy or untested) get 3x weight, 60-80% get 2x weight, >80% get 1x weight.
   * @param {Object} [tableStats] - Current tableStats map from storage
   * @param {Array<number>} [allowedTables] - Tables allowed in current level
   * @returns {Object} Map of { [table]: weight }
   */
  const getTableWeights = (tableStats, allowedTables) => {
    const tables = Array.isArray(allowedTables) && allowedTables.length > 0
      ? allowedTables
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const stats = tableStats || (getStorage() ? getStorage().get('tableStats') || {} : {});
    const weights = {};

    for (const table of tables) {
      const tNum = parseInt(table, 10);
      const stat = stats[tNum];

      if (!stat || typeof stat.answered !== 'number' || stat.answered === 0) {
        // Untested table: high priority to explore and assess
        weights[tNum] = 3;
      } else {
        const accuracy = stat.correct / stat.answered;
        if (accuracy < 0.6) {
          weights[tNum] = 3; // Needs significant practice
        } else if (accuracy < 0.8) {
          weights[tNum] = 2; // Moderate practice
        } else {
          weights[tNum] = 1; // Mastered table
        }
      }
    }

    return weights;
  };

  /**
   * Selects a table using weighted random distribution.
   * @param {Object} weights - Map of { [table]: weight }
   * @returns {number} Selected table number
   */
  const selectWeightedTable = (weights) => {
    if (!weights || typeof weights !== 'object') {
      return 2;
    }

    const entries = Object.keys(weights).map((k) => ({
      table: parseInt(k, 10),
      weight: Math.max(0.1, Number(weights[k]) || 1),
    }));

    if (entries.length === 0) {
      return 2;
    }

    const totalWeight = entries.reduce((sum, item) => sum + item.weight, 0);
    const randomRoll = Math.random() * totalWeight;

    let cumulative = 0;
    for (const item of entries) {
      cumulative += item.weight;
      if (randomRoll <= cumulative) {
        return item.table;
      }
    }

    return entries[entries.length - 1].table;
  };

  /**
   * Adjusts level timer duration based on session performance.
   * Rules:
   * - Only adjusts if questions answered >= 10 in session
   * - If accuracy >= 85% AND avgTime < timerDuration * 0.6: speed up (reduce timer by 2s)
   * - If accuracy < 70% AND recent sessions count >= 2: slow down (increase timer by 3s)
   * - If 70% <= accuracy < 85%: no change
   * @param {number} level - Current level
   * @param {Object} sessionStats - { accuracy, avgTime, timerDuration, correctCount, questionsCount }
   * @returns {{ adjusted: boolean, direction: string, oldDuration: number|null, newDuration: number|null }}
   */
  const adjustAfterSession = (level, sessionStats) => {
    const lvl = typeof level === 'number' ? level : 1;
    if (lvl === 1 || BASE_TIMERS[lvl] === null) {
      return { adjusted: false, direction: 'none', oldDuration: null, newDuration: null };
    }

    if (!sessionStats || typeof sessionStats !== 'object') {
      return { adjusted: false, direction: 'none', oldDuration: null, newDuration: null };
    }

    const questionsCount = sessionStats.questionsCount || 0;
    if (questionsCount < 10) {
      return { adjusted: false, direction: 'none', oldDuration: null, newDuration: null };
    }

    const storage = getStorage();
    const currentDuration = getTimerDuration(lvl);
    if (currentDuration === null) {
      return { adjusted: false, direction: 'none', oldDuration: null, newDuration: null };
    }

    const accuracy = typeof sessionStats.accuracy === 'number' ? sessionStats.accuracy : 0;
    const avgTime = typeof sessionStats.avgTime === 'number' ? sessionStats.avgTime : currentDuration;

    let newDuration = currentDuration;
    let direction = 'none';

    // Count recent sessions for this level
    let levelSessionsCount = 1;
    if (storage) {
      const history = storage.get('sessionHistory') || [];
      levelSessionsCount = history.filter((s) => s.level === lvl).length;
    }

    if (accuracy >= 0.85 && avgTime < currentDuration * 0.6) {
      // Speed up (reduce timer by 2000ms)
      newDuration = Math.max(MIN_TIMER, currentDuration - ADJUSTMENT_STEP_UP);
      direction = newDuration < currentDuration ? 'faster' : 'none';
    } else if (accuracy < 0.70 && levelSessionsCount >= 2) {
      // Slow down (increase timer by 3000ms)
      newDuration = Math.min(MAX_TIMER, currentDuration + ADJUSTMENT_STEP_DOWN);
      direction = newDuration > currentDuration ? 'slower' : 'none';
    }

    // Persist adaptive data in storage
    if (storage) {
      const adaptiveData = storage.get('adaptiveData') || {
        timerDurations: {},
        sessionAccuracies: [],
        lastAdjustmentDate: null,
      };

      if (!adaptiveData.timerDurations) {
        adaptiveData.timerDurations = {};
      }
      adaptiveData.timerDurations[lvl] = newDuration;

      if (!Array.isArray(adaptiveData.sessionAccuracies)) {
        adaptiveData.sessionAccuracies = [];
      }
      adaptiveData.sessionAccuracies.push(accuracy);
      if (adaptiveData.sessionAccuracies.length > 10) {
        adaptiveData.sessionAccuracies = adaptiveData.sessionAccuracies.slice(-10);
      }

      if (direction !== 'none') {
        adaptiveData.lastAdjustmentDate = new Date().toISOString();
      }

      storage.set('adaptiveData', adaptiveData);
    }

    return {
      adjusted: direction !== 'none',
      direction,
      oldDuration: currentDuration,
      newDuration,
    };
  };

  /**
   * Evaluates if player should advance to next level.
   * Condition: avg accuracy >= 80% AND all 3 sessions played AND >= 10 questions each.
   * @param {number} level - Current level
   * @param {Array<Object>} recentSessions - Last sessions for current level
   * @returns {boolean}
   */
  const checkLevelAdvancement = (level, recentSessions) => {
    if (!Array.isArray(recentSessions) || recentSessions.length < 3) {
      return false;
    }

    const last3 = recentSessions.slice(-3);

    // Each session must have answered at least 10 questions
    const allMeetQuestionThreshold = last3.every(
      (s) => s && typeof s.questionsCount === 'number' && s.questionsCount >= 10
    );
    if (!allMeetQuestionThreshold) {
      return false;
    }

    // Average accuracy across the 3 sessions must be >= 80%
    const sumAccuracy = last3.reduce((sum, s) => sum + (s.accuracy || 0), 0);
    const avgAccuracy = sumAccuracy / last3.length;

    return avgAccuracy >= 0.8;
  };

  /**
   * Generates a pedagogical, child-friendly hint explaining how to solve a multiplication fact.
   * @param {number} a - First factor
   * @param {number} b - Second factor
   * @param {number} correctAnswer - Product of a * b
   * @returns {string} Explanatory hint
   */
  const getHint = (a, b, correctAnswer) => {
    const product = typeof correctAnswer === 'number' ? correctAnswer : a * b;

    // Zero property
    if (a === 0 || b === 0) {
      return 'Zero Rule: Any number multiplied by 0 is always 0!';
    }

    // Identity property (times 1)
    if (a === 1) {
      return `One Rule: 1 × ${b} means 1 group of ${b}, so it stays ${b}!`;
    }
    if (b === 1) {
      return `One Rule: ${a} × 1 means ${a} group of 1, so it stays ${a}!`;
    }

    // Two times table (Doubles)
    if (b === 2) {
      return `Think of ${a} × 2 as doubling: ${a} + ${a} = ${product}!`;
    }
    if (a === 2) {
      return `Think of 2 × ${b} as doubling: ${b} + ${b} = ${product}!`;
    }

    // Ten times table (Place Value Shift)
    if (b === 10) {
      return `Tens Trick: Place a 0 on the end of ${a} to get ${product}!`;
    }
    if (a === 10) {
      return `Tens Trick: Place a 0 on the end of ${b} to get ${product}!`;
    }

    // Five times table (Count by 5s or Half of 10)
    if (b === 5) {
      return `Fives Trick: Count by 5s ${a} times, or take half of ${a} × 10 (${a * 10}) = ${product}!`;
    }
    if (a === 5) {
      return `Fives Trick: Count by 5s ${b} times, or take half of ${b} × 10 (${b * 10}) = ${product}!`;
    }

    // Nine times table (Ten minus one strategy)
    if (b === 9) {
      return `Nines Trick: Try ${a} × 10 = ${a * 10}, then subtract ${a} = ${product}!`;
    }
    if (a === 9) {
      return `Nines Trick: Try ${b} × 10 = ${b * 10}, then subtract ${b} = ${product}!`;
    }

    // Four times table (Double-Double strategy)
    if (b === 4) {
      return `Double-Double: Double ${a} is ${a * 2}, and double that is ${product}!`;
    }
    if (a === 4) {
      return `Double-Double: Double ${b} is ${b * 2}, and double that is ${product}!`;
    }

    // Specific tricky combinations
    if ((a === 7 && b === 8) || (a === 8 && b === 7)) {
      return '7 × 8: Try 7 × 10 = 70, minus 7 × 2 = 14, so 70 - 14 = 56!';
    }
    if ((a === 6 && b === 7) || (a === 7 && b === 6)) {
      return '6 × 7: Try 5 × 7 = 35, plus one more 7 = 42!';
    }
    if ((a === 6 && b === 8) || (a === 8 && b === 6)) {
      return '6 × 8: Try 5 × 8 = 40, plus one more 8 = 48!';
    }
    if ((a === 3 && b === 4) || (a === 4 && b === 3)) {
      return '3 groups of 4 = 4 + 4 + 4 = 12!';
    }
    if ((a === 3 && b === 8) || (a === 8 && b === 3)) {
      return '3 × 8: Double 8 is 16, plus one more 8 = 24!';
    }

    // General repeated addition fallback for children
    if (a <= 5) {
      const groups = Array(a).fill(b).join(' + ');
      return `Think of ${a} × ${b} as ${a} groups of ${b}: ${groups} = ${product}!`;
    }

    return `Friendly Split: ${a} × ${b} = (${a - 1} × ${b}) + ${b} = ${(a - 1) * b} + ${b} = ${product}!`;
  };

  /**
   * Generates a positive, growth-mindset encouraging message.
   * @param {number} accuracy - Accuracy from 0 to 1
   * @param {number} streak - Current consecutive correct streak
   * @param {boolean} [isImproving=false] - Whether player performance improved
   * @returns {string} Encouraging message
   */
  const getEncouragement = (accuracy, streak = 0, isImproving = false) => {
    if (streak >= 15) {
      return 'Incredible! You are truly a Multiplication Master! 👑';
    }
    if (streak >= 10) {
      return 'Unstoppable! 10 in a row! You are on fire! 🚀';
    }
    if (streak >= 5) {
      return "You're on a roll! Keep that amazing momentum going! 🔥";
    }
    if (accuracy >= 0.95) {
      return 'Virtually flawless! Your hard work is shining bright! 🌟';
    }
    if (accuracy >= 0.8) {
      return 'Fantastic accuracy! You have really mastered these tables! ⭐';
    }
    if (isImproving) {
      return "Look at that progress! You're getting sharper and faster! 📈";
    }
    if (accuracy < 0.6) {
      return 'Mistakes help your brain make new connections! Take a deep breath and keep going! 🌱';
    }
    return 'Every question you practice makes your math brain stronger! Keep exploring! 🧭';
  };

  /**
   * Generates celebratory text for a single correct answer.
   * @param {number} streak - In-game streak
   * @param {boolean} isSpeedBonus - Whether answer was given before par time
   * @returns {string} Congratulatory phrase
   */
  const getCorrectMessage = (streak = 0, isSpeedBonus = false) => {
    if (isSpeedBonus && streak >= 5) {
      return 'Lightning Fast & On Fire! ⚡🔥';
    }
    if (isSpeedBonus) {
      const speedPraise = ['Lightning Speed! ⚡', 'Super Fast! 🏎️', 'Quick as Flash! ✨'];
      return speedPraise[Math.floor(Math.random() * speedPraise.length)];
    }
    if (streak >= 10) {
      return 'UNSTOPPABLE! 🚀';
    }
    if (streak >= 5) {
      return '5 In A Row! 🔥';
    }
    if (streak >= 3) {
      return 'Hot Streak! 💫';
    }

    const standardPraise = ['Spot on! 🎉', 'Awesome! ⭐', 'Great Job! 👍', 'Brilliant! 🧠', 'You got it! 🎯'];
    return standardPraise[Math.floor(Math.random() * standardPraise.length)];
  };

  /**
   * Resets adaptive timer tuning for a specific level back to default.
   * @param {number} level
   * @returns {number|null} Base timer for the level
   */
  const resetLevel = (level) => {
    const lvl = typeof level === 'number' ? Math.floor(level) : 1;
    const storage = getStorage();
    if (storage) {
      const adaptiveData = storage.get('adaptiveData') || {};
      if (adaptiveData.timerDurations && adaptiveData.timerDurations[lvl] !== undefined) {
        delete adaptiveData.timerDurations[lvl];
        storage.set('adaptiveData', adaptiveData);
      }
    }
    return BASE_TIMERS[lvl] ?? null;
  };

  return {
    getTimerDuration,
    getTableWeights,
    selectWeightedTable,
    adjustAfterSession,
    checkLevelAdvancement,
    getHint,
    getEncouragement,
    getCorrectMessage,
    resetLevel,
  };
})();

// Attach to global window
window.Adaptive = Adaptive;
