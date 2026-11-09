/**
 * Multiplication Quest - Main Application Bootstrap & Controller
 * File: js/app.js
 *
 * Coordinates Game Engine, UI, Mascot (Stella), Audio, Storage, Progress,
 * and Achievements into a unified children's math PWA experience.
 */
'use strict';

(function () {
  let gameStarted = false;
  let currentMode = null;
  let currentLevel = 1;
  let selectedPracticeTables = new Set([2]);
  const screenHistory = [];
  const achievementQueue = [];
  let isDisplayingAchievement = false;
  let isAnswerPending = false;

  // ==========================================
  // HELPERS SAFELY ACCESSING GLOBAL MODULES
  // ==========================================

  function getStorage() {
    return window.GameStorage || null;
  }

  function getProgress() {
    return window.Progress || null;
  }

  function getAchievements() {
    return window.Achievements || null;
  }

  function getAudio() {
    return window.GameAudio || null;
  }

  function getMascot() {
    return window.Mascot || null;
  }

  function getUI() {
    return window.UI || null;
  }

  function getGame() {
    return window.Game || null;
  }

  // ==========================================
  // 1. INITIALIZATION
  // ==========================================

  async function init() {
    // 1. Display loading screen if present
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
    }

    // 2. Initialize sub-modules
    const ui = getUI();
    if (ui && typeof ui.init === 'function') {
      ui.init();
    }

    const mascot = getMascot();
    if (mascot && typeof mascot.init === 'function') {
      mascot.init();
    }

    const audio = getAudio();
    if (audio && typeof audio.init === 'function') {
      audio.init();
    }

    // 3. Sync player settings to Audio & UI
    applyStoredSettings();

    // 4. Update daily streak
    const progress = getProgress();
    if (progress && typeof progress.updateDailyStreak === 'function') {
      progress.updateDailyStreak();
    }

    // 5. Register Service Worker
    registerServiceWorker();

    // 6. Setup all DOM event bindings
    setupNavigation();
    setupMenu();
    setupModeSelect();
    setupPracticeSelect();
    setupAnswerButtons();
    setupKeypad();
    setupSettingsEvents();
    setupOverlays();
    setupKeyboard();
    setupGameEvents();

    // 7. Render initial menu metrics
    if (progress && ui) {
      ui.updateMenuStats(progress.getStats());
    }

    // 8. Navigate to Main Menu
    navigateTo(ui ? ui.SCREENS.MENU : 'screen-menu', 'none');

    // 9. Hide loading screen
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
      }, 300);
    }

    // 10. Mascot greeting & login achievement check
    setTimeout(() => {
      if (mascot) {
        mascot.react('welcome');
      }
      checkLoginAchievements();
    }, 600);
  }

  /**
   * Registers the Progressive Web App service worker.
   */
  function registerServiceWorker() {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => console.log('[PWA] ServiceWorker registered with scope:', reg.scope))
          .catch((err) => console.warn('[PWA] ServiceWorker registration failed:', err));
      });
    }
  }

  /**
   * Reads settings from GameStorage and applies them to modules.
   */
  function applyStoredSettings() {
    const storage = getStorage();
    if (!storage) return;

    const settings = storage.get('settings') || {};
    const audio = getAudio();
    const ui = getUI();

    if (audio) {
      if (typeof audio.setSoundEnabled === 'function') {
        audio.setSoundEnabled(settings.soundEnabled !== false);
      }
      if (typeof audio.setMusicEnabled === 'function') {
        audio.setMusicEnabled(Boolean(settings.musicEnabled));
      }
      if (typeof audio.setTickEnabled === 'function') {
        audio.setTickEnabled(Boolean(settings.timerTickEnabled));
      }
    }

    if (ui && typeof ui.setTimerVisibility === 'function') {
      ui.setTimerVisibility(settings.timerVisibility || 'visible');
    }
  }

  /**
   * Evaluates any achievements tied to daily login / streaks.
   */
  function checkLoginAchievements() {
    const achievements = getAchievements();
    if (!achievements || typeof achievements.check !== 'function') return;

    const progress = getProgress();
    const dailyStreak = progress ? progress.getDailyStreak() : 1;

    const newlyUnlocked = achievements.check('login', { dailyStreak });
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      queueAchievementNotifications(newlyUnlocked);
    }
  }

  // ==========================================
  // 2. NAVIGATION & SCREEN ROUTING
  // ==========================================

  /**
   * Transitions to a screen and updates the navigation history stack.
   * @param {string} screenId
   * @param {'forward'|'back'|'none'} [direction='forward']
   */
  function navigateTo(screenId, direction = 'forward') {
    const ui = getUI();
    if (!ui) return;

    const audio = getAudio();
    if (audio && typeof audio.playClick === 'function' && direction !== 'none') {
      audio.playClick();
    }

    // Update history stack
    if (screenHistory.length === 0 || screenHistory[screenHistory.length - 1] !== screenId) {
      screenHistory.push(screenId);
    }

    ui.showScreen(screenId, direction);

    // Screen-specific refresh hooks
    if (screenId === ui.SCREENS.MENU) {
      const progress = getProgress();
      if (progress) {
        ui.updateMenuStats(progress.getStats());
      }
    } else if (screenId === ui.SCREENS.ACHIEVEMENTS) {
      showAchievements();
    } else if (screenId === ui.SCREENS.PROGRESS) {
      showProgress();
    } else if (screenId === ui.SCREENS.SETTINGS) {
      showSettings();
    }
  }

  /**
   * Back button navigation handler with confirmation if in an active game session.
   */
  function goBack() {
    const ui = getUI();
    if (!ui) return;

    // Check if in active game session
    if (screenHistory.length > 0 && screenHistory[screenHistory.length - 1] === ui.SCREENS.GAME) {
      const confirmQuit = window.confirm('Leave active game session? Progress for this round will be lost.');
      if (!confirmQuit) return;

      const game = getGame();
      if (game && typeof game.endGame === 'function') {
        game.endGame();
      }
      screenHistory.pop(); // Pop GAME
      navigateTo(ui.SCREENS.MODE_SELECT, 'back');
      return;
    }

    // Default pop
    if (screenHistory.length > 1) {
      screenHistory.pop(); // Remove current
      const previousScreen = screenHistory[screenHistory.length - 1];
      navigateTo(previousScreen, 'back');
    } else {
      navigateTo(ui.SCREENS.MENU, 'back');
    }
  }

  /**
   * Binds global back buttons and data-nav attributes.
   */
  function setupNavigation() {
    document.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-nav]');
      if (navBtn) {
        e.preventDefault();
        const targetScreen = navBtn.getAttribute('data-nav');
        if (targetScreen) {
          navigateTo(targetScreen, 'forward');
        }
        return;
      }

      const backBtn = e.target.closest('.btn-back, [data-action="back"], #btn-back');
      if (backBtn) {
        e.preventDefault();
        goBack();
      }
    });
  }

  // ==========================================
  // 3. MENU SETUP
  // ==========================================

  function setupMenu() {
    const ui = getUI();

    // Play button -> Mode Select
    const playBtn = document.getElementById('btn-play') || document.querySelector('[data-action="play"]');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        navigateTo(ui.SCREENS.MODE_SELECT, 'forward');
      });
    }

    // Quick Achievements button
    const achBtn = document.getElementById('btn-achievements') || document.querySelector('[data-action="achievements"]');
    if (achBtn) {
      achBtn.addEventListener('click', () => {
        navigateTo(ui.SCREENS.ACHIEVEMENTS, 'forward');
      });
    }

    // Quick Progress button
    const progBtn = document.getElementById('btn-progress') || document.querySelector('[data-action="progress"]');
    if (progBtn) {
      progBtn.addEventListener('click', () => {
        navigateTo(ui.SCREENS.PROGRESS, 'forward');
      });
    }

    // Quick Settings button
    const setBtn = document.getElementById('btn-settings') || document.querySelector('[data-action="settings"]');
    if (setBtn) {
      setBtn.addEventListener('click', () => {
        navigateTo(ui.SCREENS.SETTINGS, 'forward');
      });
    }
  }

  // ==========================================
  // 4. MODE SELECTION
  // ==========================================

  function setupModeSelect() {
    const game = getGame();
    const ui = getUI();
    const progress = getProgress();

    // Mode cards delegation
    document.addEventListener('click', (e) => {
      const modeCard = e.target.closest('[data-mode]');
      if (!modeCard) return;

      e.preventDefault();
      const mode = modeCard.getAttribute('data-mode');

      switch (mode) {
        case 'adventure': {
          const currentLvl = progress ? progress.getCurrentLevel() : 1;
          startGame(game.MODES.ADVENTURE, { level: currentLvl });
          break;
        }

        case 'quick-play': {
          startGame(game.MODES.QUICK_PLAY, { totalQuestions: 10 });
          break;
        }

        case 'speed-challenge': {
          startGame(game.MODES.SPEED_CHALLENGE, { speedDuration: 60000 });
          break;
        }

        case 'practice': {
          navigateTo(ui.SCREENS.PRACTICE_SELECT, 'forward');
          break;
        }

        case 'daily': {
          if (game && game.isDailyDone()) {
            if (ui) {
              ui.showToast('You already conquered today\'s challenge! Replaying for practice ⭐', 'info');
            }
          }
          startGame(game.MODES.DAILY, {});
          break;
        }

        default:
          break;
      }
    });
  }

  // ==========================================
  // 5. PRACTICE SELECTION
  // ==========================================

  function setupPracticeSelect() {
    const startPracticeBtn = document.getElementById('btn-start-practice') || document.querySelector('[data-action="start-practice"]');

    // Table toggle buttons (1 to 10)
    document.addEventListener('click', (e) => {
      const tableBtn = e.target.closest('.btn-practice-table, [data-table]');
      if (!tableBtn) return;

      const tableVal = parseInt(tableBtn.getAttribute('data-table') || tableBtn.textContent, 10);
      if (isNaN(tableVal)) return;

      if (selectedPracticeTables.has(tableVal)) {
        // Keep at least one table selected
        if (selectedPracticeTables.size > 1) {
          selectedPracticeTables.delete(tableVal);
          tableBtn.classList.remove('active', 'selected');
        }
      } else {
        selectedPracticeTables.add(tableVal);
        tableBtn.classList.add('active', 'selected');
      }
    });

    if (startPracticeBtn) {
      startPracticeBtn.addEventListener('click', () => {
        const game = getGame();
        const tablesArray = Array.from(selectedPracticeTables);
        startGame(game.MODES.PRACTICE, { tables: tablesArray });
      });
    }
  }

  // ==========================================
  // 6. GAME FLOW & CONTROLLER
  // ==========================================

  /**
   * Starts a game session in the specified mode and transitions to the game screen.
   * @param {string} mode
   * @param {Object} [options]
   */
  function startGame(mode, options = {}) {
    const game = getGame();
    const ui = getUI();
    const mascot = getMascot();

    if (!game || !ui) return;

    currentMode = mode;
    gameStarted = true;
    isAnswerPending = false;

    // Transition to game screen
    navigateTo(ui.SCREENS.GAME, 'forward');

    // Stella session start cheer
    if (mascot) {
      mascot.react('sessionStart');
    }

    // Start engine
    game.start(mode, options);
  }

  /**
   * Binds Game engine event listeners.
   */
  function setupGameEvents() {
    const game = getGame();
    if (!game || typeof game.on !== 'function') return;

    game.on('question', onNewQuestion);
    game.on('answered', onAnswered);
    game.on('tick', onTick);
    game.on('timeout', onTimeout);
    game.on('ended', onGameEnded);
    game.on('streak', onStreak);
  }

  /**
   * Handler when engine generates a new question.
   */
  function onNewQuestion(data) {
    const ui = getUI();
    const mascot = getMascot();
    isAnswerPending = false;

    if (ui) {
      ui.updateQuestion(data.question, data.answers);
      ui.updateGameProgress(data.index, data.total);
      ui.updateStreak(data.streak || 0);

      const scoreEl = document.getElementById('game-score');
      if (scoreEl) {
        scoreEl.textContent = data.score || 0;
      }
    }

    // Mascot occasionally ponders (15% chance)
    if (mascot && Math.random() < 0.15) {
      mascot.react('thinking');
    }
  }

  /**
   * Handler when player answers a question.
   */
  function onAnswered(result) {
    const ui = getUI();
    const audio = getAudio();
    const mascot = getMascot();
    const game = getGame();

    isAnswerPending = true;

    // Identify clicked button index
    let btnIndex = 0;
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`answer-btn-${i}`);
      if (btn && Number(btn.getAttribute('data-value')) === result.userAnswer) {
        btnIndex = i;
        break;
      }
    }

    if (ui) {
      ui.showAnswerResult(btnIndex, result.correct, result.correctAnswer);
      const scoreEl = document.getElementById('game-score');
      if (scoreEl) {
        scoreEl.textContent = result.score || 0;
      }
    }

    if (result.correct) {
      if (audio && typeof audio.playCorrect === 'function') {
        audio.playCorrect();
      }
      if (mascot) {
        mascot.react('correct');
      }

      // Auto-advance after 1200ms
      setTimeout(() => {
        if (game) {
          game.nextQuestion();
        }
      }, 1200);
    } else {
      if (audio && typeof audio.playWrong === 'function') {
        audio.playWrong();
      }
      if (mascot) {
        mascot.react('wrong', { hint: result.hint });
      }

      // Auto-advance after 2000ms
      setTimeout(() => {
        if (game) {
          game.nextQuestion();
        }
      }, 2000);
    }
  }

  /**
   * Handler for timer countdown ticks.
   */
  function onTick(data) {
    const ui = getUI();
    const audio = getAudio();

    if (ui) {
      ui.updateTimer(data.remaining, data.total);
    }

    // Audio warning blips
    if (audio && data.remaining <= 3000 && data.remaining > 500) {
      if (typeof audio.playTick === 'function') {
        audio.playTick();
      }
    }
  }

  /**
   * Handler when active timer runs out.
   */
  function onTimeout(data) {
    const audio = getAudio();
    const mascot = getMascot();
    const game = getGame();

    if (audio && typeof audio.playTimeout === 'function') {
      audio.playTimeout();
    }

    if (mascot) {
      mascot.react('timeout', { hint: data ? data.hint : null });
    }

    // Auto-advance after 2000ms
    setTimeout(() => {
      if (game) {
        game.nextQuestion();
      }
    }, 2000);
  }

  /**
   * Handler when game session completes.
   */
  function onGameEnded(results) {
    const ui = getUI();
    const mascot = getMascot();
    const audio = getAudio();
    const progress = getProgress();

    gameStarted = false;
    isAnswerPending = false;

    if (audio && typeof audio.playGameOver === 'function') {
      audio.playGameOver();
    }

    // Navigate to Results Screen
    if (ui) {
      navigateTo(ui.SCREENS.RESULTS, 'forward');
      ui.showResults(results);

      // Level up celebration
      if (results.leveledUp) {
        setTimeout(() => {
          if (audio && typeof audio.playLevelUp === 'function') {
            audio.playLevelUp();
          }
          if (mascot) {
            mascot.react('levelUp');
          }
          const levelInfo = progress ? progress.getLevelInfo(results.newLevel) : {};
          ui.showLevelUp(results.newLevel, levelInfo);
        }, 1200);
      } else if (mascot) {
        mascot.react('sessionEnd', { accuracy: results.accuracy / 100 });
      }

      // Queue any newly unlocked achievements
      if (results.newAchievements && results.newAchievements.length > 0) {
        setTimeout(() => {
          queueAchievementNotifications(results.newAchievements);
        }, results.leveledUp ? 3500 : 1500);
      }
    }
  }

  /**
   * Handler when player hits a streak milestone.
   */
  function onStreak(streakCount) {
    const ui = getUI();
    const mascot = getMascot();
    const audio = getAudio();

    if (ui) {
      ui.updateStreak(streakCount);
      ui.spawnStars(window.innerWidth / 2, window.innerHeight / 2, 18);
    }

    if (mascot) {
      mascot.react('streak', { streak: streakCount });
    }

    if (audio && typeof audio.playStreak === 'function') {
      audio.playStreak(streakCount);
    }
  }

  // ==========================================
  // 7. INPUT HANDLING (BUTTONS & KEYPAD)
  // ==========================================

  function setupAnswerButtons() {
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`answer-btn-${i}`);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          if (isAnswerPending) return;

          const game = getGame();
          const val = Number(btn.getAttribute('data-value'));
          if (game && !isNaN(val)) {
            game.submitAnswer(val);
          }
        });
      }
    }
  }

  function setupKeypad() {
    const keypadContainer = document.getElementById('keypad-area');
    const keypadInput = document.getElementById('keypad-input');   // hidden <input>
    const keypadDisplay = document.getElementById('keypad-display'); // visible <div>
    if (!keypadContainer) return;

    /** Sync the visible display div with the hidden input value */
    function syncDisplay() {
      if (keypadDisplay) {
        keypadDisplay.textContent = keypadInput && keypadInput.value ? keypadInput.value : '_';
      }
    }

    document.addEventListener('click', (e) => {
      const keyBtn = e.target.closest('[data-key]');
      if (!keyBtn) return;

      e.preventDefault();
      const key = keyBtn.getAttribute('data-key');

      if (key === 'enter') {
        if (keypadInput && keypadInput.value) {
          const game = getGame();
          if (game && !isAnswerPending) {
            game.submitAnswer(Number(keypadInput.value));
            keypadInput.value = '';
            syncDisplay();
          }
        }
      } else if (key === 'clear') {
        if (keypadInput) { keypadInput.value = ''; syncDisplay(); }
      } else if (key === 'backspace') {
        if (keypadInput) { keypadInput.value = keypadInput.value.slice(0, -1); syncDisplay(); }
      } else {
        if (keypadInput && keypadInput.value.length < 4) {
          keypadInput.value += key;
          syncDisplay();
        }
      }
    });
  }

  /**
   * Keyboard shortcuts for accessibility and desktop users.
   */
  function setupKeyboard() {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    window.addEventListener('keydown', (e) => {
      // Ignore keystrokes when interacting with text inputs or textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      const ui = getUI();
      const current = screenHistory[screenHistory.length - 1];

      // Escape / Backspace -> Back
      if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
        return;
      }

      // If in game: keys 1, 2, 3, 4 map to answer buttons 0, 1, 2, 3
      if (ui && current === ui.SCREENS.GAME && !isAnswerPending) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          const idx = parseInt(e.key, 10) - 1;
          const btn = document.getElementById(`answer-btn-${idx}`);
          if (btn && !btn.disabled) {
            btn.click();
          }
        }
      }
    });
  }

  // ==========================================
  // 8. ACHIEVEMENTS SCREEN
  // ==========================================

  function showAchievements() {
    const ui = getUI();
    const achievements = getAchievements();
    if (!ui || !achievements) return;

    const allDefs = achievements.DEFINITIONS || [];
    const unlockedDefs = achievements.getUnlocked() || [];
    const unlockedIds = unlockedDefs.map((a) => a.id);

    ui.renderAchievements(allDefs, unlockedIds);

    // Filter tabs delegation
    const filterTabs = document.querySelectorAll('.achievement-filter-btn, [data-filter]');
    filterTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        filterTabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.getAttribute('data-filter') || 'all';
        const cards = document.querySelectorAll('.achievement-card');

        cards.forEach((card) => {
          if (filter === 'all') {
            card.style.display = '';
          } else if (filter === 'unlocked') {
            card.style.display = card.classList.contains('unlocked') ? '' : 'none';
          } else if (filter === 'locked') {
            card.style.display = card.classList.contains('locked') ? '' : 'none';
          }
        });
      });
    });
  }

  // ==========================================
  // 9. PROGRESS DASHBOARD SCREEN
  // ==========================================

  function showProgress() {
    const ui = getUI();
    const progress = getProgress();
    if (!ui || !progress) return;

    const stats = progress.getStats();
    ui.renderProgress(stats);
  }

  // ==========================================
  // 10. SETTINGS & PREFERENCES
  // ==========================================

  function showSettings() {
    const ui = getUI();
    const storage = getStorage();
    if (!ui || !storage) return;

    const settings = storage.get('settings') || {};
    ui.renderSettings(settings);
  }

  function setupSettingsEvents() {
    const bindChange = (id, key, transform = (v) => v) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', (e) => {
          const val = transform(e.target.type === 'checkbox' ? e.target.checked : e.target.value);
          onSettingChange(key, val);
        });
      }
    };

    bindChange('setting-sound', 'soundEnabled');
    bindChange('setting-music', 'musicEnabled');
    bindChange('setting-timer-tick', 'timerTickEnabled');
    bindChange('setting-timer-visibility', 'timerVisibility');
    bindChange('setting-answer-mode', 'answerMode');
    bindChange('setting-animations', 'animationsEnabled');
    bindChange('setting-difficulty', 'difficulty');

    // Reset progress button
    const resetProgressBtn = document.getElementById('btn-reset-progress');
    if (resetProgressBtn) {
      resetProgressBtn.addEventListener('click', () => {
        const confirmed = window.confirm(
          'Are you sure you want to reset your level progress, XP, and stars? Settings will be preserved.'
        );
        if (confirmed) {
          const storage = getStorage();
          if (storage) {
            storage.reset();
            const ui = getUI();
            if (ui) ui.showToast('Progress has been reset! ⭐', 'info');
            showSettings();
          }
        }
      });
    }

    // Reset all button
    const resetAllBtn = document.getElementById('btn-reset-progress');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        const confirmed = window.confirm(
          'Are you sure you want to completely erase ALL data and restore factory defaults?'
        );
        if (confirmed) {
          const storage = getStorage();
          if (storage) {
            storage.resetAll();
            applyStoredSettings();
            const ui = getUI();
            if (ui) ui.showToast('All data has been reset to defaults! 🌈', 'info');
            showSettings();
          }
        }
      });
    }
  }

  /**
   * Persists a setting change and applies it immediately to active systems.
   */
  function onSettingChange(key, value) {
    const storage = getStorage();
    if (storage) {
      storage.set(`settings.${key}`, value);
    }

    const audio = getAudio();
    const ui = getUI();

    if (key === 'soundEnabled' && audio && typeof audio.setSoundEnabled === 'function') {
      audio.setSoundEnabled(Boolean(value));
    }
    if (key === 'musicEnabled' && audio && typeof audio.setMusicEnabled === 'function') {
      audio.setMusicEnabled(Boolean(value));
    }
    if (key === 'timerTickEnabled' && audio && typeof audio.setTickEnabled === 'function') {
      audio.setTickEnabled(Boolean(value));
    }
    if (key === 'timerVisibility' && ui && typeof ui.setTimerVisibility === 'function') {
      ui.setTimerVisibility(value);
    }
    if (key === 'animationsEnabled') {
      if (value === false) {
        document.body.classList.add('reduced-motion');
      } else {
        document.body.classList.remove('reduced-motion');
      }
    }
  }

  // ==========================================
  // 11. OVERLAYS & MODALS
  // ==========================================

  function setupOverlays() {
    const ui = getUI();
    if (!ui) return;

    // Close buttons on overlays
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.overlay-close, [data-close-overlay]');
      if (!closeBtn) return;

      const overlay = closeBtn.closest('.overlay');
      if (overlay) {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
      }
    });

    // Results screen play again & menu buttons
    const playAgainBtn = document.getElementById('btn-play-again') || document.querySelector('[data-action="play-again"]');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        if (currentMode) {
          startGame(currentMode);
        } else {
          navigateTo(ui.SCREENS.MODE_SELECT, 'forward');
        }
      });
    }

    const resultsMenuBtn = document.getElementById('btn-results-menu') || document.querySelector('[data-action="results-menu"]');
    if (resultsMenuBtn) {
      resultsMenuBtn.addEventListener('click', () => {
        navigateTo(ui.SCREENS.MENU, 'back');
      });
    }
  }

  /**
   * Queues unlocked achievements and displays each sequentially with a 3s delay.
   * @param {Array<string>} achievementIds
   */
  function queueAchievementNotifications(achievementIds) {
    if (!Array.isArray(achievementIds) || achievementIds.length === 0) return;

    const achievements = getAchievements();
    if (!achievements) return;

    const defsMap = new Map((achievements.DEFINITIONS || []).map((d) => [d.id, d]));

    for (let i = 0; i < achievementIds.length; i++) {
      const def = defsMap.get(achievementIds[i]);
      if (def) {
        achievementQueue.push(def);
      }
    }

    processAchievementQueue();
  }

  /**
   * Sequentially displays queued achievements.
   */
  function processAchievementQueue() {
    if (isDisplayingAchievement || achievementQueue.length === 0) return;

    isDisplayingAchievement = true;
    const nextAch = achievementQueue.shift();
    const ui = getUI();
    const audio = getAudio();

    if (audio && typeof audio.playAchievement === 'function') {
      audio.playAchievement();
    }

    if (ui && typeof ui.showAchievementUnlock === 'function') {
      ui.showAchievementUnlock(nextAch);
    }

    setTimeout(() => {
      isDisplayingAchievement = false;
      processAchievementQueue();
    }, 3500);
  }

  // ==========================================
  // 12. BOOTSTRAP TRIGGER
  // ==========================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
