/**
 * Multiplication Quest - Achievements Module
 * Defines 20 unlockable achievements, evaluates unlock triggers,
 * tracks unlock status in GameStorage, and provides progress metrics.
 */
const Achievements = (() => {
  'use strict';

  /**
   * Helper to safely retrieve GameStorage.
   */
  const getStorage = () => {
    return window.GameStorage || (typeof GameStorage !== 'undefined' ? GameStorage : null);
  };

  /**
   * Complete definitions for all 20 achievements.
   */
  const DEFINITIONS = [
    {
      id: 'first_win',
      title: 'First Victory!',
      desc: 'Answer your first question correctly',
      icon: '🌟',
      trigger: 'correct',
      condition: (stats) => (stats.totalCorrect || 0) >= 1,
    },
    {
      id: 'perfect_ten',
      title: 'Perfect Ten',
      desc: 'Answer 10 questions correctly',
      icon: '🔟',
      trigger: 'correct',
      condition: (stats) => (stats.totalCorrect || 0) >= 10,
    },
    {
      id: 'perfect_fifty',
      title: 'Fifty Champion',
      desc: 'Answer 50 questions correctly',
      icon: '🏆',
      trigger: 'correct',
      condition: (stats) => (stats.totalCorrect || 0) >= 50,
    },
    {
      id: 'speed_star',
      title: 'Speed Star',
      desc: 'Answer 5 questions in under 5 seconds each',
      icon: '⚡',
      trigger: 'speed',
      condition: (stats) => (stats.fastAnswers || 0) >= 5,
    },
    {
      id: 'streak_5',
      title: 'Hot Streak',
      desc: 'Get 5 correct in a row',
      icon: '🔥',
      trigger: 'streak',
      condition: (stats) => (stats.streak || 0) >= 5,
    },
    {
      id: 'streak_10',
      title: 'Streak Master',
      desc: 'Get 10 correct in a row',
      icon: '💫',
      trigger: 'streak',
      condition: (stats) => (stats.streak || 0) >= 10,
    },
    {
      id: 'streak_20',
      title: 'Unstoppable!',
      desc: 'Get 20 correct in a row',
      icon: '🚀',
      trigger: 'streak',
      condition: (stats) => (stats.streak || 0) >= 20,
    },
    {
      id: 'table_2',
      title: 'Times Two Expert',
      desc: 'Answer 10 questions from the 2 times table',
      icon: '✌️',
      trigger: 'table',
      condition: (stats) => (stats.tableStats && stats.tableStats[2] && stats.tableStats[2].answered >= 10),
    },
    {
      id: 'table_master',
      title: 'Table Master',
      desc: 'Get 80%+ accuracy on any table with 10+ questions',
      icon: '📚',
      trigger: 'table',
      condition: (stats) => {
        if (!stats.tableStats) return false;
        return Object.keys(stats.tableStats).some((t) => {
          const s = stats.tableStats[t];
          return s && s.answered >= 10 && (s.correct / s.answered) >= 0.8;
        });
      },
    },
    {
      id: 'level_2',
      title: 'Number Adventurer',
      desc: 'Reach Level 2',
      icon: '🗺️',
      trigger: 'level',
      condition: (stats) => (stats.currentLevel || 1) >= 2,
    },
    {
      id: 'level_3',
      title: 'Multiplication Hero',
      desc: 'Reach Level 3',
      icon: '🦸',
      trigger: 'level',
      condition: (stats) => (stats.currentLevel || 1) >= 3,
    },
    {
      id: 'level_5',
      title: 'Math Superstar',
      desc: 'Reach Level 5',
      icon: '⭐',
      trigger: 'level',
      condition: (stats) => (stats.currentLevel || 1) >= 5,
    },
    {
      id: 'level_6',
      title: 'Multiplication Master',
      desc: 'Reach the top level!',
      icon: '👑',
      trigger: 'level',
      condition: (stats) => (stats.currentLevel || 1) >= 6,
    },
    {
      id: 'daily_1',
      title: 'Daily Champion',
      desc: 'Complete your first Daily Challenge',
      icon: '📅',
      trigger: 'daily',
      condition: (stats) => (stats.dailyChallengesCompleted || 0) >= 1,
    },
    {
      id: 'daily_7',
      title: 'Week Warrior',
      desc: 'Play 7 days in a row',
      icon: '🗓️',
      trigger: 'daily',
      condition: (stats) => (stats.dailyStreak || 0) >= 7,
    },
    {
      id: 'stars_50',
      title: 'Star Collector',
      desc: 'Collect 50 stars',
      icon: '💛',
      trigger: 'stars',
      condition: (stats) => (stats.totalStars || 0) >= 50,
    },
    {
      id: 'stars_200',
      title: 'Galaxy Brain',
      desc: 'Collect 200 stars',
      icon: '🌌',
      trigger: 'stars',
      condition: (stats) => (stats.totalStars || 0) >= 200,
    },
    {
      id: 'perfect_round',
      title: 'Perfectionist',
      desc: 'Complete a round with 100% accuracy',
      icon: '💯',
      trigger: 'session',
      condition: (stats) => (stats.lastSessionAccuracy || 0) >= 1.0 && (stats.lastSessionQuestions || 0) >= 5,
    },
    {
      id: 'speed_challenge',
      title: 'Speed Demon',
      desc: 'Complete a Speed Challenge',
      icon: '🏎️',
      trigger: 'mode',
      condition: (stats) => (stats.speedChallengesCompleted || 0) >= 1,
    },
    {
      id: 'all_tables',
      title: 'Times Table Explorer',
      desc: 'Answer a question from every table 1-10',
      icon: '🗺️',
      trigger: 'table',
      condition: (stats) => {
        if (!stats.tableStats) return false;
        return Object.keys(stats.tableStats).filter((t) => {
          const s = stats.tableStats[t];
          return s && s.answered > 0;
        }).length >= 10;
      },
    },
  ];

  /**
   * Internal lookup map for rapid ID retrieval.
   */
  const DEFINITIONS_MAP = new Map(DEFINITIONS.map((def) => [def.id, def]));

  /**
   * Checks whether a specific achievement is already unlocked.
   * @param {string} id
   * @returns {boolean}
   */
  const isUnlocked = (id) => {
    const storage = getStorage();
    if (!storage) return false;
    const achievements = storage.get('achievements') || [];
    return achievements.includes(id);
  };

  /**
   * Marks an achievement as unlocked in GameStorage.
   * @param {string} id
   * @returns {boolean} True if successfully newly unlocked, false if already unlocked or invalid
   */
  const unlock = (id) => {
    if (!DEFINITIONS_MAP.has(id)) {
      console.warn(`[Achievements] Unknown achievement id: ${id}`);
      return false;
    }

    const storage = getStorage();
    if (!storage) return false;

    const currentAchievements = storage.get('achievements') || [];
    if (currentAchievements.includes(id)) {
      return false; // Already unlocked
    }

    const updated = [...currentAchievements, id];
    storage.set('achievements', updated);

    // Audio cue if available
    if (window.GameAudio && typeof window.GameAudio.playAchievement === 'function') {
      try {
        window.GameAudio.playAchievement();
      } catch (e) {
        // Audio playback error should not impede achievement unlock
      }
    }

    return true;
  };

  /**
   * Constructs the comprehensive stats object needed by conditions.
   * Merges persistent GameStorage data with ephemeral runtime values.
   * @param {Object} [extraStats] - Ephemeral runtime data (e.g., streak, fastAnswers, session results)
   * @returns {Object} Complete stats payload
   */
  const buildCheckStats = (extraStats = {}) => {
    const storage = getStorage();
    const state = storage ? storage.getState() : {};
    const history = Array.isArray(state.sessionHistory) ? state.sessionHistory : [];
    const lastSession = history.length > 0 ? history[history.length - 1] : null;

    // Count speed challenge sessions
    const speedChallengesCount = history.filter(
      (s) => s.mode === 'speed' || s.mode === 'speed_challenge'
    ).length;

    // Count daily challenge completions
    let dailyCompletions = history.filter((s) => s.mode === 'daily').length;
    if (state.dailyChallenge && state.dailyChallenge.completed && dailyCompletions === 0) {
      dailyCompletions = 1;
    }

    // In-game streak check
    let currentStreak = state.bestStreak || 0;
    if (window.Progress && typeof window.Progress.getInGameStreak === 'function') {
      currentStreak = Math.max(currentStreak, window.Progress.getInGameStreak());
    }

    const baseStats = {
      totalCorrect: state.totalCorrectAnswers || 0,
      totalQuestions: state.totalQuestionsAnswered || 0,
      currentLevel: state.currentLevel || 1,
      totalStars: state.totalStars || 0,
      totalXP: state.totalXP || 0,
      streak: currentStreak,
      dailyStreak: state.currentStreak || 0,
      tableStats: state.tableStats || {},
      fastAnswers: 0,
      dailyChallengesCompleted: dailyCompletions,
      speedChallengesCompleted: speedChallengesCount,
      lastSessionAccuracy: lastSession ? lastSession.accuracy : 0,
      lastSessionQuestions: lastSession ? lastSession.questionsCount || 0 : 0,
    };

    return Object.assign(baseStats, extraStats);
  };

  /**
   * Evaluates achievement triggers against current stats.
   * Unlocks any newly qualified achievements and returns an array of their IDs.
   * @param {string} [trigger] - Filter by trigger type ('correct', 'streak', 'table', 'level', 'daily', 'stars', 'session', 'mode', 'speed') or null/undefined/'all' for all
   * @param {Object} [currentStats] - Optional stats object or override values
   * @returns {Array<string>} Newly unlocked achievement IDs
   */
  const check = (trigger, currentStats) => {
    const stats = buildCheckStats(currentStats);
    const targetTrigger = trigger && trigger !== 'all' ? trigger : null;
    const newlyUnlockedIds = [];

    for (const def of DEFINITIONS) {
      if (targetTrigger && def.trigger !== targetTrigger) {
        continue;
      }

      if (isUnlocked(def.id)) {
        continue;
      }

      try {
        if (def.condition(stats)) {
          const wasUnlocked = unlock(def.id);
          if (wasUnlocked) {
            newlyUnlockedIds.push(def.id);
          }
        }
      } catch (err) {
        console.warn(`[Achievements] Error checking condition for ${def.id}:`, err);
      }
    }

    return newlyUnlockedIds;
  };

  /**
   * Returns array of all unlocked achievement definition objects.
   * @returns {Array<Object>}
   */
  const getUnlocked = () => {
    const storage = getStorage();
    const unlockedIds = storage ? (storage.get('achievements') || []) : [];
    return unlockedIds
      .map((id) => DEFINITIONS_MAP.get(id))
      .filter((def) => Boolean(def));
  };

  /**
   * Computes achievement completion percentage and counts.
   * @returns {{ unlocked: number, total: number, percentage: number }}
   */
  const getProgress = () => {
    const unlockedList = getUnlocked();
    const unlocked = unlockedList.length;
    const total = DEFINITIONS.length;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;

    return {
      unlocked,
      total,
      percentage,
    };
  };

  return {
    DEFINITIONS,
    check,
    unlock,
    getUnlocked,
    isUnlocked,
    getProgress,
    buildCheckStats,
  };
})();

// Attach to global window
window.Achievements = Achievements;
