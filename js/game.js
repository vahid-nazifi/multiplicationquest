/**
 * Multiplication Quest - Core Game Engine
 * File: js/game.js
 *
 * Manages active gameplay sessions, state machine transitions, adaptive question
 * and answer generation, per-question and global session timers, scoring, streaks,
 * and an event-driven pub/sub architecture.
 */
const Game = (() => {
  'use strict';

  // Supported game modes
  const MODES = {
    ADVENTURE: 'adventure',
    QUICK_PLAY: 'quick-play',
    SPEED_CHALLENGE: 'speed-challenge',
    PRACTICE: 'practice',
    DAILY: 'daily',
  };

  // Phase constants
  const PHASES = {
    IDLE: 'idle',
    QUESTION: 'question',
    ANSWERED: 'answered',
    PAUSED: 'paused',
    ENDED: 'ended',
  };

  // Default active session state
  let state = {
    mode: null,
    level: 1,
    tables: [1, 2, 10],
    questions: [], // Array of { a, b, answer, userAnswer, time, correct }
    currentQuestion: null, // { a, b, answer }
    currentAnswers: [], // Array of 4 answer choices [n, n, n, n]
    questionIndex: 0,
    totalQuestions: 10,
    score: 0,
    stars: 0,
    streak: 0,
    startTime: null,
    questionStartTime: null,
    timerDuration: null, // null = untimed, or ms
    timerRemaining: null,
    timerInterval: null,
    sessionFastAnswers: 0, // Count of answers under 5s
    phase: PHASES.IDLE,
    practiceTable: null,
    speedChallengeTimeLeft: 60000, // 60s for speed challenge
    isPaused: false,
    pausedPhase: null,
    precomputedDailyQuestions: null,
    callbacks: {},
  };

  // Keep a buffer of the last 3 questions to prevent immediate repeats
  const recentQuestions = [];

  /**
   * Helper to retrieve GameStorage safely.
   */
  function getStorage() {
    return window.GameStorage || (typeof GameStorage !== 'undefined' ? GameStorage : null);
  }

  /**
   * Helper to retrieve Progress safely.
   */
  function getProgress() {
    return window.Progress || (typeof Progress !== 'undefined' ? Progress : null);
  }

  /**
   * Helper to retrieve Adaptive engine safely.
   */
  function getAdaptive() {
    return window.Adaptive || (typeof Adaptive !== 'undefined' ? Adaptive : null);
  }

  /**
   * Helper to retrieve Achievements safely.
   */
  function getAchievements() {
    return window.Achievements || (typeof Achievements !== 'undefined' ? Achievements : null);
  }

  /**
   * Returns current calendar date in 'YYYY-MM-DD' format.
   */
  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Seeded pseudo-random number generator (Mulberry32) for deterministic daily challenge.
   * @param {string} seedStr
   * @returns {function(): number} PRNG returning [0, 1)
   */
  function createSeededRandom(seedStr) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
    }
    return function prng() {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }

  /**
   * Fisher-Yates array shuffle.
   * @param {Array} array
   * @param {function} [randFn] - Optional custom random function
   * @returns {Array} Shuffled copy
   */
  function shuffleArray(array, randFn = Math.random) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(randFn() * (i + 1));
      const temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  /**
   * Pub/Sub: registers an event handler.
   * @param {string} event - Event name ('question', 'answered', 'tick', 'timeout', 'ended', 'streak')
   * @param {function} callback
   */
  function on(event, callback) {
    if (typeof callback !== 'function') return;
    if (!state.callbacks[event]) {
      state.callbacks[event] = [];
    }
    state.callbacks[event].push(callback);
  }

  /**
   * Pub/Sub: removes an event handler.
   * @param {string} event
   * @param {function} callback
   */
  function off(event, callback) {
    if (!state.callbacks[event]) return;
    state.callbacks[event] = state.callbacks[event].filter((cb) => cb !== callback);
  }

  /**
   * Pub/Sub: triggers all registered handlers for an event.
   * @param {string} event
   * @param {*} data
   */
  function emit(event, data) {
    const handlers = state.callbacks[event];
    if (Array.isArray(handlers)) {
      for (let i = 0; i < handlers.length; i++) {
        try {
          handlers[i](data);
        } catch (err) {
          console.error(`[Game] Error in '${event}' event listener:`, err);
        }
      }
    }
  }

  /**
   * Generates a single multiplication question from allowed tables.
   * Leverages Adaptive table weights if available, picks factor 1-10,
   * and avoids repeating the last 3 questions.
   *
   * @param {Array<number>} [tables] - Allowed table numbers
   * @param {boolean} [excludeRecent=true] - Avoid recent question pairs
   * @returns {{ a: number, b: number, answer: number }}
   */
  function generateQuestion(tables, excludeRecent = true) {
    const activeTables = Array.isArray(tables) && tables.length > 0 ? tables : [1, 2, 10];
    const adaptive = getAdaptive();

    let attempts = 0;
    let selectedA = activeTables[0];
    let selectedB = 1;
    let questionKey = '';

    do {
      attempts++;

      // Pick table using adaptive weights or uniform random
      if (adaptive && typeof adaptive.getTableWeights === 'function') {
        const weights = adaptive.getTableWeights(activeTables);
        selectedA = pickWeightedTable(activeTables, weights);
      } else {
        const idx = Math.floor(Math.random() * activeTables.length);
        selectedA = activeTables[idx];
      }

      // Pick factor 1-10
      selectedB = Math.floor(Math.random() * 10) + 1;

      // 50% chance to flip factor order (e.g. 3 x 4 vs 4 x 3) for variety
      if (Math.random() < 0.5) {
        const swap = selectedA;
        selectedA = selectedB;
        selectedB = swap;
      }

      questionKey = `${Math.min(selectedA, selectedB)}x${Math.max(selectedA, selectedB)}`;
    } while (excludeRecent && recentQuestions.includes(questionKey) && attempts < 20);

    // Track in recent buffer
    recentQuestions.push(questionKey);
    if (recentQuestions.length > 3) {
      recentQuestions.shift();
    }

    return {
      a: selectedA,
      b: selectedB,
      answer: selectedA * selectedB,
    };
  }

  /**
   * Helper to pick a table based on weight distribution.
   */
  function pickWeightedTable(tables, weights) {
    if (!weights || typeof weights !== 'object') {
      return tables[Math.floor(Math.random() * tables.length)];
    }

    let totalWeight = 0;
    const tableWeights = tables.map((t) => {
      const w = typeof weights[t] === 'number' && weights[t] > 0 ? weights[t] : 1;
      totalWeight += w;
      return { table: t, weight: w };
    });

    if (totalWeight <= 0) {
      return tables[Math.floor(Math.random() * tables.length)];
    }

    let randomVal = Math.random() * totalWeight;
    for (let i = 0; i < tableWeights.length; i++) {
      randomVal -= tableWeights[i].weight;
      if (randomVal <= 0) {
        return tableWeights[i].table;
      }
    }

    return tables[tables.length - 1];
  }

  /**
   * Generates 4 distinct answer choices: 1 correct + 3 plausible wrong answers.
   * Wrong answers strategy:
   *   - Off by 1 multiplication (e.g. answer ± a, answer ± b)
   *   - Adjacent table ((a ± 1) * b) or (a * (b ± 1))
   *   - Reversed digits or swapped factors
   *   - Nearby plausible answers (answer ± 1, answer ± 2, answer ± 10)
   *
   * @param {{ a: number, b: number, answer: number }} question
   * @returns {Array<number>} Shuffled array of 4 distinct positive numbers
   */
  function generateAnswers(question) {
    if (!question || typeof question.answer !== 'number') {
      return [1, 2, 3, 4];
    }

    const { a, b, answer } = question;
    const candidates = new Set();

    // Strategy 1: Off by factor (a*(b±1) or (a±1)*b)
    candidates.add(answer + a);
    candidates.add(answer - a);
    candidates.add(answer + b);
    candidates.add(answer - b);

    // Strategy 2: Adjacent table products
    candidates.add((a + 1) * b);
    candidates.add((a - 1) * b);
    candidates.add(a * (b + 1));
    candidates.add(a * (b - 1));

    // Strategy 3: Off by small additive margin (±1, ±2, ±5, ±10)
    candidates.add(answer + 1);
    candidates.add(answer - 1);
    candidates.add(answer + 2);
    candidates.add(answer - 2);
    candidates.add(answer + 10);
    candidates.add(answer - 10);

    // Strategy 4: Reversed digits (e.g. 24 -> 42, 63 -> 36)
    if (answer >= 12 && answer <= 99) {
      const tens = Math.floor(answer / 10);
      const units = answer % 10;
      if (units !== 0 && units !== tens) {
        candidates.add(units * 10 + tens);
      }
    }

    // Filter out invalid candidates: must be positive, not equal to answer
    const validWrongPool = Array.from(candidates).filter(
      (val) => Number.isInteger(val) && val > 0 && val !== answer
    );

    // Shuffle pool to pick 3 random plausible wrong choices
    const shuffledWrong = shuffleArray(validWrongPool);
    const chosenWrong = [];

    for (let i = 0; i < shuffledWrong.length && chosenWrong.length < 3; i++) {
      chosenWrong.push(shuffledWrong[i]);
    }

    // Safety fallback: if not enough candidates, synthesize nearby positive numbers
    let delta = 3;
    while (chosenWrong.length < 3) {
      const fallbackAbove = answer + delta;
      const fallbackBelow = answer - delta;
      if (fallbackAbove > 0 && fallbackAbove !== answer && !chosenWrong.includes(fallbackAbove)) {
        chosenWrong.push(fallbackAbove);
      } else if (fallbackBelow > 0 && fallbackBelow !== answer && !chosenWrong.includes(fallbackBelow)) {
        chosenWrong.push(fallbackBelow);
      }
      delta++;
    }

    // Combine correct answer with 3 wrong choices and shuffle
    const finalChoices = [answer, ...chosenWrong.slice(0, 3)];
    return shuffleArray(finalChoices);
  }

  /**
   * Generates deterministic 10 questions for daily challenge based on today's calendar date.
   * @param {string} [dateStr] - 'YYYY-MM-DD'
   * @returns {Array<{ a: number, b: number, answer: number }>}
   */
  function getDailyQuestions(dateStr) {
    const seed = dateStr || getTodayDateString();
    const rng = createSeededRandom(`mquest-daily-${seed}`);
    const questions = [];
    const used = new Set();

    // Tables 2 through 10 (avoiding purely table 1 for a richer daily experience)
    const tablesPool = [2, 3, 4, 5, 6, 7, 8, 9, 10];

    while (questions.length < 10) {
      const tableIdx = Math.floor(rng() * tablesPool.length);
      const a = tablesPool[tableIdx];
      const b = Math.floor(rng() * 10) + 1;
      const key = `${Math.min(a, b)}x${Math.max(a, b)}`;

      if (!used.has(key)) {
        used.add(key);
        questions.push({
          a,
          b,
          answer: a * b,
        });
      }
    }

    return questions;
  }

  /**
   * Starts the countdown timer for the active question or speed challenge session.
   */
  function startTimer() {
    stopTimer();

    if (state.mode === MODES.SPEED_CHALLENGE) {
      // Global 60s countdown for speed challenge
      const intervalMs = 100;
      state.timerInterval = setInterval(() => {
        if (state.isPaused) return;

        state.speedChallengeTimeLeft = Math.max(0, state.speedChallengeTimeLeft - intervalMs);
        state.timerRemaining = state.speedChallengeTimeLeft;

        const percentage = Math.max(
          0,
          Math.min(100, (state.speedChallengeTimeLeft / state.timerDuration) * 100)
        );

        emit('tick', {
          remaining: state.speedChallengeTimeLeft,
          total: state.timerDuration,
          percentage,
        });

        if (state.speedChallengeTimeLeft <= 0) {
          stopTimer();
          emit('timeout', {
            mode: state.mode,
            questionIndex: state.questionIndex,
          });
          endGame();
        }
      }, intervalMs);
      return;
    }

    // Per-question timer (null = untimed, e.g. Level 1 or Practice)
    if (!state.timerDuration || state.timerDuration <= 0) {
      state.timerRemaining = null;
      return;
    }

    state.timerRemaining = state.timerDuration;
    const intervalMs = 100;

    state.timerInterval = setInterval(() => {
      if (state.isPaused) return;

      state.timerRemaining = Math.max(0, state.timerRemaining - intervalMs);

      const percentage = Math.max(
        0,
        Math.min(100, (state.timerRemaining / state.timerDuration) * 100)
      );

      emit('tick', {
        remaining: state.timerRemaining,
        total: state.timerDuration,
        percentage,
      });

      if (state.timerRemaining <= 0) {
        stopTimer();
        handleQuestionTimeout();
      }
    }, intervalMs);
  }

  /**
   * Stops and clears the timer interval.
   */
  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }

  /**
   * Handles per-question timeout when the clock reaches zero.
   */
  function handleQuestionTimeout() {
    if (state.phase !== PHASES.QUESTION) return;

    state.phase = PHASES.ANSWERED;
    const currentQ = state.currentQuestion;
    const timeTaken = state.timerDuration || 0;

    // Reset streak on timeout
    state.streak = 0;
    const progress = getProgress();
    if (progress && typeof progress.resetInGameStreak === 'function') {
      progress.resetInGameStreak();
    }

    // Record question in history
    const record = {
      a: currentQ.a,
      b: currentQ.b,
      answer: currentQ.answer,
      userAnswer: null,
      time: timeTaken,
      correct: false,
    };
    state.questions.push(record);

    // Update table stats in storage
    const storage = getStorage();
    if (storage && typeof storage.updateTableStat === 'function') {
      storage.updateTableStat(currentQ.a, false, timeTaken);
    }

    // Determine hint
    const adaptive = getAdaptive();
    let hint = null;
    if (adaptive && typeof adaptive.getHint === 'function') {
      hint = adaptive.getHint(currentQ.a, currentQ.b);
    }
    if (!hint) {
      hint = `${currentQ.a} × ${currentQ.b} is ${currentQ.b} added ${currentQ.a} times!`;
    }

    emit('timeout', {
      question: currentQ,
      correctAnswer: currentQ.answer,
      timeTaken,
      hint,
    });

    emit('answered', {
      correct: false,
      correctAnswer: currentQ.answer,
      userAnswer: null,
      timeTaken,
      xpEarned: 0,
      hint,
      streak: 0,
      questionIndex: state.questionIndex,
      totalQuestions: state.totalQuestions,
      isTimeout: true,
    });
  }

  /**
   * Submits player's answer for the current question.
   * @param {number} answer - Player's selected or entered answer
   * @returns {Object} Result summary { correct, correctAnswer, timeTaken, xpEarned, hint, streak }
   */
  function submitAnswer(answer) {
    if (state.phase !== PHASES.QUESTION) {
      return null;
    }

    state.phase = PHASES.ANSWERED;
    if (state.mode !== MODES.SPEED_CHALLENGE) {
      stopTimer();
    }

    const currentQ = state.currentQuestion;
    const timeTaken = Math.max(100, Date.now() - (state.questionStartTime || Date.now()));
    const isCorrect = Number(answer) === currentQ.answer;

    // Streak & scoring
    let xpEarned = 0;
    const progress = getProgress();

    if (isCorrect) {
      state.streak += 1;
      if (progress && typeof progress.incrementInGameStreak === 'function') {
        progress.incrementInGameStreak();
      }

      // Base XP
      xpEarned = 10;

      // Streak bonus XP
      if (state.streak >= 10) {
        xpEarned += 20;
      } else if (state.streak >= 5) {
        xpEarned += 10;
      } else if (state.streak >= 3) {
        xpEarned += 5;
      }

      // Speed bonus XP (under 3 seconds)
      if (timeTaken < 3000) {
        xpEarned += 5;
      }

      // Score accumulation
      state.score += 10;
      if (timeTaken < 3000) {
        state.score += 5;
      }

      if (timeTaken < 5000) {
        state.sessionFastAnswers += 1;
      }

      // Fire streak celebration if milestone reached
      if (state.streak >= 2) {
        emit('streak', state.streak);
      }
    } else {
      state.streak = 0;
      if (progress && typeof progress.resetInGameStreak === 'function') {
        progress.resetInGameStreak();
      }
    }

    // Record question in history
    const record = {
      a: currentQ.a,
      b: currentQ.b,
      answer: currentQ.answer,
      userAnswer: Number(answer),
      time: timeTaken,
      correct: isCorrect,
    };
    state.questions.push(record);

    // Update table stats in storage
    const storage = getStorage();
    if (storage && typeof storage.updateTableStat === 'function') {
      storage.updateTableStat(currentQ.a, isCorrect, timeTaken);
    }

    // Determine hint if wrong
    let hint = null;
    if (!isCorrect) {
      const adaptive = getAdaptive();
      if (adaptive && typeof adaptive.getHint === 'function') {
        hint = adaptive.getHint(currentQ.a, currentQ.b);
      }
      if (!hint) {
        hint = `${currentQ.a} × ${currentQ.b} is ${currentQ.b} added ${currentQ.a} times (${currentQ.answer})!`;
      }
    }

    // Check intermediate achievements (e.g. speed_star, hot streak, etc.)
    const achievements = getAchievements();
    if (achievements && typeof achievements.check === 'function') {
      achievements.check('correct', {
        streak: state.streak,
        fastAnswers: state.sessionFastAnswers,
      });
      if (isCorrect && timeTaken < 5000) {
        achievements.check('speed', {
          fastAnswers: state.sessionFastAnswers,
        });
      }
      if (state.streak >= 5) {
        achievements.check('streak', {
          streak: state.streak,
        });
      }
    }

    const result = {
      correct: isCorrect,
      correctAnswer: currentQ.answer,
      userAnswer: Number(answer),
      timeTaken,
      xpEarned,
      hint,
      streak: state.streak,
      score: state.score,
      questionIndex: state.questionIndex,
      totalQuestions: state.totalQuestions,
    };

    emit('answered', result);
    return result;
  }

  /**
   * Skips current question without points and reveals the answer.
   */
  function skipQuestion() {
    if (state.phase !== PHASES.QUESTION) {
      return null;
    }
    return submitAnswer(-1);
  }

  /**
   * Advances to the next question or completes the session if finished.
   * @returns {Object|null} Next question payload or null if session ended
   */
  function nextQuestion() {
    if (state.phase === PHASES.ENDED) {
      return null;
    }

    // In speed challenge mode, game ends only on global timer timeout
    if (state.mode === MODES.SPEED_CHALLENGE) {
      if (state.speedChallengeTimeLeft <= 0) {
        endGame();
        return null;
      }
      state.questionIndex += 1;
      return prepareQuestion();
    }

    // Standard question count limit
    state.questionIndex += 1;
    if (state.questionIndex >= state.totalQuestions) {
      endGame();
      return null;
    }

    return prepareQuestion();
  }

  /**
   * Prepares and emits the next question and answer choices.
   */
  function prepareQuestion() {
    let question;

    if (state.mode === MODES.DAILY && state.precomputedDailyQuestions) {
      const idx = Math.min(state.questionIndex, state.precomputedDailyQuestions.length - 1);
      question = state.precomputedDailyQuestions[idx];
    } else {
      question = generateQuestion(state.tables);
    }

    state.currentQuestion = question;
    state.currentAnswers = generateAnswers(question);
    state.phase = PHASES.QUESTION;
    state.questionStartTime = Date.now();

    if (state.mode !== MODES.SPEED_CHALLENGE) {
      startTimer();
    }

    const payload = {
      question: state.currentQuestion,
      answers: state.currentAnswers,
      index: state.questionIndex,
      total: state.totalQuestions,
      streak: state.streak,
      score: state.score,
    };

    emit('question', payload);
    return payload;
  }

  /**
   * Ends active game session, computes final scores, records progress, checks achievements.
   * @returns {Object} Complete results summary
   */
  function endGame() {
    if (state.phase === PHASES.ENDED) {
      return getResults();
    }

    stopTimer();
    state.phase = PHASES.ENDED;

    const questionsCount = state.questions.length;
    const correctCount = state.questions.filter((q) => q.correct).length;
    const accuracy = questionsCount > 0 ? correctCount / questionsCount : 0;

    // Calculate total time
    let totalTime = 0;
    for (let i = 0; i < state.questions.length; i++) {
      totalTime += state.questions[i].time || 0;
    }
    const avgTime = questionsCount > 0 ? Math.round(totalTime / questionsCount) : 0;

    // Stars calculation:
    // 3 stars: >= 90% accuracy (or perfect)
    // 2 stars: >= 70% accuracy
    // 1 star:  completion with >= 50% accuracy or completed speed challenge
    let starsEarned = 0;
    if (questionsCount > 0) {
      if (accuracy >= 0.9) {
        starsEarned = 3;
      } else if (accuracy >= 0.7) {
        starsEarned = 2;
      } else if (accuracy >= 0.5 || state.mode === MODES.SPEED_CHALLENGE) {
        starsEarned = 1;
      }
    }
    state.stars = starsEarned;

    // Total XP earned calculation
    let totalXPEarned = correctCount * 10;
    if (accuracy === 1.0 && questionsCount >= 5) {
      totalXPEarned += 50; // Perfect round bonus
    }
    if (state.sessionFastAnswers >= 5) {
      totalXPEarned += 25; // Speed bonus
    }

    // Record session via Progress module
    let recordResult = null;
    const progress = getProgress();
    if (progress && typeof progress.recordSession === 'function') {
      recordResult = progress.recordSession({
        date: new Date().toISOString(),
        mode: state.mode,
        score: state.score,
        accuracy: Number(accuracy.toFixed(3)),
        avgTime,
        stars: starsEarned,
        level: state.level,
        questionsCount,
        correctCount,
        xp: totalXPEarned,
      });
    }

    // Daily Challenge completion tracking
    if (state.mode === MODES.DAILY) {
      const storage = getStorage();
      if (storage) {
        const today = getTodayDateString();
        storage.set('dailyChallenge.lastDate', today);
        storage.set('dailyChallenge.completed', true);
      }
    }

    // Evaluate all achievements
    const achievements = getAchievements();
    let newAchievements = [];
    if (achievements && typeof achievements.check === 'function') {
      newAchievements = achievements.check('all', {
        mode: state.mode,
        accuracy,
        score: state.score,
        correctCount,
        questionsCount,
        stars: starsEarned,
        streak: state.streak,
        fastAnswers: state.sessionFastAnswers,
      });
    }

    const results = {
      mode: state.mode,
      level: state.level,
      score: state.score,
      stars: starsEarned,
      questionsCount,
      correctCount,
      accuracy: Number((accuracy * 100).toFixed(1)),
      avgTime,
      totalXPEarned,
      leveledUp: recordResult ? recordResult.leveledUp : false,
      newLevel: recordResult ? recordResult.newLevel : state.level,
      newAchievements: newAchievements || [],
      questions: [...state.questions],
    };

    emit('ended', results);
    return results;
  }

  /**
   * Pauses the game session and running timers.
   */
  function pauseGame() {
    if (state.phase === PHASES.ENDED || state.isPaused) return;
    state.isPaused = true;
    state.pausedPhase = state.phase;
    state.phase = PHASES.PAUSED;
    stopTimer();
    emit('pause', { remaining: state.timerRemaining });
  }

  /**
   * Resumes a paused game session.
   */
  function resumeGame() {
    if (!state.isPaused) return;
    state.isPaused = false;
    state.phase = state.pausedPhase || PHASES.QUESTION;
    state.pausedPhase = null;

    if (state.phase === PHASES.QUESTION) {
      startTimer();
    }
    emit('resume', { remaining: state.timerRemaining });
  }

  /**
   * Checks whether today's daily challenge was already completed.
   * @returns {boolean}
   */
  function isDailyDone() {
    const storage = getStorage();
    if (!storage) return false;
    const today = getTodayDateString();
    const lastDate = storage.get('dailyChallenge.lastDate');
    const completed = storage.get('dailyChallenge.completed');
    return lastDate === today && Boolean(completed);
  }

  /**
   * Starts a new game session in the specified mode.
   * @param {string} mode - One of MODES
   * @param {Object} [options] - Configuration options
   */
  function start(mode, options = {}) {
    stopTimer();
    recentQuestions.length = 0;

    const progress = getProgress();
    const storage = getStorage();
    const currentLvl = options.level || (progress ? progress.getCurrentLevel() : 1);

    const validMode = Object.values(MODES).includes(mode) ? mode : MODES.QUICK_PLAY;

    // Reset streak tracker
    if (progress && typeof progress.resetInGameStreak === 'function') {
      progress.resetInGameStreak();
    }

    state.mode = validMode;
    state.level = currentLvl;
    state.questions = [];
    state.questionIndex = 0;
    state.score = 0;
    state.stars = 0;
    state.streak = 0;
    state.startTime = Date.now();
    state.questionStartTime = null;
    state.sessionFastAnswers = 0;
    state.isPaused = false;
    state.pausedPhase = null;
    state.precomputedDailyQuestions = null;

    // Mode-specific configuration
    switch (validMode) {
      case MODES.ADVENTURE: {
        state.totalQuestions = options.totalQuestions || 10;
        state.tables = progress ? progress.getTables(currentLvl) : [1, 2, 10];
        state.timerDuration = progress ? progress.getTimerDuration(currentLvl) : null;
        break;
      }

      case MODES.QUICK_PLAY: {
        state.totalQuestions = options.totalQuestions || 10;
        state.tables = progress ? progress.getTables(currentLvl) : [1, 2, 3, 4, 5, 10];
        state.timerDuration = 20000; // 20s default for quick play
        break;
      }

      case MODES.SPEED_CHALLENGE: {
        state.totalQuestions = Infinity;
        state.speedChallengeTimeLeft = options.speedDuration || 60000;
        state.timerDuration = state.speedChallengeTimeLeft;
        state.timerRemaining = state.speedChallengeTimeLeft;
        state.tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        break;
      }

      case MODES.PRACTICE: {
        state.totalQuestions = options.totalQuestions || 10;
        if (Array.isArray(options.tables) && options.tables.length > 0) {
          state.tables = options.tables;
        } else if (options.practiceTable) {
          state.tables = [Number(options.practiceTable)];
        } else {
          state.tables = [2];
        }
        state.practiceTable = state.tables[0];
        state.timerDuration = options.timerDuration || null; // Untimed practice by default
        break;
      }

      case MODES.DAILY: {
        state.totalQuestions = 10;
        state.tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        state.timerDuration = 25000;
        state.precomputedDailyQuestions = getDailyQuestions();
        break;
      }

      default: {
        state.totalQuestions = 10;
        state.tables = [1, 2, 10];
        state.timerDuration = null;
        break;
      }
    }

    // Check user timer visibility/tick settings
    if (storage) {
      const timerVis = storage.get('settings.timerVisibility');
      if (timerVis === 'hidden' && validMode !== MODES.SPEED_CHALLENGE) {
        state.timerDuration = null;
      }
    }

    state.phase = PHASES.QUESTION;

    // Start global speed challenge timer if applicable
    if (state.mode === MODES.SPEED_CHALLENGE) {
      startTimer();
    }

    // Generate first question
    return prepareQuestion();
  }

  /**
   * Returns copy of active session state.
   */
  function getState() {
    return {
      ...state,
      questions: [...state.questions],
      tables: [...state.tables],
      currentAnswers: [...state.currentAnswers],
      currentQuestion: state.currentQuestion ? { ...state.currentQuestion } : null,
    };
  }

  /**
   * Returns current question object with choices.
   */
  function getCurrentQuestion() {
    if (!state.currentQuestion) return null;
    return {
      ...state.currentQuestion,
      answers: [...state.currentAnswers],
    };
  }

  /**
   * Returns current results snapshot.
   */
  function getResults() {
    const questionsCount = state.questions.length;
    const correctCount = state.questions.filter((q) => q.correct).length;
    const accuracy = questionsCount > 0 ? (correctCount / questionsCount) * 100 : 0;

    return {
      mode: state.mode,
      level: state.level,
      score: state.score,
      stars: state.stars,
      questionsCount,
      correctCount,
      accuracy: Number(accuracy.toFixed(1)),
      questions: [...state.questions],
    };
  }

  return {
    MODES,
    PHASES,
    start,
    submitAnswer,
    nextQuestion,
    skipQuestion,
    pauseGame,
    resumeGame,
    endGame,
    getCurrentQuestion,
    getState,
    getResults,
    on,
    off,
    generateQuestion,
    generateAnswers,
    getDailyQuestions,
    isDailyDone,
  };
})();

// Attach to global window
window.Game = Game;
