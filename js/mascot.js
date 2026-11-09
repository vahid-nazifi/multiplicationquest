/**
 * Multiplication Quest - Mascot Module (Stella)
 * File: js/mascot.js
 *
 * Manages Stella the Star Mascot's expressions, dialogue bubbles, animations,
 * and contextual reactions to gameplay events.
 */
const Mascot = (() => {
  'use strict';

  // Mascot expressions
  const EXPRESSIONS = {
    idle: 'idle',
    happy: 'happy',
    excited: 'excited',
    thinking: 'thinking',
    encouraging: 'encouraging',
    celebrating: 'celebrating',
  };

  // Dialogue messages pools
  const MESSAGES = {
    welcome: [
      "Hi! I'm Stella! Ready to become a Multiplication Master? ⭐",
      "Welcome back, Explorer! Let's practise together! 🌟",
      "Great to see you! Shall we do some maths magic? ✨",
    ],
    correct: [
      "Fantastic! You got it! 🎉",
      "Amazing work! You're a superstar! ⭐",
      "Brilliant! Keep going! 🚀",
      "Yes! That's exactly right! 💫",
      "You're on fire! 🔥",
      "Incredible! You make maths look easy! 🌟",
      "Woohoo! Perfect answer! ✨",
    ],
    wrong: [
      "Not quite — let's try together! 💪",
      "Oops! Every mistake helps us learn! 🌈",
      "Almost there! You've got this! ⭐",
      "Keep going — you're doing great! 🌟",
    ],
    streak: [
      (n) => `${n} in a row! You're amazing! 🔥`,
      (n) => `${n} correct! Unstoppable! ⚡`,
      (n) => `WOW! ${n} streak! You're incredible! 💫`,
    ],
    levelUp: [
      "You levelled up! I knew you could do it! 🎊",
      "LEVEL UP! You're becoming a Multiplication Master! 👑",
      "Amazing progress! A new level unlocked! 🚀",
    ],
    encouragement: [
      "You can do it! I believe in you! 💪",
      "Take your time — there's no rush! 🌟",
      "Every question makes you smarter! 🧠",
      "You're getting better every single answer! ⭐",
    ],
    hint: [], // filled dynamically from Adaptive.getHint() or reaction data
    thinking: [
      "Hmm, let me think... 🤔",
      "Good question! Take your time! ⏳",
    ],
    sessionStart: [
      "Let's go! Show me what you know! 🌟",
      "Time to shine! You've got this! ⭐",
      "Adventure awaits! Let's multiply! 🚀",
    ],
    sessionEnd: [
      (accuracy) =>
        accuracy >= 0.9
          ? "Outstanding! You're a star! 🌟"
          : accuracy >= 0.7
          ? "Great job! You're improving! 💪"
          : "Good effort! Practice makes perfect! 🌈",
    ],
    dailyChallenge: [
      "Today's challenge is ready! Can you beat it? 📅",
    ],
  };

  // SVG face variants for Stella the Star
  const AVATARS = {
    idle: `
      <svg viewBox="0 0 100 100" class="stella-svg" width="100%" height="100%" aria-label="Stella the Star - Idle">
        <defs>
          <radialGradient id="stellaGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="60%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#eab308" />
          </radialGradient>
        </defs>
        <!-- Star body -->
        <polygon points="50,5 64,34 96,39 73,62 78,94 50,79 22,94 27,62 4,39 36,34" fill="url(#stellaGlow)" filter="drop-shadow(0 0 10px rgba(250, 204, 21, 0.6))" />
        <!-- Cheeks -->
        <circle cx="34" cy="56" r="4.5" fill="#f87171" opacity="0.5" />
        <circle cx="66" cy="56" r="4.5" fill="#f87171" opacity="0.5" />
        <!-- Eyes -->
        <circle cx="38" cy="46" r="4" fill="#1e1b4b" />
        <circle cx="62" cy="46" r="4" fill="#1e1b4b" />
        <circle cx="36.5" cy="44.5" r="1.5" fill="#ffffff" />
        <circle cx="60.5" cy="44.5" r="1.5" fill="#ffffff" />
        <!-- Smile -->
        <path d="M 42 56 Q 50 63 58 56" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </svg>
    `,
    happy: `
      <svg viewBox="0 0 100 100" class="stella-svg" width="100%" height="100%" aria-label="Stella the Star - Happy">
        <defs>
          <radialGradient id="stellaGlowHappy" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="60%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#f59e0b" />
          </radialGradient>
        </defs>
        <polygon points="50,5 64,34 96,39 73,62 78,94 50,79 22,94 27,62 4,39 36,34" fill="url(#stellaGlowHappy)" filter="drop-shadow(0 0 14px rgba(245, 158, 11, 0.75))" />
        <circle cx="32" cy="56" r="5" fill="#f87171" opacity="0.6" />
        <circle cx="68" cy="56" r="5" fill="#f87171" opacity="0.6" />
        <!-- Happy curve eyes -->
        <path d="M 34 46 Q 38 41 42 46" stroke="#1e1b4b" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M 58 46 Q 62 41 66 46" stroke="#1e1b4b" stroke-width="3" stroke-linecap="round" fill="none" />
        <!-- Open smile -->
        <path d="M 40 54 Q 50 66 60 54 Z" fill="#ef4444" stroke="#1e1b4b" stroke-width="2" stroke-linecap="round" />
      </svg>
    `,
    excited: `
      <svg viewBox="0 0 100 100" class="stella-svg" width="100%" height="100%" aria-label="Stella the Star - Excited">
        <defs>
          <radialGradient id="stellaGlowExcited" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="40%" stop-color="#fde047" />
            <stop offset="100%" stop-color="#f59e0b" />
          </radialGradient>
        </defs>
        <polygon points="50,5 64,34 96,39 73,62 78,94 50,79 22,94 27,62 4,39 36,34" fill="url(#stellaGlowExcited)" filter="drop-shadow(0 0 18px rgba(245, 158, 11, 0.9))" />
        <!-- Sparkle crown -->
        <text x="44" y="16" font-size="12">✨</text>
        <circle cx="31" cy="57" r="5.5" fill="#f87171" opacity="0.7" />
        <circle cx="69" cy="57" r="5.5" fill="#f87171" opacity="0.7" />
        <!-- Star eyes -->
        <text x="33" y="49" font-size="11" fill="#1e1b4b">★</text>
        <text x="57" y="49" font-size="11" fill="#1e1b4b">★</text>
        <!-- Big open mouth -->
        <path d="M 38 54 Q 50 70 62 54 Z" fill="#b91c1c" stroke="#1e1b4b" stroke-width="2" />
        <ellipse cx="50" cy="62" rx="4" ry="2.5" fill="#fca5a5" />
      </svg>
    `,
    thinking: `
      <svg viewBox="0 0 100 100" class="stella-svg" width="100%" height="100%" aria-label="Stella the Star - Thinking">
        <defs>
          <radialGradient id="stellaGlowThinking" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" />
            <stop offset="70%" stop-color="#eab308" />
            <stop offset="100%" stop-color="#ca8a04" />
          </radialGradient>
        </defs>
        <polygon points="50,5 64,34 96,39 73,62 78,94 50,79 22,94 27,62 4,39 36,34" fill="url(#stellaGlowThinking)" filter="drop-shadow(0 0 10px rgba(234, 179, 8, 0.5))" />
        <circle cx="34" cy="56" r="4" fill="#f87171" opacity="0.4" />
        <circle cx="66" cy="56" r="4" fill="#f87171" opacity="0.4" />
        <!-- Looking up eyes -->
        <circle cx="38" cy="44" r="4" fill="#1e1b4b" />
        <circle cx="62" cy="44" r="4" fill="#1e1b4b" />
        <circle cx="39" cy="42.5" r="1.5" fill="#ffffff" />
        <circle cx="63" cy="42.5" r="1.5" fill="#ffffff" />
        <!-- Wavy thinking mouth -->
        <path d="M 44 58 Q 48 55 52 58 Q 56 61 60 58" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </svg>
    `,
    encouraging: `
      <svg viewBox="0 0 100 100" class="stella-svg" width="100%" height="100%" aria-label="Stella the Star - Encouraging">
        <defs>
          <radialGradient id="stellaGlowEnc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fed7aa" />
            <stop offset="60%" stop-color="#facc15" />
            <stop offset="100%" stop-color="#f97316" />
          </radialGradient>
        </defs>
        <polygon points="50,5 64,34 96,39 73,62 78,94 50,79 22,94 27,62 4,39 36,34" fill="url(#stellaGlowEnc)" filter="drop-shadow(0 0 12px rgba(249, 115, 22, 0.6))" />
        <circle cx="33" cy="56" r="5" fill="#f87171" opacity="0.6" />
        <circle cx="67" cy="56" r="5" fill="#f87171" opacity="0.6" />
        <!-- Warm blinking eyes -->
        <circle cx="37" cy="45" r="4" fill="#1e1b4b" />
        <circle cx="36" cy="44" r="1.5" fill="#ffffff" />
        <path d="M 59 47 Q 63 42 67 47" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <!-- Gentle smile -->
        <path d="M 43 56 Q 50 63 57 56" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </svg>
    `,
    celebrating: `
      <svg viewBox="0 0 100 100" class="stella-svg" width="100%" height="100%" aria-label="Stella the Star - Celebrating">
        <defs>
          <radialGradient id="stellaGlowCeleb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="50%" stop-color="#fde047" />
            <stop offset="100%" stop-color="#a855f7" />
          </radialGradient>
        </defs>
        <polygon points="50,5 64,34 96,39 73,62 78,94 50,79 22,94 27,62 4,39 36,34" fill="url(#stellaGlowCeleb)" filter="drop-shadow(0 0 20px rgba(168, 85, 247, 0.8))" />
        <!-- Party Crown -->
        <polygon points="42,20 46,10 50,18 54,10 58,20" fill="#fbbf24" stroke="#f59e0b" stroke-width="1" />
        <circle cx="32" cy="57" r="5.5" fill="#f43f5e" opacity="0.75" />
        <circle cx="68" cy="57" r="5.5" fill="#f43f5e" opacity="0.75" />
        <!-- Joyful eyes -->
        <path d="M 33 46 Q 37 40 41 46" stroke="#1e1b4b" stroke-width="3.5" stroke-linecap="round" fill="none" />
        <path d="M 59 46 Q 63 40 67 46" stroke="#1e1b4b" stroke-width="3.5" stroke-linecap="round" fill="none" />
        <!-- Huge celebratory smile -->
        <path d="M 38 53 Q 50 71 62 53 Z" fill="#dc2626" stroke="#1e1b4b" stroke-width="2" />
        <ellipse cx="50" cy="63" rx="5" ry="3" fill="#fca5a5" />
      </svg>
    `,
  };

  let currentExpression = EXPRESSIONS.idle;
  let speechTimeout = null;
  let mascotContainer = null;
  let speechElement = null;

  /**
   * Helper to resolve mascot DOM references.
   */
  function resolveElements() {
    if (!mascotContainer) {
      mascotContainer = document.getElementById('mascot-container');
    }
    if (!speechElement) {
      speechElement = document.getElementById('mascot-speech');
    }
  }

  /**
   * Updates CSS class and visual representation on the mascot element.
   * @param {string} expr - One of EXPRESSIONS
   */
  function setExpression(expr) {
    const validExpr = EXPRESSIONS[expr] || EXPRESSIONS.idle;
    currentExpression = validExpr;
    resolveElements();

    if (!mascotContainer) return;

    // Remove previous expression and animation classes
    const allExprClasses = Object.values(EXPRESSIONS).map((e) => `mascot-${e}`);
    const animationClasses = [
      'anim-mascot-happy',
      'anim-mascot-excited',
      'anim-float',
      'anim-pulse',
      'anim-bounce-in',
      'anim-pop',
    ];

    mascotContainer.classList.remove(...allExprClasses, ...animationClasses);
    mascotContainer.classList.add(`mascot-${validExpr}`);
    mascotContainer.setAttribute('data-expression', validExpr);

    // Apply fitting CSS keyframe animation based on expression
    switch (validExpr) {
      case EXPRESSIONS.happy:
        mascotContainer.classList.add('anim-mascot-happy');
        break;
      case EXPRESSIONS.excited:
      case EXPRESSIONS.celebrating:
        mascotContainer.classList.add('anim-mascot-excited');
        break;
      case EXPRESSIONS.thinking:
        mascotContainer.classList.add('anim-pulse');
        break;
      case EXPRESSIONS.encouraging:
        mascotContainer.classList.add('anim-bounce-in');
        break;
      case EXPRESSIONS.idle:
      default:
        mascotContainer.classList.add('anim-float');
        break;
    }

    // Update avatar SVG if avatar container exists or inject inside mascot container
    const avatarContainer = mascotContainer.querySelector('.mascot-avatar') || mascotContainer;
    if (AVATARS[validExpr]) {
      // Check if container contains custom markup; replace SVG if present or if clean
      const existingSvg = avatarContainer.querySelector('svg.stella-svg');
      if (existingSvg) {
        existingSvg.outerHTML = AVATARS[validExpr];
      } else if (!avatarContainer.querySelector('img')) {
        avatarContainer.innerHTML = AVATARS[validExpr];
      }
    }
  }

  /**
   * Displays a speech bubble with the given message, auto-hiding after duration.
   * @param {string} message - Text to display
   * @param {number} [duration=3000] - Display duration in ms (0 to stay indefinitely)
   */
  function say(message, duration = 3000) {
    if (!message) return;
    resolveElements();

    if (speechTimeout) {
      clearTimeout(speechTimeout);
      speechTimeout = null;
    }

    if (!speechElement) {
      return;
    }

    speechElement.textContent = message;
    speechElement.classList.remove('hidden', 'fade-out');
    speechElement.classList.add('active', 'fade-in');
    speechElement.setAttribute('aria-live', 'polite');

    if (duration > 0) {
      speechTimeout = setTimeout(() => {
        clearSpeech();
      }, duration);
    }
  }

  /**
   * Hides the active speech bubble.
   */
  function clearSpeech() {
    if (speechTimeout) {
      clearTimeout(speechTimeout);
      speechTimeout = null;
    }

    resolveElements();
    if (speechElement) {
      speechElement.classList.remove('active', 'fade-in');
      speechElement.classList.add('hidden');
      speechElement.textContent = '';
    }
  }

  /**
   * Picks a random item from an array pool or executes it if it is a function.
   * @param {Array|function} pool
   * @param {*} [param] - Optional parameter to pass if the item is a function
   * @returns {string}
   */
  function getRandomMessage(pool, param) {
    if (!Array.isArray(pool) || pool.length === 0) {
      return '';
    }
    const idx = Math.floor(Math.random() * pool.length);
    const item = pool[idx];
    if (typeof item === 'function') {
      return item(param);
    }
    return String(item);
  }

  /**
   * Main reaction dispatcher. Picks expression and dialogue based on game events.
   *
   * @param {string} event - Event name:
   *   'correct', 'wrong', 'streak', 'levelUp', 'sessionStart', 'sessionEnd',
   *   'welcome', 'encouragement', 'thinking', 'hint', 'dailyChallenge', 'timeout'
   * @param {Object} [data] - Event metadata (e.g. { streak: 5 }, { accuracy: 0.95 }, { hint: '...' })
   */
  function react(event, data = {}) {
    let targetExpr = EXPRESSIONS.idle;
    let message = '';

    switch (event) {
      case 'correct': {
        // Alternates between happy and excited
        targetExpr = Math.random() < 0.35 ? EXPRESSIONS.excited : EXPRESSIONS.happy;
        message = getRandomMessage(MESSAGES.correct);
        break;
      }

      case 'wrong': {
        targetExpr = EXPRESSIONS.encouraging;
        if (data && data.hint) {
          message = data.hint;
        } else {
          message = getRandomMessage(MESSAGES.wrong);
        }
        break;
      }

      case 'timeout': {
        targetExpr = EXPRESSIONS.encouraging;
        message = data && data.hint ? data.hint : "Time's up! Don't worry, practice makes perfect! ⭐";
        break;
      }

      case 'streak': {
        const streakCount = typeof data === 'number' ? data : (data && data.streak) || 3;
        targetExpr = streakCount >= 5 ? EXPRESSIONS.celebrating : EXPRESSIONS.excited;
        message = getRandomMessage(MESSAGES.streak, streakCount);
        break;
      }

      case 'levelUp': {
        targetExpr = EXPRESSIONS.celebrating;
        message = getRandomMessage(MESSAGES.levelUp);
        break;
      }

      case 'sessionStart': {
        targetExpr = EXPRESSIONS.happy;
        message = getRandomMessage(MESSAGES.sessionStart);
        break;
      }

      case 'sessionEnd': {
        const accuracy = typeof data === 'number' ? data : (data && data.accuracy) || 0;
        targetExpr =
          accuracy >= 0.9
            ? EXPRESSIONS.celebrating
            : accuracy >= 0.7
            ? EXPRESSIONS.happy
            : EXPRESSIONS.encouraging;
        message = getRandomMessage(MESSAGES.sessionEnd, accuracy);
        break;
      }

      case 'welcome': {
        targetExpr = EXPRESSIONS.happy;
        message = getRandomMessage(MESSAGES.welcome);
        break;
      }

      case 'encouragement': {
        targetExpr = EXPRESSIONS.encouraging;
        message = getRandomMessage(MESSAGES.encouragement);
        break;
      }

      case 'thinking': {
        targetExpr = EXPRESSIONS.thinking;
        message = getRandomMessage(MESSAGES.thinking);
        break;
      }

      case 'hint': {
        targetExpr = EXPRESSIONS.encouraging;
        if (data && data.hint) {
          message = data.hint;
        } else if (window.Adaptive && typeof window.Adaptive.getHint === 'function' && data.a && data.b) {
          message = window.Adaptive.getHint(data.a, data.b);
        } else {
          message = "Think about groups! You can break it down step by step! 💡";
        }
        break;
      }

      case 'dailyChallenge': {
        targetExpr = EXPRESSIONS.excited;
        message = getRandomMessage(MESSAGES.dailyChallenge);
        break;
      }

      case 'idle':
      default: {
        targetExpr = EXPRESSIONS.idle;
        message = '';
        break;
      }
    }

    setExpression(targetExpr);

    if (message) {
      // Adjust duration: longer for hints/explanations
      const duration = message.length > 50 ? 4500 : 3200;
      say(message, duration);
    }
  }

  /**
   * Resets Stella to idle state and clears speech.
   */
  function idle() {
    clearSpeech();
    setExpression(EXPRESSIONS.idle);
  }

  /**
   * Initializes mascot elements and injects default idle avatar.
   * @param {HTMLElement|string} [mascotEl] - Mascot container element or selector
   * @param {HTMLElement|string} [speechEl] - Speech bubble element or selector
   */
  function init(mascotEl, speechEl) {
    if (typeof mascotEl === 'string' && document.querySelector) {
      mascotContainer = document.querySelector(mascotEl);
    } else if (typeof HTMLElement !== 'undefined' && mascotEl instanceof HTMLElement) {
      mascotContainer = mascotEl;
    } else if (mascotEl && typeof mascotEl === 'object') {
      mascotContainer = mascotEl;
    } else if (document.getElementById) {
      mascotContainer = document.getElementById('mascot-container');
    }

    if (typeof speechEl === 'string' && document.querySelector) {
      speechElement = document.querySelector(speechEl);
    } else if (typeof HTMLElement !== 'undefined' && speechEl instanceof HTMLElement) {
      speechElement = speechEl;
    } else if (speechEl && typeof speechEl === 'object') {
      speechElement = speechEl;
    } else if (document.getElementById) {
      speechElement = document.getElementById('mascot-speech');
    }

    // Set initial idle expression
    setExpression(EXPRESSIONS.idle);

    // Interactive tap/click response
    if (mascotContainer) {
      mascotContainer.style.cursor = 'pointer';
      mascotContainer.setAttribute('tabindex', '0');
      mascotContainer.setAttribute('role', 'button');
      mascotContainer.setAttribute('aria-label', 'Stella the Mascot');

      const onMascotClick = (e) => {
        e.preventDefault();
        react('encouragement');
      };

      mascotContainer.removeEventListener('click', onMascotClick);
      mascotContainer.addEventListener('click', onMascotClick);
    }
  }

  return {
    EXPRESSIONS,
    MESSAGES,
    AVATARS,
    setExpression,
    say,
    clearSpeech,
    react,
    getRandomMessage,
    idle,
    init,
  };
})();

// Attach to global window
window.Mascot = Mascot;
