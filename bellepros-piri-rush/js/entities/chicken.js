'use strict';

class Chicken {
  constructor(type, x, game) {
    this.type = type;  // 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
    this.cfg = CONFIG.CHICKEN_TYPES[type];
    this.x = x;
    this.game = game;

    // Spawn at random height in "catchable" zone
    this.baseY = Utils.randomBetween(420, 640);
    this.y = this.baseY;
    this.vy = 0;
    this.phase = Math.random() * Math.PI * 2;
    this.amplitude = Utils.randomBetween(20, 55);
    this.frequency = Utils.randomBetween(0.002, 0.005);
    this.size = this.cfg.size;
    this.active = true;
    this.caught = false;

    // AR mode flag
    this.isARChicken = false;
    this.arX = 0; this.arY = 0; // screen coords in AR

    // Trail for epic/legendary
    this.trail = [];
    this.trailTimer = 0;

    // Rotation for legendary
    this.rotation = 0;
  }

  update(dt, gameSpeed) {
    if (this.caught) return;
    this.x -= gameSpeed * (dt / 16) * 0.95;
    this.y = this.baseY + Math.sin(this.game.time * this.frequency + this.phase) * this.amplitude;

    if (this.type === 'LEGENDARY') {
      this.rotation += 0.04;
    }

    // Trail
    if (this.type === 'EPIC' || this.type === 'LEGENDARY') {
      this.trailTimer += dt;
      if (this.trailTimer > 40) {
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        this.trailTimer = 0;
        if (this.trail.length > 8) this.trail.shift();
      }
      this.trail.forEach(p => { p.alpha -= 0.08; });
      this.trail = this.trail.filter(p => p.alpha > 0);
    }

    if (this.x < -80) this.active = false;
  }

  getHitbox() {
    const r = this.size * 0.42;
    return { x: this.x - r, y: this.y - r, w: r * 2, h: r * 2 };
  }

  draw(ctx, t) {
    if (!this.active) return;

    const cfg = this.cfg;
    ctx.save();

    // Trail
    this.trail.forEach((p, i) => {
      ctx.globalAlpha = p.alpha * 0.6;
      ctx.font = `${this.size * 0.7}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍗', p.x, p.y);
    });
    ctx.globalAlpha = 1;

    // Glow
    if (this.type !== 'COMMON') {
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.006 + this.phase);
      const glowR = this.size * (1.3 + 0.2 * pulse);
      const grd = ctx.createRadialGradient(this.x, this.y, this.size * 0.2, this.x, this.y, glowR);
      grd.addColorStop(0, cfg.glowColor);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fire ring for EPIC
    if (this.type === 'EPIC') {
      ctx.strokeStyle = 'rgba(255,120,20,0.8)';
      ctx.lineWidth = 3;
      const fireR = this.size * 0.8 + 3 * Math.sin(t * 0.012);
      ctx.beginPath();
      ctx.arc(this.x, this.y, fireR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Orbiting stars for LEGENDARY
    if (this.type === 'LEGENDARY') {
      for (let i = 0; i < 4; i++) {
        const angle = this.rotation + i * (Math.PI / 2);
        const ox = Math.cos(angle) * (this.size + 8);
        const oy = Math.sin(angle) * (this.size + 8);
        ctx.font = '12px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(['⭐', '✨', '💫', '🌟'][i], this.x + ox, this.y + oy);
      }

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(Math.sin(t * 0.003) * 0.2);
      ctx.font = `${this.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Color overlay for rare/legendary
      if (cfg.hue !== null) {
        ctx.filter = `hue-rotate(${cfg.hue}deg) saturate(2) brightness(1.3)`;
      }
      ctx.fillText('🍗', 0, 0);
      ctx.filter = 'none';
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(this.x, this.y);
      const bob = Math.sin(t * this.frequency * 3 + this.phase) * 3;
      ctx.translate(0, bob);
      ctx.font = `${this.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (cfg.hue !== null) {
        ctx.filter = `hue-rotate(${cfg.hue}deg) saturate(2) brightness(1.4)`;
      }
      ctx.fillText('🍗', 0, 0);
      ctx.filter = 'none';
      ctx.restore();
    }

    // Rarity badge
    if (this.type !== 'COMMON') {
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      const badge = { RARE: 'RARE', EPIC: 'EPIC 🔥', LEGENDARY: 'LEGEND ⭐' }[this.type];
      ctx.fillText(badge, this.x, this.y - this.size * 0.7 - 4);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  static spawnRandom(game) {
    const typeKeys = Object.keys(CONFIG.CHICKEN_TYPES);
    const types = typeKeys.map(k => ({ key: k, weight: CONFIG.CHICKEN_TYPES[k].weight }));
    const chosen = Utils.weightedRandom(types);
    return new Chicken(chosen.key, CONFIG.CANVAS_WIDTH + 60, game);
  }
}
