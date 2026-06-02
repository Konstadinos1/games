'use strict';

const GAME_STATE = {
  BOOT: 'boot', MENU: 'menu', PLAYING: 'playing',
  PAUSED: 'paused', GAME_OVER: 'game_over', AR: 'ar',
};

class Game {
  constructor() {
    this.canvas  = document.getElementById('gameCanvas');
    this.ctx     = this.canvas.getContext('2d');
    this.state   = GAME_STATE.BOOT;
    this.time    = 0;
    this._lastTs = 0;

    // Game session state
    this.score        = 0;
    this.streak       = 0;
    this.multiplier   = 1;
    this.distance     = 0;
    this.gameSpeed    = CONFIG.SPEED.INITIAL;
    this.chickens     = [];
    this.obstacles    = [];
    this.coinsEarned  = 0;
    this.chickensTotal= 0;
    this.epicsTotal   = 0;
    this.legendariesTotal = 0;
    this.noObstacleHit = true;
    this.runStartTime = 0;
    this.deathCause   = 'obstacle';

    // Bonus multiplier (from ads)
    this.bonusMultiplier     = 1;
    this.bonusMultiplierTimer = 0;

    // Spawning
    this._chickenTimer  = 0;
    this._obstacleTimer = 0;
    this._nextChickenIn = 0;
    this._nextObstacleIn = 0;

    this.player     = null;
    this.background = null;
    this.particles  = null;
    this.hud        = null;

    this.isPiriZone = false;
    this._piriZoneCoins = 0;

    // Revive state
    this._canRevive = true;
    this._reviveOffered = false;

    this._resize();
    this._bindInput();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const scale = Math.min(window.innerWidth / CONFIG.CANVAS_WIDTH, window.innerHeight / CONFIG.CANVAS_HEIGHT);
    this.canvas.style.width  = (CONFIG.CANVAS_WIDTH * scale) + 'px';
    this.canvas.style.height = (CONFIG.CANVAS_HEIGHT * scale) + 'px';
    this.canvas.width  = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;
  }

