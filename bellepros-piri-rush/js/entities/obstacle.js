'use strict';

class Obstacle {
  constructor(type, x, game) {
    this.type = type;
    this.cfg = CONFIG.OBSTACLE_TYPES[type];
    this.x = x;
    this.game = game;
    this.active = true;
    this._animTimer = 0;

    const P = CONFIG.PLAYER;
    const groundY = P.GROUND_Y;
    const { width, height, isGround, groundY: relY } = this.cfg;

    if (isGround) {
      this.y = groundY + (relY || 0);
      this.w = width;
      this.h = height;
    } else {
      this.y = groundY - height;
      this.w = width;
      this.h = height;
    }

    // Car color variety
    const carColors = ['#3498DB', '#E74C3C', '#F39C12', '#9B59B6', '#1ABC9C', '#E67E22'];
    this.color = carColors[Utils.randomInt(0, carColors.length - 1)];
  }

  update(dt, gameSpeed) {
    this._animTimer += dt;
    this.x -= gameSpeed * (dt / 16);
    if (this.x + this.w < -20) this.active = false;
  }

  getHitbox() {
    const margin = 8;
    return {
      x: this.x + margin,
      y: this.y + margin,
      w: this.w - margin * 2,
      h: this.h - margin
    };
  }

  draw(ctx, t) {
    if (!this.active) return;
    ctx.save();
    switch (this.type) {
      case 'CONE':     this._drawCone(ctx);    break;
      case 'CAR':      this._drawCar(ctx, t);  break;
      case 'STM_BUS':  this._drawBus(ctx, t);  break;
      case 'POTHOLE':  this._drawPothole(ctx); break;
      case 'BARRIER':  this._drawBarrier(ctx, t); break;
    }
    ctx.restore();
  }

  _drawCone(ctx) {
    const { x, y, w, h } = this;
    const cx = x + w / 2;
    // Orange body
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    // White stripes
    ctx.fillStyle = '#FFF';
    ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.12);
    ctx.fillRect(x + w * 0.15, y + h * 0.55, w * 0.7, h * 0.12);
    // Base
    ctx.fillStyle = '#555';
    ctx.fillRect(x - 4, y + h - 5, w + 8, 7);
  }

  _drawCar(ctx, t) {
    const { x, y, w, h } = this;
    const bounce = Math.sin(t * 0.02) * 1.5;

    // Body shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 4, y + h + bounce + 2, w - 4, 6);

    // Car body
    ctx.fillStyle = this.color;
    ctx.fillRect(x, y + bounce, w, h);

    // Roof
    const darker = this._darken(this.color, 0.7);
    ctx.fillStyle = darker;
    ctx.fillRect(x + w * 0.15, y - 18 + bounce, w * 0.7, 20);

    // Windows
    ctx.fillStyle = 'rgba(150,200,255,0.7)';
    ctx.fillRect(x + w * 0.18, y - 15 + bounce, w * 0.28, 14);
    ctx.fillRect(x + w * 0.52, y - 15 + bounce, w * 0.28, 14);

    // Wheels
    ctx.fillStyle = '#222';
    [x + 12, x + w - 26].forEach(wx => {
      ctx.beginPath();
      ctx.arc(wx + 7, y + h + bounce, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(wx + 7, y + h + bounce, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
    });

    // Headlights
    ctx.fillStyle = 'rgba(255,240,100,0.9)';
    ctx.fillRect(x + w - 8, y + h * 0.2 + bounce, 8, 10);
    // Taillights
    ctx.fillStyle = 'rgba(255,50,50,0.9)';
    ctx.fillRect(x, y + h * 0.2 + bounce, 8, 10);
  }

  _drawBus(ctx, t) {
    const { x, y, w, h } = this;
    const bounce = Math.sin(t * 0.015) * 1;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 5, y + h + bounce + 2, w - 5, 8);

    // Bus body - STM green
    ctx.fillStyle = '#006B3F';
    ctx.fillRect(x, y + bounce, w, h);
    ctx.fillStyle = '#005030';
    ctx.fillRect(x, y + bounce, w, 12);
    ctx.fillRect(x, y + h - 14 + bounce, w, 14);

    // STM stripe
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x, y + 12 + bounce, w, 5);

    // Windows
    ctx.fillStyle = 'rgba(180,220,255,0.8)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x + 10 + i * 28, y + 16 + bounce, 22, 20);
    }

    // STM label
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('STM', x + w / 2, y + 10 + bounce);

    // Destination sign
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + w * 0.25, y + bounce, w * 0.5, 12);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('18 BEAUBIEN', x + w / 2, y + 9 + bounce);

    // Wheels
    ctx.fillStyle = '#222';
    [x + 15, x + w - 30].forEach(wx => {
      ctx.beginPath();
      ctx.arc(wx + 7, y + h + bounce, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(wx + 7, y + h + bounce, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
    });
  }

  _drawPothole(ctx) {
    const { x, y, w, h } = this;
    // Dark pit
    const grd = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w / 2);
    grd.addColorStop(0, '#111');
    grd.addColorStop(0.7, '#333');
    grd.addColorStop(1, '#555');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cracked edge
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 2, h / 2 + 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Warning sign above
    ctx.fillStyle = '#FF6B35';
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️', x + w / 2, y - 10);
  }

  _drawBarrier(ctx, t) {
    const { x, y, w, h } = this;
    const flash = Math.floor(t / 300) % 2 === 0;

    // Legs
    ctx.fillStyle = '#888';
    ctx.fillRect(x + 4, y + h - 16, 8, 16);
    ctx.fillRect(x + w - 12, y + h - 16, 8, 16);

    // Bar
    const barH = 14;
    // Alternating red/white sections
    const sections = 6;
    const sW = w / sections;
    for (let i = 0; i < sections; i++) {
      ctx.fillStyle = (i % 2 === (flash ? 0 : 1)) ? '#E74C3C' : '#FFF';
      ctx.fillRect(x + i * sW, y, sW, barH);
    }

    // Border
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, barH);

    // Warning lights
    ctx.fillStyle = flash ? '#FFD700' : 'rgba(255,215,0,0.3)';
    ctx.beginPath();
    ctx.arc(x + 10, y - 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w - 10, y - 8, 6, 0, Math.PI * 2);
    ctx.fill();

    // Construction text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TRAVAUX / CONSTRUCTION', x + w / 2, y + 10);
  }

  _darken(hex, factor) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.floor(r * factor); g = Math.floor(g * factor); b = Math.floor(b * factor);
    return `rgb(${r},${g},${b})`;
  }

  static spawnRandom(game) {
    const types = Object.keys(CONFIG.OBSTACLE_TYPES);
    const type = types[Utils.randomInt(0, types.length - 1)];
    return new Obstacle(type, CONFIG.CANVAS_WIDTH + 40, game);
  }
}
