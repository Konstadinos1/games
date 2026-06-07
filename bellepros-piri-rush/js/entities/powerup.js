'use strict';

const POWERUP_TYPES = {
  MAGNET: {
    id: 'MAGNET', emoji: '🧲', label: 'FOOD MAGNET',
    colorRgb: '52,152,219', duration: 8000, weight: 35,
  },
  SHIELD: {
    id: 'SHIELD', emoji: '🛡️', label: 'PIRI SHIELD',
    colorRgb: '39,174,96', duration: 10000, weight: 30,
  },
  COIN_FEVER: {
    id: 'COIN_FEVER', emoji: '🪙', label: 'COIN FEVER',
    colorRgb: '255,215,0', duration: 7000, weight: 25,
  },
  SLOW_MO: {
    id: 'SLOW_MO', emoji: '🌶️', label: 'SLOW BURN',
    colorRgb: '155,89,182', duration: 6000, weight: 20,
  },
};

class PowerUp {
  constructor(type, x) {
    this.type = type;
    this.cfg = POWERUP_TYPES[type];
    this.x = x;
    this.baseY = Utils.randomBetween(360, 540);
    this.y = this.baseY;
    this.phase = Math.random() * Math.PI * 2;
    this.size = 32;
    this.active = true;
  }

  update(dt, gameSpeed) {
    this.x -= gameSpeed * (dt / 16) * 0.95;
    this.y = this.baseY + Math.sin(Date.now() * 0.003 + this.phase) * 14;
    if (this.x < -80) this.active = false;
  }

  getHitbox() {
    const r = this.size * 0.6;
    return { x: this.x - r, y: this.y - r, w: r * 2, h: r * 2 };
  }

  draw(ctx, t) {
    if (!this.active) return;
    const { colorRgb, emoji, label } = this.cfg;
    const pulse = 0.6 + 0.4 * Math.sin(t * 0.007 + this.phase);
    const glowR = this.size * (1.7 + 0.3 * pulse);

    ctx.save();
    ctx.translate(this.x, this.y);

    // Outer glow
    const grd = ctx.createRadialGradient(0, 0, this.size * 0.2, 0, 0, glowR);
    grd.addColorStop(0, `rgba(${colorRgb},${(0.5 * pulse).toFixed(2)})`);
    grd.addColorStop(1, `rgba(${colorRgb},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Badge circle
    ctx.fillStyle = `rgba(${colorRgb},0.88)`;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Emoji
    ctx.font = `${Math.round(this.size * 0.72)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 0);

    // Label above
    ctx.font = 'bold 8px Arial';
    ctx.fillStyle = '#FFF';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 5;
    ctx.fillText(label, 0, -(this.size + 8));
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  static spawnRandom() {
    const entries = Object.values(POWERUP_TYPES);
    const chosen = Utils.weightedRandom(entries.map(e => ({ key: e.id, weight: e.weight })));
    return new PowerUp(chosen.key, CONFIG.CANVAS_WIDTH + 60);
  }
}