  _bindInput() {
    const onTap = (e) => {
      e.preventDefault();
      Audio.init();
      if (this.state === GAME_STATE.PLAYING) {
        this.player.jump();
      }
    };

    const onSwipeDown = () => {
      if (this.state === GAME_STATE.PLAYING) this.player.slide();
    };

    let touchStartY = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      onTap(e);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (dy > 50) onSwipeDown();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      Audio.init();
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (this.state === GAME_STATE.PLAYING) this.player.jump();
      }
      if (e.code === 'ArrowDown' || e.code === 'ShiftLeft') {
        if (this.state === GAME_STATE.PLAYING) this.player.slide();
      }
      if (e.code === 'Escape') this.togglePause();
      if (e.code === 'Enter' && this.state === GAME_STATE.MENU) this.startRun();
    });
  }

  // ── Lifecycle ──

  boot() {
    this.player     = new Player(this);
    this.background = new Background();
    this.particles  = new ParticleSystem();
    this.hud        = new HUD(this);

    Geofencing.onPiriZoneEnter = (loc) => {
      this.isPiriZone = true;
      this.particles.spawn(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 'piri_zone', 20);
      Screens.showToast(`🌶️ PIRI ZONE! 2x Rewards at ${loc.name}!`, 4000, 'piri');
    };
    Geofencing.onPiriZoneExit = () => {
      this.isPiriZone = false;
      Screens.showToast('Left Piri Zone', 2000);
    };

    Geofencing.start();
    Monetization.initStore();
    FirebaseBackend.init().then(ready => {
      if (ready) FirebaseBackend.signInAnonymously();
    });
    Analytics.sessionStart();

    setTimeout(() => {
      this.state = GAME_STATE.MENU;
      Screens.show('menu');
    }, 1800);

    this._loop(0);
  }

  startRun() {
    this.score = 0;
    this.streak = 0;
    this.multiplier = 1;
    this.distance = 0;
    this.gameSpeed = CONFIG.SPEED.INITIAL;
    this.chickens = [];
    this.obstacles = [];
    this.coinsEarned = 0;
    this.chickensTotal = 0;
    this.epicsTotal = 0;
    this.legendariesTotal = 0;
    this.noObstacleHit = true;
    this.runStartTime = Date.now();
    this.bonusMultiplier = 1;
    this.bonusMultiplierTimer = 0;
    this._canRevive = true;
    this._reviveOffered = false;

    this._nextChickenIn  = Utils.randomBetween(CONFIG.SPAWN.CHICKEN_MIN, CONFIG.SPAWN.CHICKEN_MAX);
    this._nextObstacleIn = Utils.randomBetween(CONFIG.SPAWN.OBSTACLE_MIN, CONFIG.SPAWN.OBSTACLE_MAX);
    this._chickenTimer = 0;
    this._obstacleTimer = 0;

    this.player = new Player(this);
    this.player.setCharacter(Progression.getActiveChar());
    this.particles.clear();

    this.state = GAME_STATE.PLAYING;
    Screens.show('game');
    Audio.startBGM();
    Social.startRecording();
    Analytics.runStart(Progression.activeChar, this.isPiriZone);
  }

  togglePause() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
      Audio.stopBGM();
      Screens.show('pause');
    } else if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.PLAYING;
      Audio.startBGM();
      Screens.show('game');
    }
  }

  endRun(cause = 'obstacle') {
    this.deathCause = cause;
    Audio.stopBGM();
    Audio.play('game_over');
    Social.stopRecording();

    const duration = Date.now() - this.runStartTime;
    const finalScore = this.isPiriZone ? Math.floor(this.score * 1.5) : this.score;

    const { xpGained, levelUps, coinsEarned } = Progression.recordRun(
      finalScore, this.coinsEarned, this.streak,
      this.chickensTotal, this.epicsTotal, this.legendariesTotal
    );

    Missions.onRunEnd({
      score: finalScore, chickens: this.chickensTotal, streak: this.streak,
      epics: this.epicsTotal, legendaries: this.legendariesTotal,
      runs: 1, coinsEarned: this.coinsEarned, noObstacleHit: this.noObstacleHit
    });

    Analytics.runEnd({
      score: finalScore, duration, chickens: this.chickensTotal,
      streak: this.streak, deathCause: cause,
      isPiriZone: this.isPiriZone, distance: Math.floor(this.distance)
    });

    if (levelUps.length > 0) {
      levelUps.forEach(lvl => { this.hud.showLevelUp(lvl); Analytics.characterUnlocked('', lvl); });
    }

    // Sync to Firebase cloud save
    FirebaseBackend.syncAfterRun();

    // Show interstitial ad
    if (Monetization.shouldShowInterstitial()) {
      Monetization.showInterstitial().then(() => {
        this._showResultsScreen(finalScore, xpGained, coinsEarned, levelUps);
      });
    } else {
      this._showResultsScreen(finalScore, xpGained, coinsEarned, levelUps);
    }
  }

  _showResultsScreen(score, xpGained, coinsEarned, levelUps) {
    this.state = GAME_STATE.GAME_OVER;
    Screens.show('results', {
      score, xpGained, coinsEarned, levelUps,
      streak: this.streak, chickens: this.chickensTotal,
      epics: this.epicsTotal, legendaries: this.legendariesTotal,
      isPiriZone: this.isPiriZone,
      highScore: Progression.highScore,
      canRevive: this._canRevive && !this._reviveOffered && Monetization.canShowRewardedAd(),
    });
  }

  async offerRevive() {
    this._reviveOffered = true;
    const result = await Monetization.showRewardedAd('revive');
    if (result.watched) {
      this._canRevive = false;
      this.player.lives = 1;
      this.player.isInvincible = true;
      this.player._invincibleTimer = 3000;
      this.state = GAME_STATE.PLAYING;
      Audio.startBGM();
      Screens.show('game');
    }
    return result.watched;
  }

  spawnParticles(x, y, type, count = 1) {
    this.particles.spawn(x, y, type, count);
  }

  // ── Update ──

  _update(dt) {
    this.time += dt;

    if (this.state === GAME_STATE.BOOT || this.state === GAME_STATE.MENU ||
        this.state === GAME_STATE.GAME_OVER) {
      // Idle background animation
      this.background.update(dt, 3);
      this.particles.update(dt);
      return;
    }

    if (this.state === GAME_STATE.PAUSED) return;

    if (this.state !== GAME_STATE.PLAYING) return;

    // Speed ramp
    this.gameSpeed = Math.min(
      CONFIG.SPEED.MAX,
      CONFIG.SPEED.INITIAL + (Date.now() - this.runStartTime) / 1000 * CONFIG.SPEED.INCREMENT_PER_SECOND
    );

    // Distance
    this.distance += this.gameSpeed * dt * 0.01;

    // Bonus multiplier countdown
    if (this.bonusMultiplierTimer > 0) {
      this.bonusMultiplierTimer -= dt;
      if (this.bonusMultiplierTimer <= 0) {
        this.bonusMultiplier = 1;
        Screens.showToast('Speed boost ended', 1500);
      }
    }

    // Background
    this.background.update(dt, this.gameSpeed, this.isPiriZone);

    // Player
    this.player.update(dt);

    // Spawn
    this._chickenTimer += dt;
    if (this._chickenTimer >= this._nextChickenIn) {
      this.chickens.push(Chicken.spawnRandom(this));
      this._chickenTimer = 0;
      this._nextChickenIn = Utils.randomBetween(CONFIG.SPAWN.CHICKEN_MIN, CONFIG.SPAWN.CHICKEN_MAX);
      // Speed modifier on spawn rate
      this._nextChickenIn /= Math.max(1, this.gameSpeed / CONFIG.SPEED.INITIAL * 0.7);
    }

    this._obstacleTimer += dt;
    if (this._obstacleTimer >= this._nextObstacleIn) {
      this.obstacles.push(Obstacle.spawnRandom(this));
      this._obstacleTimer = 0;
      this._nextObstacleIn = Utils.randomBetween(CONFIG.SPAWN.OBSTACLE_MIN, CONFIG.SPAWN.OBSTACLE_MAX);
      this._nextObstacleIn /= Math.max(1, this.gameSpeed / CONFIG.SPEED.INITIAL * 0.8);
    }

    // Update entities
    this.chickens.forEach(c => c.update(dt, this.gameSpeed));
    this.obstacles.forEach(o => o.update(dt, this.gameSpeed));

    // Collision detection
    this._checkCollisions();

    // Cull
    this.chickens  = this.chickens.filter(c => c.active);
    this.obstacles = this.obstacles.filter(o => o.active);

    // Particles
    this.particles.update(dt);
    this.hud.update(dt);

    // Replay recording
    Social.recordFrame({ x: this.player.x, y: this.player.y, score: this.score, streak: this.streak });

    // Check game over
    if (this.player.lives <= 0) {
      this.endRun('out_of_lives');
    }
  }

  _checkCollisions() {
    const playerHB = this.player.getHitbox();

    // Chicken collisions
    this.chickens.forEach(c => {
      if (c.caught) return;
      const chHB = c.getHitbox();
      if (Utils.rectOverlap(playerHB, chHB)) {
        this._catchChicken(c);
      } else if (c.x < this.player.x - 60 && !c.caught) {
        // Missed chicken breaks streak
        if (c.type !== 'COMMON' || Math.random() < 0.3) {
          // Only break streak sometimes for common chickens
        }
        c.active = false;
      }
    });

    // Obstacle collisions
    this.obstacles.forEach(o => {
      if (!o.active) return;
      const obHB = o.getHitbox();

      // Check if player can pass with current state
      const isSliding = this.player.state === 'sliding';
      const isJumping = !this.player.onGround;
      const oCfg = o.cfg;

      const overlaps = Utils.rectOverlap(playerHB, obHB);
      if (!overlaps) return;

      // Can slide under?
      if (isSliding && oCfg.canSlide) return;
      // Can jump over?
      if (isJumping && oCfg.canJump && this.player.y < o.y - 20) return;

      const hitRegistered = this.player.hit();
      if (hitRegistered) {
        this.noObstacleHit = false;
        this.streak = 0;
        this.multiplier = 1;
        this.hud.showStreakLabel('');
        o.active = false;
        Analytics.obstacleHit(o.type);
      }
    });
  }

  _catchChicken(chicken) {
    chicken.caught = true;
    chicken.active = false;
    this.streak++;
    this.chickensTotal++;

    if (chicken.type === 'EPIC')       this.epicsTotal++;
    if (chicken.type === 'LEGENDARY')  this.legendariesTotal++;

    // Multiplier
    const prevMultiplier = this.multiplier;
    const streakLevel = CONFIG.STREAK_LEVELS.slice().reverse().find(s => this.streak >= s.at);
    this.multiplier = streakLevel ? streakLevel.multiplier : 1;

    const totalMultiplier = this.multiplier * this.bonusMultiplier * (this.isPiriZone ? 2 : 1);
    const pts = chicken.cfg.score * totalMultiplier;
    this.score += pts;

    const coinAmt = chicken.cfg.coins * (this.isPiriZone ? 2 : 1);
    this.coinsEarned += coinAmt;

    // Particles
    const popType = `catch_${chicken.type.toLowerCase()}`;
    this.particles.spawn(chicken.x, chicken.y - 20, popType, 1);
    this.particles.spawn(chicken.x, chicken.y, 'coin', 3);
    if (chicken.type === 'LEGENDARY') this.particles.spawn(chicken.x, chicken.y, 'star', 8);
    if (chicken.type === 'EPIC') this.particles.spawn(chicken.x, chicken.y, 'star', 5);

    // Audio
    const sounds = { COMMON: 'catch_common', RARE: 'catch_rare', EPIC: 'catch_epic', LEGENDARY: 'catch_legendary' };
    Audio.play(sounds[chicken.type]);

    // Streak milestone
    if (this.multiplier > prevMultiplier && streakLevel && streakLevel.label) {
      this.hud.showStreakLabel(streakLevel.label);
      this.hud.triggerComboFlash();
      this.particles.spawn(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 'streak', 15);
      Audio.play('streak_up');
      Analytics.streakReached(this.streak, this.multiplier);
      Utils.vibrate([30, 20, 30]);
    }

    Analytics.chickenCaught(chicken.type, this.streak);
    this.hud.showCoinPop();

    // Celebrate for legendary
    if (chicken.type === 'LEGENDARY') this.player.celebrate(1200);
  }

  // ── Render ──

  _render() {
    const ctx = this.ctx;
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;

    ctx.clearRect(0, 0, W, H);
    this.background.draw(ctx, this.isPiriZone);

    if (this.state === GAME_STATE.PLAYING || this.state === GAME_STATE.PAUSED ||
        this.state === GAME_STATE.GAME_OVER) {

      this.obstacles.forEach(o => o.draw(ctx, this.time));
      this.chickens.forEach(c => c.draw(ctx, this.time));
      this.player.draw(ctx, this.time);
      this.particles.draw(ctx);

      if (this.state === GAME_STATE.PLAYING) {
        this.hud.draw(ctx, {
          score: this.score, streak: this.streak, multiplier: this.multiplier,
          lives: this.player.lives, chickens: this.chickensTotal,
          isPiriZone: this.isPiriZone, distance: this.distance,
          coins: this.coinsEarned,
        }, this.time);
      }
    }

    // Boot splash
    if (this.state === GAME_STATE.BOOT) {
      this._drawBootSplash(ctx, W, H);
    }
  }

  _drawBootSplash(ctx, W, H) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    // Logo
    ctx.fillStyle = CONFIG.COLORS.PRIMARY;
    ctx.fillRect(W / 2 - 100, H / 2 - 120, 200, 120);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('bellepros', W / 2, H / 2 - 60);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px Arial';
    ctx.fillText('PIRI RUSH', W / 2, H / 2 - 30);

    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.fillText('Loading...', W / 2, H / 2 + 20);

    const dots = '.'.repeat(Math.floor(this.time / 300) % 4);
    ctx.fillText(dots, W / 2, H / 2 + 44);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px Arial';
    ctx.fillText('Proudly Montreal 🍁', W / 2, H - 30);
  }

  // ── Main loop ──

  _loop(ts) {
    const dt = Math.min(ts - this._lastTs, 50); // cap at 50ms
    this._lastTs = ts;
    this._update(dt);
    this._render();
    requestAnimationFrame(t => this._loop(t));
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
  game.boot();
});
