'use strict';

class Particle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.life = 1;
    this.maxLife = 1;
    this._setup(type);
  }

  _setup(type) {
    switch (type) {
      case 'coin':
        this.text = '💰';
        this.vx = Utils.randomBetween(-2, 2);
        this.vy = Utils.randomBetween(-5, -2);
        this.gravity = 0.15;
        this.size = Utils.randomBetween(16, 24);
        this.maxLife = Utils.randomBetween(0.8, 1.4);
        break;
      case 'star':
        this.text = ['⭐', '✨', '💫'][Utils.randomInt(0, 2)];
        this.vx = Utils.randomBetween(-4, 4);
        this.vy = Utils.randomBetween(-6, -2);
        this.gravity = 0.12;
        this.size = Utils.randomBetween(14, 22);
        this.maxLife = Utils.randomBetween(0.7, 1.2);
        break;
      case 'dust':
        this.text = null;
        this.vx = Utils.randomBetween(-3, 1);
        this.vy = Utils.randomBetween(-2, -0.5);
        this.gravity = 0.05;
        this.size = Utils.randomBetween(4, 12);
        this.color = `rgba(180,160,140,`;
        this.maxLife = Utils.randomBetween(0.4, 0.7);
        break;
      case 'hit':
        this.text = null;
        this.vx = Utils.randomBetween(-6, 6);
        this.vy = Utils.randomBetween(-8, -1);
        this.gravity = 0.3;
        this.size = Utils.randomBetween(4, 10);
        this.color = `rgba(232,25,44,`;
        this.maxLife = Utils.randomBetween(0.5, 0.9);
        break;
      case 'catch_common':
        this.text = '+100';
        this.vx = Utils.randomBetween(-0.5, 0.5);
        this.vy = -2.5;
        this.gravity = 0;
        this.size = 18;
        this.color = '#FFF';
        this.maxLife = 1.0;
        break;
      case 'catch_rare':
        this.text = '+500 🌟';
        this.vx = Utils.randomBetween(-0.5, 0.5);
        this.vy = -2.5;
        this.gravity = 0;
        this.size = 20;
        this.color = '#FFD700';
        this.maxLife = 1.2;
        break;
      case 'catch_epic':
        this.text = '+1000 🔥';
        this.vx = Utils.randomBetween(-0.5, 0.5);
        this.vy = -2.8;
        this.gravity = 0;
        this.size = 22;
        this.color = '#FF6B35';
        this.maxLife = 1.3;
        break;
      case 'catch_legendary':
        this.text = '+2500 👑';
        this.vx = Utils.randomBetween(-0.5, 0.5);
        this.vy = -3;
        this.gravity = 0;
        this.size = 26;
        this.color = '#9B59B6';
        this.maxLife = 1.5;
        break;
      case 'streak':
        this.text = null;
        this.vx = Utils.randomBetween(-3, 3);
        this.vy = Utils.randomBetween(-5, -2);
        this.gravity = 0.08;
        this.size = Utils.randomBetween(3, 8);
        this.color = `rgba(232,25,44,`;
        this.maxLife = Utils.randomBetween(0.6, 1.0);
        break;
      case 'piri_zone':
        this.text = ['🌶️', '🔥', '⭐', '🍗'][Utils.randomInt(0, 3)];
        this.vx = Utils.randomBetween(-4, 4);
        this.vy = Utils.randomBetween(-8, -4);
        this.gravity = 0.08;
        this.size = Utils.randomBetween(20, 32);
        this.maxLife = Utils.randomBetween(1.0, 2.0);
        break;
    }
    this.life = this.maxLife;
  }

  update(dt) {
    const step = dt / 16;
    this.x += this.vx * step;
    this.y += this.vy * step;
    this.vy += (this.gravity || 0) * step;
    this.life -= dt / 1000;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;

    if (this.text && this.text.match(/[+\d]/)) {
      // Score popup text
      ctx.font = `bold ${this.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillStyle = this.color || '#FFF';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 6;
      ctx.fillText(this.text, this.x, this.y);
      ctx.shadowBlur = 0;
    } else if (this.text) {
      // Emoji
      ctx.font = `${this.size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, this.x, this.y);
    } else {
      // Shape particle
      ctx.fillStyle = this.color + `${alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawn(x, y, type, count = 1) {
    for (let i = 0; i < count; i++) {
      const offsetX = count > 1 ? Utils.randomBetween(-20, 20) : 0;
      const offsetY = count > 1 ? Utils.randomBetween(-10, 10) : 0;
      this.particles.push(new Particle(x + offsetX, y + offsetY, type));
    }
  }

  update(dt) {
    this.particles = this.particles.filter(p => p.update(dt));
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }

  clear() {
    this.particles = [];
  }
}
