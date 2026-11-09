/**
 * Multiplication Quest - UI Orchestration & Rendering Engine
 * File: js/ui.js
 *
 * Handles DOM manipulation, screen navigation transitions, canvas particle systems
 * (stars and confetti), circular SVG timer countdowns, answer feedback animations,
 * modal overlays, toasts, and dashboard visualizations.
 */
const UI = (() => {
  'use strict';

  // Screen element IDs
  const SCREENS = {
    MENU: 'screen-menu',
    MODE_SELECT: 'screen-mode-select',
    PRACTICE_SELECT: 'screen-practice-select',
    GAME: 'screen-game',
    RESULTS: 'screen-results',
    ACHIEVEMENTS: 'screen-achievements',
    PROGRESS: 'screen-progress',
    SETTINGS: 'screen-settings',
  };

  // Overlay element IDs
  const OVERLAYS = {
    LEVEL_UP: 'overlay-levelup',
    ACHIEVEMENT: 'overlay-achievement',
  };

  let currentScreen = null;
  let particleCanvas = null;
  let particleCtx = null;
  let particles = [];
  let animFrame = null;
  let isParticleLoopRunning = false;

  // Particle color palettes
  const STAR_COLORS = ['#fbbf24', '#f59e0b', '#fde047', '#ffffff', '#fed7aa'];
  const CONFETTI_COLORS = [
    '#8b5cf6', // primary purple
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#10b981', // emerald green
    '#ec4899', // pink
    '#fbbf24', // gold
    '#06b6d4', // cyan
    '#f43f5e', // rose
  ];

  /**
   * Helper to safely query an element by ID.
   * @param {string} id
   * @returns {HTMLElement|null}
   */
  function getEl(id) {
    if (!id) return null;
    return document.getElementById(id);
  }

  // ==========================================
  // 1. PARTICLE SYSTEM (Canvas Stars & Confetti)
  // ==========================================

  /**
   * Resizes the canvas to match viewport taking device pixel ratio into account.
   */
  function resizeParticleCanvas() {
    if (!particleCanvas || !particleCtx) return;
    const dpr = window.devicePixelRatio || 1;
    particleCanvas.width = window.innerWidth * dpr;
    particleCanvas.height = window.innerHeight * dpr;
    particleCanvas.style.width = `${window.innerWidth}px`;
    particleCanvas.style.height = `${window.innerHeight}px`;
    particleCtx.setTransform(1, 0, 0, 1, 0, 0);
    particleCtx.scale(dpr, dpr);
  }

  /**
   * Spawns a burst of golden star particles exploding from (x, y).
   * @param {number} x
   * @param {number} y
   * @param {number} [count=20]
   */
  function spawnStars(x, y, count = 20) {
    const originX = typeof x === 'number' ? x : window.innerWidth / 2;
    const originY = typeof y === 'number' ? y : window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      const maxLife = Math.floor(Math.random() * 30) + 35;

      particles.push({
        type: 'star',
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        gravity: 0.14,
        size: Math.random() * 7 + 5,
        color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        life: 0,
        maxLife,
      });
    }

    startParticleLoop();
  }

  /**
   * Spawns colorful confetti particles falling from top of viewport.
   * @param {number} [count=60]
   */
  function spawnConfetti(count = 60) {
    const width = window.innerWidth;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = -10 - Math.random() * 50;
      const maxLife = Math.floor(Math.random() * 60) + 90;

      particles.push({
        type: 'confetti',
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 3.5 + 2.5,
        width: Math.random() * 8 + 6,
        height: Math.random() * 12 + 8,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.12,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.08 + 0.04,
        life: 0,
        maxLife,
      });
    }

    startParticleLoop();
  }

  /**
   * Draws a 5-pointed star on the canvas context.
   */
  function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color, alpha) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fill();
    ctx.restore();
  }

  /**
   * Starts the requestAnimationFrame loop if not active.
   */
  function startParticleLoop() {
    if (isParticleLoopRunning) return;
    isParticleLoopRunning = true;
    particleLoop();
  }

  /**
   * Continuous animation loop updating and rendering active particles.
   */
  function particleLoop() {
    if (!particleCtx || !particleCanvas) {
      isParticleLoopRunning = false;
      return;
    }

    particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;

      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;

      if (p.type === 'star') {
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        const currentSize = p.size * (1 - progress * 0.4);
        drawStar(particleCtx, p.x, p.y, 5, currentSize, currentSize / 2, p.color, alpha);
      } else if (p.type === 'confetti') {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 1.5;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        particleCtx.save();
        particleCtx.translate(p.x, p.y);
        particleCtx.rotate(p.rotation);
        particleCtx.fillStyle = p.color;
        particleCtx.globalAlpha = Math.max(0, Math.min(1, alpha));
        particleCtx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        particleCtx.restore();
      }

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0) {
      animFrame = requestAnimationFrame(particleLoop);
    } else {
      isParticleLoopRunning = false;
      particleCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  // ==========================================
  // 2. SCREEN TRANSITIONS & OVERLAYS
  // ==========================================

  /**
   * Displays the specified screen with entering animation and hides the previous one.
   * @param {string} screenId - Target screen DOM ID
   * @param {string} [direction='none'] - 'forward' | 'back' | 'none'
   */
  function showScreen(screenId, direction = 'none') {
    const targetScreen = getEl(screenId);
    if (!targetScreen) {
      console.warn(`[UI] Screen element #${screenId} not found`);
      return;
    }

    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach((scr) => {
      if (scr.id !== screenId) {
        if (scr.classList.contains('active')) {
          scr.classList.remove('active');
          scr.classList.add('exit');
          scr.setAttribute('aria-hidden', 'true');
          setTimeout(() => {
            scr.classList.remove('exit');
          }, 300);
        } else {
          scr.classList.remove('active', 'exit');
          scr.setAttribute('aria-hidden', 'true');
        }
      }
    });

    targetScreen.classList.remove('exit');
    targetScreen.classList.add('active');
    targetScreen.setAttribute('aria-hidden', 'false');

    // Directional entrance animations
    targetScreen.classList.remove('anim-slide-in-right', 'anim-slide-out-left', 'anim-slide-up');
    if (direction === 'forward') {
      targetScreen.classList.add('anim-slide-in-right');
    } else if (direction === 'back') {
      targetScreen.classList.add('anim-slide-up');
    }

    currentScreen = screenId;
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }
  }

  /**
   * Displays a modal overlay.
   * @param {string} overlayId
   */
  function showOverlay(overlayId) {
    const el = getEl(overlayId);
    if (!el) return;
    el.classList.add('active');
    el.setAttribute('aria-hidden', 'false');
  }

  /**
   * Hides a modal overlay.
   * @param {string} overlayId
   */
  function hideOverlay(overlayId) {
    const el = getEl(overlayId);
    if (!el) return;
    el.classList.remove('active');
    el.setAttribute('aria-hidden', 'true');
  }

  // ==========================================
  // 3. GAMEPLAY UI UPDATES
  // ==========================================

  /**
   * Renders the current question and the 4 answer choices.
   * @param {{ a: number, b: number, answer: number }} question
   * @param {Array<number>} answers - Array of 4 answer options
   */
  function updateQuestion(question, answers) {
    if (!question || !Array.isArray(answers)) return;

    const displayEl = getEl('question-display');
    if (displayEl) {
      displayEl.textContent = `${question.a} × ${question.b} = ?`;
      displayEl.classList.remove('anim-pop', 'anim-bounce-in');
      void displayEl.offsetWidth; // Force reflow
      displayEl.classList.add('anim-pop');
    }

    // Populate answer buttons
    for (let i = 0; i < 4; i++) {
      const btn = getEl(`answer-btn-${i}`);
      if (btn) {
        btn.textContent = answers[i] !== undefined ? answers[i] : '';
        btn.setAttribute('data-value', answers[i]);
        btn.disabled = false;
        btn.classList.remove('correct', 'wrong', 'disabled', 'anim-correct', 'anim-wrong');
      }
    }
  }

  /**
   * Updates circular SVG countdown timer and text display.
   * @param {number} remaining - Time left in ms
   * @param {number} total - Total duration in ms
   */
  function updateTimer(remaining, total) {
    const circleEl = getEl('timer-circle');
    const textEl = getEl('timer-text');
    const containerEl = getEl('timer-container');

    if (!total || total <= 0) {
      if (containerEl) containerEl.classList.add('hidden');
      return;
    }

    if (containerEl) {
      containerEl.classList.remove('hidden');
    }

    const safeRemaining = Math.max(0, remaining);
    const fraction = Math.max(0, Math.min(1, safeRemaining / total));
    const seconds = Math.ceil(safeRemaining / 1000);

    if (textEl) {
      textEl.textContent = `${seconds}s`;
    }

    if (circleEl) {
      const radius = circleEl.r?.baseVal?.value || 36;
      const circumference = 2 * Math.PI * radius;
      circleEl.style.strokeDasharray = `${circumference} ${circumference}`;
      const offset = circumference - fraction * circumference;
      circleEl.style.strokeDashoffset = `${offset}`;

      // Urgency states
      circleEl.classList.remove('timer-warning', 'timer-danger');
      if (containerEl) containerEl.classList.remove('timer-warning', 'timer-danger');

      if (fraction <= 0.15) {
        circleEl.classList.add('timer-danger');
        if (containerEl) containerEl.classList.add('timer-danger');
      } else if (fraction <= 0.3) {
        circleEl.classList.add('timer-warning');
        if (containerEl) containerEl.classList.add('timer-warning');
      }
    }
  }

  /**
   * Highlights clicked answer button as correct/wrong and reveals actual answer if wrong.
   * @param {number} btnIndex - Index 0-3 of clicked button
   * @param {boolean} isCorrect
   * @param {number} correctAnswer
   */
  function showAnswerResult(btnIndex, isCorrect, correctAnswer) {
    const clickedBtn = getEl(`answer-btn-${btnIndex}`);

    // Disable all answer buttons to prevent multiple clicks
    for (let i = 0; i < 4; i++) {
      const b = getEl(`answer-btn-${i}`);
      if (b) {
        b.disabled = true;
        b.classList.add('disabled');
      }
    }

    if (clickedBtn) {
      if (isCorrect) {
        clickedBtn.classList.add('correct', 'anim-correct');
        const rect = clickedBtn.getBoundingClientRect();
        spawnStars(rect.left + rect.width / 2, rect.top + rect.height / 2, 22);
      } else {
        clickedBtn.classList.add('wrong', 'anim-wrong');
      }
    }

    // Reveal correct button if clicked button was wrong
    if (!isCorrect) {
      for (let i = 0; i < 4; i++) {
        const b = getEl(`answer-btn-${i}`);
        if (b && Number(b.getAttribute('data-value')) === correctAnswer) {
          b.classList.add('correct', 'anim-correct');
          break;
        }
      }
    }
  }

  /**
   * Spawns floating XP notification drifting up from (x, y).
   * @param {number} amount
   * @param {number} [x]
   * @param {number} [y]
   */
  function animateXPGain(amount, x, y) {
    if (!amount || amount <= 0) return;

    const floater = document.createElement('div');
    floater.className = 'xp-floater anim-slide-up';
    floater.textContent = `+${amount} XP`;
    floater.style.position = 'fixed';
    floater.style.zIndex = '999';
    floater.style.color = '#fbbf24';
    floater.style.fontFamily = 'var(--font-display, Fredoka One, cursive)';
    floater.style.fontSize = '1.25rem';
    floater.style.pointerEvents = 'none';
    floater.style.textShadow = '0 2px 8px rgba(0,0,0,0.6)';

    const posX = typeof x === 'number' ? x : window.innerWidth / 2;
    const posY = typeof y === 'number' ? y : window.innerHeight / 2;
    floater.style.left = `${posX}px`;
    floater.style.top = `${posY}px`;

    document.body.appendChild(floater);

    setTimeout(() => {
      if (floater.parentNode) {
        floater.parentNode.removeChild(floater);
      }
    }, 1200);
  }

  /**
   * Smoothly animates counting a number value up from `from` to `to`.
   * @param {number} from
   * @param {number} to
   * @param {string} elementId
   * @param {number} [duration=600]
   */
  function animateScoreCount(from, to, elementId, duration = 600) {
    const el = getEl(elementId);
    if (!el) return;

    const startVal = Number(from) || 0;
    const endVal = Number(to) || 0;
    const startTime = performance.now();

    function updateCounter(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const currentVal = Math.round(startVal + (endVal - startVal) * eased);
      el.textContent = currentVal;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        el.textContent = endVal;
      }
    }

    requestAnimationFrame(updateCounter);
  }

  /**
   * Updates player statistics on main menu screen.
   * @param {Object} stats
   */
  function updateMenuStats(stats) {
    if (!stats) return;

    const levelEl = getEl('menu-level');
    const starsEl = getEl('menu-stars');
    const xpFillEl = getEl('menu-xp-fill');
    const streakEl = getEl('menu-streak');
    const bestScoreEl = getEl('menu-best-score');
    const accuracyEl = getEl('menu-accuracy');

    if (levelEl) levelEl.textContent = stats.currentLevel || 1;
    if (starsEl) starsEl.textContent = stats.totalStars || 0;
    if (streakEl) streakEl.textContent = stats.dailyStreak || stats.inGameStreak || 0;
    if (bestScoreEl) bestScoreEl.textContent = stats.bestStreak || stats.bestScore || 0;
    if (accuracyEl) accuracyEl.textContent = `${stats.accuracy || 0}%`;

    if (xpFillEl && stats.xpProgress) {
      const pct = Math.max(0, Math.min(100, stats.xpProgress.percentage || 0));
      xpFillEl.style.width = `${pct}%`;
    }
  }

  /**
   * Populates the results screen with session metrics and animates rewards.
   * @param {Object} results
   */
  function showResults(results) {
    if (!results) return;

    const scoreEl = getEl('results-score');
    const accuracyEl = getEl('results-accuracy');
    const xpGainEl = getEl('results-xp-gain');
    const msgEl = getEl('results-message');

    if (accuracyEl) accuracyEl.textContent = `${results.accuracy}%`;
    if (xpGainEl) xpGainEl.textContent = `+${results.totalXPEarned || 0} XP`;

    // Dynamic congratulatory message
    if (msgEl) {
      if (results.accuracy >= 90) {
        msgEl.textContent = '🌟 Outstanding! You are a Multiplication Master!';
      } else if (results.accuracy >= 70) {
        msgEl.textContent = '🎉 Great job! You are improving so fast!';
      } else {
        msgEl.textContent = '💪 Good effort! Practice makes perfect!';
      }
    }

    // Animate score counter
    animateScoreCount(0, results.score || 0, 'results-score', 800);

    // Staggered star animation
    const earnedStars = results.stars || 0;
    for (let i = 1; i <= 3; i++) {
      const starEl = getEl(`results-stars-${i}`);
      if (starEl) {
        starEl.classList.remove('earned', 'anim-pop');
        if (i <= earnedStars) {
          setTimeout(() => {
            starEl.classList.add('earned', 'anim-pop');
            const rect = starEl.getBoundingClientRect();
            spawnStars(rect.left + rect.width / 2, rect.top + rect.height / 2, 12);
          }, i * 350);
        }
      }
    }

    // Fire confetti for perfect rounds or 3-star achievements
    if (earnedStars === 3 || results.accuracy === 100) {
      setTimeout(() => {
        spawnConfetti(70);
      }, 700);
    }
  }

  /**
   * Displays the Level Up overlay with celebratory visuals and confetti.
   * @param {number} newLevel
   * @param {Object} [rewards]
   */
  function showLevelUp(newLevel, rewards = {}) {
    const levelEl = getEl('levelup-new-level');
    const rewardsEl = getEl('levelup-rewards');

    if (levelEl) {
      levelEl.textContent = `Level ${newLevel}`;
    }

    if (rewardsEl) {
      const rewardText = rewards.tables
        ? `Unlocked Tables: ${rewards.tables.join(', ')}`
        : 'New challenges unlocked! ⭐';
      rewardsEl.textContent = rewardText;
    }

    showOverlay(OVERLAYS.LEVEL_UP);
    spawnConfetti(90);
  }

  /**
   * Displays achievement unlock notification overlay or floating toast.
   * @param {Object} achievement - { id, title, desc, icon }
   */
  function showAchievementUnlock(achievement) {
    if (!achievement) return;

    const titleEl = getEl('achievement-unlock-title');
    const descEl = getEl('achievement-unlock-desc');
    const iconEl = getEl('achievement-unlock-icon');

    if (titleEl) titleEl.textContent = achievement.title || 'Achievement Unlocked!';
    if (descEl) descEl.textContent = achievement.desc || '';
    if (iconEl) iconEl.textContent = achievement.icon || '🏆';

    // Check if modal overlay exists or create toast
    const overlay = getEl(OVERLAYS.ACHIEVEMENT);
    if (overlay) {
      showOverlay(OVERLAYS.ACHIEVEMENT);
      spawnStars(window.innerWidth / 2, window.innerHeight / 3, 20);
      setTimeout(() => {
        hideOverlay(OVERLAYS.ACHIEVEMENT);
      }, 3500);
    } else {
      showToast(`${achievement.icon || '🏆'} ${achievement.title}: ${achievement.desc}`, 'success');
    }
  }

  /**
   * Renders the achievements grid with locked and unlocked visual states.
   * @param {Array<Object>} allAchievements
   * @param {Array<string>|Set<string>} unlockedIds
   */
  function renderAchievements(allAchievements, unlockedIds = []) {
    const grid = getEl('achievements-grid');
    if (!grid) return;

    const unlockedSet = unlockedIds instanceof Set ? unlockedIds : new Set(unlockedIds);
    grid.innerHTML = '';

    allAchievements.forEach((ach) => {
      const isUnlocked = unlockedSet.has(ach.id);
      const card = document.createElement('div');
      card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.setAttribute('data-id', ach.id);

      card.innerHTML = `
        <div class="achievement-icon-wrapper">
          <span class="achievement-icon">${ach.icon || '🌟'}</span>
          ${isUnlocked ? '<span class="achievement-badge">✓</span>' : '<span class="achievement-badge lock">🔒</span>'}
        </div>
        <div class="achievement-info">
          <h4 class="achievement-title">${ach.title}</h4>
          <p class="achievement-desc">${ach.desc}</p>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  /**
   * Renders the player progress dashboard including table mastery bars.
   * @param {Object} stats
   */
  function renderProgress(stats) {
    if (!stats) return;

    const starsEl = getEl('progress-total-stars');
    const accuracyEl = getEl('progress-accuracy');
    const streakEl = getEl('progress-best-streak');
    const daysEl = getEl('progress-days');

    if (starsEl) starsEl.textContent = stats.totalStars || 0;
    if (accuracyEl) accuracyEl.textContent = `${stats.accuracy || 0}%`;
    if (streakEl) streakEl.textContent = stats.bestStreak || 0;
    if (daysEl) daysEl.textContent = stats.dailyStreak || 0;

    // Render table accuracy mastery bars (tables 1 to 10)
    const tableContainer = getEl('progress-table-bars') || getEl('progress-tables-grid');
    if (tableContainer && stats.tableStats) {
      tableContainer.innerHTML = '';

      for (let table = 1; table <= 10; table++) {
        const tStat = stats.tableStats[table] || { answered: 0, correct: 0 };
        const pct = tStat.answered > 0 ? Math.round((tStat.correct / tStat.answered) * 100) : 0;

        const row = document.createElement('div');
        row.className = 'table-stat-row flex items-center justify-between gap-sm';
        row.innerHTML = `
          <div class="table-stat-label" style="min-width: 55px; font-weight: bold;">
            Table ${table}
          </div>
          <div class="table-stat-bar-bg flex-1" style="height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; margin: 0 8px;">
            <div class="table-stat-bar-fill" style="width: ${pct}%; height: 100%; background: ${pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#8b5cf6'}; transition: width 0.4s ease;"></div>
          </div>
          <div class="table-stat-pct" style="min-width: 45px; text-align: right; font-size: 0.85rem; color: #94a3b8;">
            ${pct}% (${tStat.correct}/${tStat.answered})
          </div>
        `;
        tableContainer.appendChild(row);
      }
    }
  }

  /**
   * Populates settings controls with the saved state.
   * @param {Object} settings
   */
  function renderSettings(settings) {
    if (!settings) return;

    const setChecked = (id, val) => {
      const el = getEl(id);
      if (el && 'checked' in el) el.checked = Boolean(val);
    };

    const setValue = (id, val) => {
      const el = getEl(id);
      if (el && 'value' in el) el.value = val;
    };

    setChecked('setting-sound', settings.soundEnabled);
    setChecked('setting-music', settings.musicEnabled);
    setChecked('setting-timer-tick', settings.timerTickEnabled);
    setChecked('setting-animations', settings.animationsEnabled);
    setValue('setting-timer-visibility', settings.timerVisibility || 'visible');
    setValue('setting-answer-mode', settings.answerMode || 'multiple-choice');
    setValue('setting-difficulty', settings.difficulty || 'adaptive');
  }

  /**
   * Displays a toast notification.
   * @param {string} message
   * @param {'success'|'info'|'error'} [type='info']
   */
  function showToast(message, type = 'info') {
    let container = document.querySelector('.achievement-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'achievement-toast-container';
      container.style.position = 'fixed';
      container.style.top = '16px';
      container.style.right = '16px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '8px';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} anim-slide-in-right`;
    toast.textContent = message;
    toast.style.padding = '12px 18px';
    toast.style.borderRadius = '12px';
    toast.style.background = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#8b5cf6';
    toast.style.color = '#ffffff';
    toast.style.fontWeight = 'bold';
    toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
    toast.style.pointerEvents = 'auto';

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('anim-slide-out-left');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 400);
    }, 3200);
  }

  /**
   * Updates streak counter and toggles flame animation if streak >= 3.
   * @param {number} count
   */
  function updateStreak(count) {
    const streakEl = getEl('game-streak');
    if (!streakEl) return;

    streakEl.textContent = count;
    streakEl.classList.remove('anim-streak-fire');

    if (count >= 3) {
      streakEl.classList.add('anim-streak-fire');
    }
  }

  /**
   * Sets the timer display visibility mode.
   * @param {'visible'|'icon'|'hidden'} mode
   */
  function setTimerVisibility(mode) {
    const container = getEl('timer-container');
    if (!container) return;

    container.classList.remove('hidden', 'timer-icon-only');
    if (mode === 'hidden') {
      container.classList.add('hidden');
    } else if (mode === 'icon') {
      container.classList.add('timer-icon-only');
    }
  }

  /**
   * Updates width of the in-game or menu XP bar.
   * @param {number} current
   * @param {number} total
   */
  function updateXPBar(current, total) {
    const bar = getEl('game-xp-fill') || getEl('menu-xp-fill');
    if (!bar) return;
    const safeTotal = total > 0 ? total : 100;
    const pct = Math.max(0, Math.min(100, (current / safeTotal) * 100));
    bar.style.width = `${pct}%`;
  }

  /**
   * Updates the in-game question progress bar.
   * @param {number} answered
   * @param {number} total
   */
  function updateGameProgress(answered, total) {
    const fill = getEl('game-progress-fill');
    if (!fill) return;
    const safeTotal = total > 0 ? total : 10;
    const pct = Math.max(0, Math.min(100, (answered / safeTotal) * 100));
    fill.style.width = `${pct}%`;
  }

  /**
   * Brief screen color flash effect for celebration or alert.
   * @param {string} [color='rgba(34, 197, 94, 0.25)']
   */
  function flashScreen(color = 'rgba(34, 197, 94, 0.25)') {
    let flash = getEl('screen-flash');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'screen-flash';
      flash.style.position = 'fixed';
      flash.style.inset = '0';
      flash.style.pointerEvents = 'none';
      flash.style.zIndex = '150';
      flash.style.transition = 'opacity 0.4s ease';
      document.body.appendChild(flash);
    }

    flash.style.backgroundColor = color;
    flash.style.opacity = '1';

    setTimeout(() => {
      flash.style.opacity = '0';
    }, 150);
  }

  /**
   * Initializes the canvas particle layer and event listeners.
   */
  function init() {
    particleCanvas = getEl('particle-canvas');
    if (!particleCanvas && document.body) {
      particleCanvas = document.createElement('canvas');
      particleCanvas.id = 'particle-canvas';
      document.body.appendChild(particleCanvas);
    }

    if (particleCanvas && typeof particleCanvas.getContext === 'function') {
      particleCtx = particleCanvas.getContext('2d');
      resizeParticleCanvas();

      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.removeEventListener('resize', resizeParticleCanvas);
        window.addEventListener('resize', resizeParticleCanvas);
      }
    }
  }

  return {
    SCREENS,
    OVERLAYS,
    init,
    showScreen,
    showOverlay,
    hideOverlay,
    updateQuestion,
    updateTimer,
    showAnswerResult,
    animateXPGain,
    animateScoreCount,
    updateMenuStats,
    showResults,
    showLevelUp,
    showAchievementUnlock,
    renderAchievements,
    renderProgress,
    renderSettings,
    showToast,
    updateStreak,
    setTimerVisibility,
    spawnStars,
    spawnConfetti,
    updateXPBar,
    updateGameProgress,
    flashScreen,
  };
})();

// Attach to global window
window.UI = UI;
