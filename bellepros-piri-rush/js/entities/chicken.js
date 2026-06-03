'use strict';

// Bellepros menu items per rarity — multiple items per tier for variety
const FOOD_OPTIONS = {
  COMMON:    [
    { emoji: '🌭', name: 'Steamie' },
    { emoji: '🌭', name: 'Steamie' },  // steamie is the signature — appears 2x more
    { emoji: '🍟', name: 'Fries' },
  ],
  RARE:      [
    { emoji: '🍔', name: 'Hamburger' },
    { emoji: '🌭', name: 'Hot Dog' },
  ],
  EPIC:      [
    { emoji: '🍟', name: 'Poutine' },
    { emoji: '🧅', name: 'Onion Rings' },
  ],
  LEGENDARY: [
    { emoji: '🍔', name: 'Bellepros Special' },
  ],
};

const FOOD_BADGE = {
  COMMON:    null,
  RARE:      'RARE',
  EPIC:      'EPIC 🔥',
  LEGENDARY: 'LEGEND ⭐',
};

class Chicken {
  constructor(type, x, game) {
    this.type = type;
    this.cfg = CONFIG.CHICKEN_TYPES[type];
    this.x = x;
    this.game = game;

    // Pick a random food option for this tier
    const opts = FOOD_OPTIONS[type];
    const pick = opts[Math.floor(Math.random() * opts.length)];
    this.emoji = pick.emoji;
    this.foodName = pick.name;

    this.baseY = Utils.randomBetween(420, 630);
    this.y = this.baseY;
    this.phase = Math.random() * Math.PI * 2;
    this.amplitude = Utils.randomBetween(18, 50);
    this.frequency = Utils.randomBetween(0.002, 0.005);
    this.size = this.cfg.size;
    this.active = true;
    this.caught = false;

    this.isARChicken = false;
    this.arX = 0; this.arY = 0;

    this.trail = [];
    this.trailTimer = 0;
    this.rotation = 0;
    this.wobbleSpeed = Utils.randomBetween(0.003, 0.007);
  }

  update(dt, gameSpeed) {
    if (this.caught) return;
    this.x -= gameSpeed * (dt / 16) * 0.95;
    this.y = this.baseY + Math.sin(this.game.time * this.frequency + this.phase) * this.amplitude;

    if (this.type === 'LEGENDARY') this.rotation += 0.035;

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
    this.trail.forEach(p => {
      ctx.globalAlpha = p.alpha * 0.5;
      ctx.font = `${this.size * 0.65}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    // Glow (non-common)
    if (this.type !== 'COMMON') {
      const pulse = 0.7 + 0.3 * Math.sin(t * 0.006 + this.phase);
      const glowR = this.size * (1.4 + 0.2 * pulse);
      const grd = ctx.createRadialGradient(this.x, this.y, this.size * 0.2, this.x, this.y, glowR);
      grd.addColorStop(0, cfg.glowColor);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
      ctx.fill();
    }

    // EPIC: flame ring + steam wisps
    if (this.type === 'EPIC') {
      ctx.strokeStyle = 'rgba(255,120,20,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.82 + 3 * Math.sin(t * 0.012), 0, Math.PI * 2);
      ctx.stroke();
    }

    // LEGENDARY: orbiting food emojis
    if (this.type === 'LEGENDARY') {
      const orbiters = ['🌭', '🍔', '🍟', '🧅'];
      for (let i = 0; i < 4; i++) {
        const angle = this.rotation + i * (Math.PI / 2);
        ctx.font = '13px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(orbiters[i],
          this.x + Math.cos(angle) * (this.size + 11),
          this.y + Math.sin(angle) * (this.size + 11));
      }
    }

    // Main food emoji
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'LEGENDARY') {
      ctx.rotate(Math.sin(t * 0.003) * 0.18);
    } else {
      ctx.translate(0, Math.sin(t * this.wobbleSpeed * 3 + this.phase) * 3);
      ctx.rotate(Math.sin(t * this.wobbleSpeed + this.phase) * 0.12);
    }
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (cfg.hue !== null) ctx.filter = `hue-rotate(${cfg.hue}deg) saturate(1.8) brightness(1.3)`;
    ctx.fillText(this.emoji, 0, 0);
    ctx.filter = 'none';
    ctx.restore();

    // Food name label above item
    if (this.type !== 'COMMON') {
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFF';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 5;
      ctx.fillText(FOOD_BADGE[this.type], this.x, this.y - this.size * 0.7 - 5);
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
