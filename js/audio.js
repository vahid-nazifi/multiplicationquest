/**
 * Multiplication Quest - GameAudio Module
 * Complete Web Audio API sound engine with 100% synthesized audio.
 * Zero external audio files: synthesizes chords, fanfares, glissandos, ticks,
 * streak celebrations, and a gentle looping 4-bar background melody.
 */
const GameAudio = (() => {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;

  let isMasterEnabled = true;
  let isMusicActive = false;
  let isTickActive = false;
  let isSfxActive = true;

  let tickTimerId = null;
  let isTickFast = false;

  let musicTimerId = null;
  let musicNodes = [];

  /**
   * Helper to retrieve GameStorage safely.
   */
  const getStorage = () => {
    return window.GameStorage || (typeof GameStorage !== 'undefined' ? GameStorage : null);
  };

  /**
   * Lazily initializes and connects the AudioContext and gain bus graph.
   */
  const getCtx = () => {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return null;
      }
      try {
        ctx = new AudioCtx();

        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
        masterGain.connect(ctx.destination);

        sfxGain = ctx.createGain();
        sfxGain.gain.setValueAtTime(0.7, ctx.currentTime);
        sfxGain.connect(masterGain);

        musicGain = ctx.createGain();
        musicGain.gain.setValueAtTime(0.18, ctx.currentTime);
        musicGain.connect(masterGain);

        // Sync initial state from GameStorage if present
        const storage = getStorage();
        if (storage) {
          const soundSetting = storage.get('settings.soundEnabled');
          if (typeof soundSetting === 'boolean') {
            isMasterEnabled = soundSetting;
          }
          const musicSetting = storage.get('settings.musicEnabled');
          if (typeof musicSetting === 'boolean') {
            isMusicActive = musicSetting;
          }
          const tickSetting = storage.get('settings.timerTickEnabled');
          if (typeof tickSetting === 'boolean') {
            isTickActive = tickSetting;
          }
        }
      } catch (e) {
        console.warn('[GameAudio] AudioContext creation failed:', e);
        return null;
      }
    }

    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return ctx;
  };

  /**
   * Creates an auxiliary gain node connected to a parent bus.
   */
  const createGain = (volume = 1.0, parentBus = null) => {
    const context = getCtx();
    if (!context) return null;
    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(volume, context.currentTime);
    gainNode.connect(parentBus || sfxGain || masterGain || context.destination);
    return gainNode;
  };

  /**
   * Plays a synthesized tone using an ADSR volume envelope.
   * @param {number} frequency - Frequency in Hertz
   * @param {number} duration - Total note duration in seconds
   * @param {string} [type='sine'] - Oscillator type ('sine', 'triangle', 'square', 'sawtooth')
   * @param {number} [attack=0.01] - Attack time in seconds
   * @param {number} [decay=0.1] - Decay time in seconds
   * @param {number} [sustain=0.7] - Sustain volume level (0 to 1)
   * @param {number} [release=0.2] - Release time in seconds
   * @param {AudioNode} [targetBus] - Gain node to connect to
   */
  const playTone = (
    frequency,
    duration = 0.3,
    type = 'sine',
    attack = 0.01,
    decay = 0.1,
    sustain = 0.7,
    release = 0.2,
    targetBus = null
  ) => {
    if (!isMasterEnabled || !isSfxActive) return null;
    const context = getCtx();
    if (!context) return null;

    try {
      const startTime = context.currentTime;
      const osc = context.createOscillator();
      const noteGain = context.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, startTime);

      // ADSR Envelope
      noteGain.gain.setValueAtTime(0.0001, startTime);
      // Attack
      noteGain.gain.linearRampToValueAtTime(1.0, startTime + attack);
      // Decay to Sustain
      noteGain.gain.linearRampToValueAtTime(sustain, startTime + attack + decay);

      const releaseStartTime = Math.max(startTime + attack + decay, startTime + duration - release);
      const stopTime = releaseStartTime + release;

      // Release
      noteGain.gain.setValueAtTime(sustain, releaseStartTime);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(noteGain);
      noteGain.connect(targetBus || sfxGain || masterGain);

      osc.start(startTime);
      osc.stop(stopTime + 0.05);

      setTimeout(() => {
        try {
          osc.disconnect();
          noteGain.disconnect();
        } catch (e) {}
      }, (stopTime - startTime + 0.1) * 1000);

      return osc;
    } catch (e) {
      return null;
    }
  };

  /**
   * Schedules a note at a precise AudioContext timeline point.
   */
  const playNote = (freq, time, duration, gainNode, type = 'sine') => {
    const context = getCtx();
    if (!context) return null;

    try {
      const osc = context.createOscillator();
      const env = context.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(0.8, time + 0.02);
      env.gain.setValueAtTime(0.8, time + Math.max(0.03, duration - 0.05));
      env.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(env);
      env.connect(gainNode || musicGain || masterGain);

      osc.start(time);
      osc.stop(time + duration);

      setTimeout(() => {
        try {
          osc.disconnect();
          env.disconnect();
        } catch (e) {}
      }, duration * 1000 + 100);

      return osc;
    } catch (e) {
      return null;
    }
  };

  /**
   * Cheerful C-E-G major chord arpeggio for correct answers.
   * Frequencies: C5 = 523.25, E5 = 659.25, G5 = 783.99
   */
  const playCorrect = () => {
    if (!isMasterEnabled || !isSfxActive) return;
    const context = getCtx();
    if (!context) return;

    const notes = [
      { freq: 523.25, delay: 0.0, dur: 0.3 }, // C5
      { freq: 659.25, delay: 0.1, dur: 0.3 }, // E5
      { freq: 783.99, delay: 0.2, dur: 0.4 }, // G5
    ];

    notes.forEach((n) => {
      setTimeout(() => {
        playTone(n.freq, n.dur, 'triangle', 0.01, 0.08, 0.6, 0.15);
      }, n.delay * 1000);
    });
  };

  /**
   * Gentle descending tone for incorrect answers.
   * Soft and encouraging, non-punitive.
   */
  const playWrong = () => {
    if (!isMasterEnabled || !isSfxActive) return;
    const context = getCtx();
    if (!context) return;

    try {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      osc.type = 'sine';
      // Gentle slide from F4 (349.23 Hz) down to D4 (293.66 Hz)
      osc.frequency.setValueAtTime(349.23, now);
      osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(sfxGain || masterGain);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  };

  /**
   * Exciting fanfare for level-up. Ascending C-E-G-C with simulated shimmer reverb.
   */
  const playLevelUp = () => {
    if (!isMasterEnabled || !isSfxActive) return;
    const context = getCtx();
    if (!context) return;

    const fanfare = [
      { freq: 261.63, delay: 0.0, dur: 0.2 }, // C4
      { freq: 329.63, delay: 0.15, dur: 0.2 }, // E4
      { freq: 392.00, delay: 0.3, dur: 0.25 }, // G4
      { freq: 523.25, delay: 0.48, dur: 0.7 }, // C5
      { freq: 659.25, delay: 0.52, dur: 0.7 }, // E5 harmonic shimmer
      { freq: 1046.5, delay: 0.58, dur: 0.9 }, // C6 bell accent
    ];

    fanfare.forEach((n) => {
      setTimeout(() => {
        playTone(n.freq, n.dur, 'triangle', 0.01, 0.1, 0.7, 0.3);
      }, n.delay * 1000);
    });
  };

  /**
   * Rapid sparkle glissando for unlocking an achievement.
   */
  const playAchievement = () => {
    if (!isMasterEnabled || !isSfxActive) return;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        playTone(freq, 0.18, 'sine', 0.005, 0.04, 0.4, 0.1);
      }, idx * 45);
    });
  };

  /**
   * Very short soft UI click.
   */
  const playClick = () => {
    if (!isMasterEnabled || !isSfxActive) return;
    const context = getCtx();
    if (!context) return;

    try {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.02);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(gain);
      gain.connect(sfxGain || masterGain);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch (e) {}
  };

  /**
   * High twinkle sound for collecting a star.
   */
  const playStarEarned = () => {
    if (!isMasterEnabled || !isSfxActive) return;
    playTone(987.77, 0.15, 'sine', 0.005, 0.03, 0.5, 0.1); // B5
    setTimeout(() => {
      playTone(1318.51, 0.25, 'sine', 0.005, 0.03, 0.5, 0.15); // E6
    }, 80);
  };

  /**
   * Low distinct warning tick for the final 3 seconds.
   */
  const playCountdown = () => {
    if (!isMasterEnabled || !isSfxActive) return;
    playTone(440.0, 0.12, 'square', 0.005, 0.02, 0.4, 0.08);
  };

  /**
   * Pleasant resolving chime sequence when a session completes.
   */
  const playGameOver = () => {
    if (!isMasterEnabled || !isSfxActive) return;
    const sequence = [
      { freq: 392.00, delay: 0 },    // G4
      { freq: 440.00, delay: 150 },  // A4
      { freq: 349.23, delay: 300 },  // F4
      { freq: 523.25, delay: 450 },  // C5
    ];
    sequence.forEach((s) => {
      setTimeout(() => {
        playTone(s.freq, 0.35, 'triangle', 0.01, 0.08, 0.6, 0.2);
      }, s.delay);
    });
  };

  /**
   * Escalating celebratory sound based on consecutive correct streak.
   * @param {number} streakCount
   */
  const playStreak = (streakCount) => {
    if (!isMasterEnabled || !isSfxActive) return;
    const streak = typeof streakCount === 'number' ? streakCount : 1;

    if (streak < 3) {
      playCorrect();
    } else if (streak < 5) {
      // 3-note ascending
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.2, 'triangle', 0.01, 0.05, 0.6, 0.1), i * 70);
      });
    } else if (streak < 10) {
      // 5-note energetic riff
      const notes = [523.25, 659.25, 783.99, 880.00, 1046.50];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.22, 'square', 0.01, 0.04, 0.5, 0.12), i * 60);
      });
    } else {
      // 10+ streak: powerful celebratory power-up fanfare
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((f, i) => {
        setTimeout(() => playTone(f, 0.28, 'triangle', 0.005, 0.05, 0.7, 0.15), i * 50);
      });
    }
  };

  /**
   * Plays a single mechanical clock tick.
   */
  const emitSingleTick = () => {
    if (!isMasterEnabled || !isTickActive) return;
    const context = getCtx();
    if (!context) return;

    try {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isTickFast ? 1000 : 700, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.015);

      gain.gain.setValueAtTime(isTickFast ? 0.25 : 0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

      osc.connect(gain);
      gain.connect(sfxGain || masterGain);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {}
  };

  /**
   * Starts rhythmic timer ticking.
   */
  const startTicking = () => {
    stopTicking();
    if (!isMasterEnabled || !isTickActive) return;

    const interval = isTickFast ? 500 : 1000;
    emitSingleTick();
    tickTimerId = setInterval(() => {
      emitSingleTick();
    }, interval);
  };

  /**
   * Stops rhythmic timer ticking.
   */
  const stopTicking = () => {
    if (tickTimerId !== null) {
      clearInterval(tickTimerId);
      tickTimerId = null;
    }
    isTickFast = false;
  };

  /**
   * Speeds up timer ticking (e.g., during final 5 seconds).
   * @param {boolean} fast
   */
  const setTickSpeed = (fast) => {
    const shouldBeFast = Boolean(fast);
    if (isTickFast === shouldBeFast) return;
    isTickFast = shouldBeFast;
    if (tickTimerId !== null) {
      startTicking();
    }
  };

  /**
   * 4-bar looping melody in C major.
   * Notes:
   * Bar 1: C4 E4 G4 E4
   * Bar 2: F4 A4 G4 E4
   * Bar 3: D4 F4 E4 C4
   * Bar 4: G4 G4 E4 C4
   */
  const MELODY_SEQUENCE = [
    // Bar 1
    { freq: 261.63, dur: 0.45 }, { freq: 329.63, dur: 0.45 },
    { freq: 392.00, dur: 0.45 }, { freq: 329.63, dur: 0.45 },
    // Bar 2
    { freq: 349.23, dur: 0.45 }, { freq: 440.00, dur: 0.45 },
    { freq: 392.00, dur: 0.45 }, { freq: 329.63, dur: 0.45 },
    // Bar 3
    { freq: 293.66, dur: 0.45 }, { freq: 349.23, dur: 0.45 },
    { freq: 329.63, dur: 0.45 }, { freq: 261.63, dur: 0.45 },
    // Bar 4
    { freq: 392.00, dur: 0.45 }, { freq: 392.00, dur: 0.45 },
    { freq: 329.63, dur: 0.45 }, { freq: 261.63, dur: 0.45 },
  ];

  const NOTE_STEP = 0.5; // 0.5s per note = 8s for 16 notes (120 BPM)

  /**
   * Plays a single iteration of the 4-bar melody and schedules the next loop.
   */
  const scheduleMelodyLoop = () => {
    if (!isMasterEnabled || !isMusicActive) {
      stopMusic();
      return;
    }

    const context = getCtx();
    if (!context) return;

    const startTime = context.currentTime + 0.05;
    musicNodes = [];

    MELODY_SEQUENCE.forEach((item, index) => {
      const noteTime = startTime + index * NOTE_STEP;
      const osc = playNote(item.freq, noteTime, item.dur, musicGain, 'sine');
      if (osc) {
        musicNodes.push(osc);
      }
    });

    const loopDurationMs = MELODY_SEQUENCE.length * NOTE_STEP * 1000;
    musicTimerId = setTimeout(() => {
      scheduleMelodyLoop();
    }, loopDurationMs);
  };

  /**
   * Starts looping the gentle 4-bar background music.
   */
  const startMusic = () => {
    stopMusic();
    isMusicActive = true;
    const storage = getStorage();
    if (storage) {
      storage.set('settings.musicEnabled', true);
    }
    scheduleMelodyLoop();
  };

  /**
   * Stops the looping background music.
   */
  const stopMusic = () => {
    isMusicActive = false;
    if (musicTimerId !== null) {
      clearTimeout(musicTimerId);
      musicTimerId = null;
    }
    musicNodes.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {}
    });
    musicNodes = [];
  };

  /**
   * Resumes the AudioContext after user gesture.
   */
  const resume = () => {
    const context = getCtx();
    if (context && context.state === 'suspended') {
      return context.resume();
    }
    return Promise.resolve();
  };

  /**
   * Warms up AudioContext on initial user gesture.
   */
  const init = () => {
    resume();
  };

  /**
   * Master sound enable toggle.
   */
  const setEnabled = (enabled) => {
    isMasterEnabled = Boolean(enabled);
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(isMasterEnabled ? 0.8 : 0, ctx.currentTime);
    }
    const storage = getStorage();
    if (storage) {
      storage.set('settings.soundEnabled', isMasterEnabled);
    }
    if (!isMasterEnabled) {
      stopTicking();
      if (musicTimerId !== null) {
        clearTimeout(musicTimerId);
        musicTimerId = null;
      }
    }
  };

  /**
   * Music enable toggle.
   */
  const setMusicEnabled = (enabled) => {
    const shouldEnable = Boolean(enabled);
    const storage = getStorage();
    if (storage) {
      storage.set('settings.musicEnabled', shouldEnable);
    }
    if (shouldEnable) {
      startMusic();
    } else {
      stopMusic();
    }
  };

  /**
   * Timer tick enable toggle.
   */
  const setTickEnabled = (enabled) => {
    isTickActive = Boolean(enabled);
    const storage = getStorage();
    if (storage) {
      storage.set('settings.timerTickEnabled', isTickActive);
    }
    if (!isTickActive) {
      stopTicking();
    }
  };

  /**
   * Sound effects enable toggle.
   */
  const setSfxEnabled = (enabled) => {
    isSfxActive = Boolean(enabled);
  };

  const isEnabled = () => isMasterEnabled;
  const isMusicEnabled = () => isMusicActive;

  return {
    init,
    playCorrect,
    playWrong,
    playLevelUp,
    playAchievement,
    playClick,
    playStarEarned,
    playCountdown,
    playGameOver,
    playStreak,
    startTicking,
    stopTicking,
    setTickSpeed,
    startMusic,
    stopMusic,
    setEnabled,
    setMusicEnabled,
    setTickEnabled,
    setSfxEnabled,
    isEnabled,
    isMusicEnabled,
    resume,
  };
})();

// Attach to global window
window.GameAudio = GameAudio;
