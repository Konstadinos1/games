'use strict';

class ARSystem {
  constructor() {
    this.active = false;
    this.videoEl = null;
    this.overlayCanvas = null;
    this.overlayCtx = null;
    this.arChickens = [];
    this._spawnTimer = 0;
    this._deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
    this._tapped = false;
    this._score = 0;
    this._caught = 0;
    this.onCatch = null;
    this.onEnd = null;
    this._rafId = null;
    this._stream = null;
  }

  async start(videoEl, overlayCanvas) {
    this.videoEl = videoEl;
    this.overlayCanvas = overlayCanvas;
    this.overlayCtx = overlayCanvas.getContext('2d');
    this.arChickens = [];
    this._score = 0;
    this._caught = 0;

    // Request camera
    try {
      this._stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      this.videoEl.srcObject = this._stream;
      await this.videoEl.play();
    } catch (e) {
      console.warn('Camera access denied:', e);
      return false;
    }

    // Device orientation for chicken placement depth
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', this._onOrientation.bind(this));
    }

    this.active = true;
    this._spawnTimer = 2000;
    Analytics.arSessionStart();
    this._loop();
    return true;
  }

  stop() {
    this.active = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._stream) {
      this._stream.getTracks().forEach(t => t.stop());
      this._stream = null;
    }
    if (this.videoEl) { this.videoEl.srcObject = null; }
    window.removeEventListener('deviceorientation', this._onOrientation.bind(this));
  }

  _onOrientation(e) {
    this._deviceOrientation = { alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 };
  }

  _loop(timestamp = 0) {
    if (!this.active) return;
    this._rafId = requestAnimationFrame(t => this._loop(t));
    this._update(16); // Approximate dt
    this._render(timestamp);
  }

  _update(dt) {
    this._spawnTimer -= dt;
    if (this._spawnTimer <= 0) {
      this._spawnARChicken();
      const inPiriZone = Geofencing.inPiriZone;
      this._spawnTimer = inPiriZone
        ? Utils.randomBetween(1500, 2500)
        : Utils.randomBetween(2500, 4000);
    }

    const W = this.overlayCanvas.width;
    const H = this.overlayCanvas.height;

    this.arChickens = this.arChickens.filter(c => {
      c.life -= dt;
      c.y -= c.vy * (dt / 16);
      c.x += c.vx * (dt / 16);
      c.scale = 1 + 0.08 * Math.sin(Date.now() * 0.003 + c.phase);

      // Bounce off edges
      if (c.x < 40 || c.x > W - 40) c.vx *= -1;
      if (c.x < 0) c.x = 0;
      if (c.x > W) c.x = W;
      if (c.y < 60 || c.y > H - 60) c.vy *= -1;

      return c.life > 0 && !c.caught;
    });
  }

  _spawnARChicken() {
    const W = this.overlayCanvas.width;
    const H = this.overlayCanvas.height;
    const isInPiriZone = Geofencing.inPiriZone;

    // Special AR chickens near Bellepros
    const typeKey = isInPiriZone
      ? Utils.weightedRandom([
          { key: 'EPIC',       weight: 40 },
          { key: 'LEGENDARY',  weight: 30 },
          { key: 'RARE',       weight: 20 },
          { key: 'COMMON',     weight: 10 },
        ]).key
      : Utils.weightedRandom([
          { key: 'COMMON',     weight: 55 },
          { key: 'RARE',       weight: 30 },
          { key: 'EPIC',       weight: 12 },
          { key: 'LEGENDARY',  weight: 3  },
        ]).key;

    const cfg = CONFIG.CHICKEN_TYPES[typeKey];
    this.arChickens.push({
      id: Date.now() + Math.random(),
      type: typeKey,
      x: Utils.randomBetween(60, W - 60),
      y: Utils.randomBetween(100, H - 100),
      vx: Utils.randomBetween(-1.5, 1.5),
      vy: Utils.randomBetween(-0.8, 0.8),
      size: cfg.size * 1.8,
      scale: 1,
      phase: Math.random() * Math.PI * 2,
      life: Utils.randomBetween(6000, 12000),
      coins: cfg.coins * (isInPiriZone ? 2 : 1),
      score: cfg.score * (isInPiriZone ? 2 : 1),
      caught: false,
      glowColor: cfg.glowColor,
      hue: cfg.hue,
    });
  }

  tap(tapX, tapY) {
    const HIT_RADIUS = 55;
    let caught = null;

    for (const c of this.arChickens) {
      const dx = tapX - c.x;
      const dy = tapY - c.y;
      if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS + c.size * 0.3) {
        caught = c;
        break;
      }
    }

    if (caught) {
      caught.caught = true;
      this._score += caught.score;
      this._caught++;
      Progression.addCoins(caught.coins);
      Audio.play('ar_catch');
      Utils.vibrate([50]);
      if (this.onCatch) this.onCatch(caught);
    }
  }

  captureScreenshot() {
    // Merge video frame + overlay canvas into a single canvas
    const merged = document.createElement('canvas');
    merged.width = this.overlayCanvas.width;
    merged.height = this.overlayCanvas.height;
    const mCtx = merged.getContext('2d');
    mCtx.drawImage(this.videoEl, 0, 0, merged.width, merged.height);
    mCtx.drawImage(this.overlayCanvas, 0, 0);

    // Add branding overlay
    mCtx.fillStyle = 'rgba(232,25,44,0.85)';
    mCtx.fillRect(0, merged.height - 60, merged.width, 60);
    mCtx.fillStyle = '#FFF';
    mCtx.font = 'bold 20px Arial';
    mCtx.textAlign = 'center';
    mCtx.fillText('Bellepros Piri Rush AR 🍗🔥', merged.width / 2, merged.height - 32);
    mCtx.font = '14px Arial';
    mCtx.fillText(`#BelleprosPiriRush • bellepros.com/game`, merged.width / 2, merged.height - 12);

    return merged;
  }

  _render(timestamp) {
    const ctx = this.overlayCtx;
    const W = this.overlayCanvas.width;
    const H = this.overlayCanvas.height;
    ctx.clearRect(0, 0, W, H);

    // Piri Zone indicator
    if (Geofencing.inPiriZone) {
      ctx.fillStyle = `rgba(232,25,44,${0.08 + 0.04 * Math.sin(timestamp * 0.003)})`;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(232,25,44,0.9)';
      ctx.fillRect(0, 0, W, 44);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🌶️ PIRI ZONE ACTIVE — 2x REWARDS! 🌶️', W / 2, 28);
    }

    // AR Chickens
    this.arChickens.forEach(c => this._drawARChicken(ctx, c, timestamp));

    // HUD
    this._drawARHUD(ctx, W, H, timestamp);

    // Crosshair hint
    this._drawCrosshair(ctx, W / 2, H / 2, timestamp);
  }

  _drawARChicken(ctx, c, t) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(c.scale, c.scale);

    // Glow
    if (c.type !== 'COMMON') {
      const grd = ctx.createRadialGradient(0, 0, c.size * 0.2, 0, 0, c.size * 1.5);
      grd.addColorStop(0, c.glowColor);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, c.size * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow circle
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(4, c.size * 0.6, c.size * 0.5, c.size * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chicken emoji
    ctx.font = `${c.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (c.hue !== null) ctx.filter = `hue-rotate(${c.hue}deg) saturate(2) brightness(1.3)`;
    ctx.fillText('🍗', 0, 0);
    ctx.filter = 'none';

    // Tap hint ring
    const lifeRatio = c.life / 10000;
    if (lifeRatio > 0.7) {
      ctx.strokeStyle = `rgba(255,255,255,${(lifeRatio - 0.7) * 3 * (0.5 + 0.5 * Math.sin(t * 0.01))})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, c.size * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  _drawARHUD(ctx, W, H, t) {
    // Score
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(10, H - 110, 180, 100);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('AR SCORE', 20, H - 90);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(Utils.formatNumber(this._score), 20, H - 55);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`${this._caught} chickens caught`, 20, H - 30);

    // Instructions
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W / 2 - 120, H - 55, 240, 36);
    ctx.fillStyle = '#FFF';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('👆 Tap chickens to catch them!', W / 2, H - 32);
  }

  _drawCrosshair(ctx, x, y, t) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.004);
    ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.3})`;
    ctx.lineWidth = 1;
    const size = 20;
    ctx.beginPath();
    ctx.moveTo(x - size, y); ctx.lineTo(x - 8, y);
    ctx.moveTo(x + 8, y);   ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size); ctx.lineTo(x, y - 8);
    ctx.moveTo(x, y + 8);   ctx.lineTo(x, y + size);
    ctx.stroke();
  }

  getScore() { return { score: this._score, caught: this._caught }; }
}

const AR = new ARSystem();
