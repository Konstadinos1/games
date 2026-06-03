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
    } else {
      this.y = groundY - height;
    }
    this.w = width;
    this.h = height;

    // Car/truck color variety
    const carColors = ['#3498DB','#E74C3C','#F39C12','#9B59B6','#1ABC9C','#E67E22','#27AE60'];
    this.color = carColors[Utils.randomInt(0, carColors.length - 1)];
  }

  update(dt, gameSpeed) {
    this._animTimer += dt;
    this.x -= gameSpeed * (dt / 16);
    if (this.x + this.w < -20) this.active = false;
  }

  getHitbox() {
    const margin = 8;
    return { x: this.x + margin, y: this.y + margin, w: this.w - margin * 2, h: this.h - margin };
  }

  draw(ctx, t) {
    if (!this.active) return;
    ctx.save();
    switch (this.type) {
      case 'CONE':     this._drawShoppingCart(ctx, t); break;
      case 'CAR':      this._drawCar(ctx, t);          break;
      case 'STM_BUS':  this._drawDeliveryTruck(ctx, t);break;
      case 'POTHOLE':  this._drawSpeedBump(ctx);        break;
      case 'BARRIER':  this._drawBollards(ctx, t);      break;
    }
    ctx.restore();
  }

  // ── Shopping cart (was CONE — jump over) ──
  _drawShoppingCart(ctx, t) {
    const { x, y, w, h } = this;
    const cx = x + w / 2;
    const wobble = Math.sin(t * 0.02) * 1.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, y + h + 2, w, 5);

    // Cart basket frame
    ctx.strokeStyle = '#C0C0C0';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x + 2, y + wobble, w - 4, h * 0.62);

    // Basket fill (metal look)
    ctx.fillStyle = 'rgba(200,210,220,0.35)';
    ctx.fillRect(x + 2, y + wobble, w - 4, h * 0.62);

    // Vertical wire lines inside basket
    ctx.strokeStyle = 'rgba(180,180,190,0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 2 + (w - 4) * (i / 4), y + wobble);
      ctx.lineTo(x + 2 + (w - 4) * (i / 4), y + wobble + h * 0.62);
      ctx.stroke();
    }

    // Handle bar
    ctx.strokeStyle = '#A0A0A0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.6, y - 10 + wobble);
    ctx.lineTo(x + w + 6, y - 10 + wobble);
    ctx.stroke();

    // Handle grip
    ctx.fillStyle = '#888';
    ctx.fillRect(x + w - 2, y - 14 + wobble, 10, 10);

    // Bottom supports
    ctx.strokeStyle = '#A0A0A0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + h * 0.62 + wobble);
    ctx.lineTo(x + 2, y + h - 8 + wobble);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w - 6, y + h * 0.62 + wobble);
    ctx.lineTo(x + w - 2, y + h - 8 + wobble);
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#555';
    [x + 4, x + w - 12].forEach(wx => {
      ctx.beginPath();
      ctx.arc(wx + 4, y + h - 4 + wobble, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Runaway label
    ctx.fillStyle = 'rgba(255,80,0,0.85)';
    ctx.font = 'bold 7px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠', cx, y - 16 + wobble);
  }

  // ── Car (driving through lot) ──
  _drawCar(ctx, t) {
    const { x, y, w, h } = this;
    const bounce = Math.sin(t * 0.02) * 1.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 4, y + h + bounce + 2, w - 4, 6);

    // Body
    ctx.fillStyle = this.color;
    ctx.fillRect(x, y + bounce, w, h);

    // Roof
    ctx.fillStyle = this._darken(this.color, 0.72);
    ctx.fillRect(x + w * 0.15, y - 18 + bounce, w * 0.7, 20);

    // Windows
    ctx.fillStyle = 'rgba(150,210,255,0.75)';
    ctx.fillRect(x + w * 0.18, y - 15 + bounce, w * 0.28, 14);
    ctx.fillRect(x + w * 0.52, y - 15 + bounce, w * 0.28, 14);

    // Wheels
    ctx.fillStyle = '#1a1a1a';
    [x + 12, x + w - 26].forEach(wx => {
      ctx.beginPath();
      ctx.arc(wx + 7, y + h + bounce, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#777';
      ctx.beginPath();
      ctx.arc(wx + 7, y + h + bounce, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
    });

    // Headlights (driving toward player)
    ctx.fillStyle = 'rgba(255,240,120,0.9)';
    ctx.fillRect(x + w - 8, y + h * 0.2 + bounce, 8, 10);
    ctx.fillStyle = 'rgba(255,50,50,0.9)';
    ctx.fillRect(x, y + h * 0.2 + bounce, 8, 10);
  }

  // ── Bellepros Delivery Truck (was STM_BUS — slide under) ──
  _drawDeliveryTruck(ctx, t) {
    const { x, y, w, h } = this;
    const bounce = Math.sin(t * 0.012) * 1;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 6, y + h + bounce + 3, w - 6, 9);

    // Truck cargo box — brand red
    ctx.fillStyle = '#E8192C';
    ctx.fillRect(x + w * 0.35, y + bounce, w * 0.65, h);

    // Bellepros logo on cargo side
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BELLEPROS', x + w * 0.68, y + h * 0.32 + bounce);
    ctx.font = '7px Arial';
    ctx.fillText('PIRI-PIRI 🌶️', x + w * 0.68, y + h * 0.52 + bounce);

    // Red/white stripe
    ctx.fillStyle = '#FFF';
    ctx.fillRect(x + w * 0.35, y + h * 0.7 + bounce, w * 0.65, 6);

    // Cargo door lines
    ctx.strokeStyle = 'rgba(200,0,20,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.72, y + bounce);
    ctx.lineTo(x + w * 0.72, y + h + bounce);
    ctx.stroke();

    // Cab — darker red
    ctx.fillStyle = '#C0392B';
    ctx.fillRect(x, y + h * 0.15 + bounce, w * 0.38, h * 0.85);

    // Cab windshield
    ctx.fillStyle = 'rgba(180,220,255,0.75)';
    ctx.fillRect(x + w * 0.04, y + h * 0.18 + bounce, w * 0.28, h * 0.35);

    // Cab stripe
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x, y + h * 0.7 + bounce, w * 0.38, 4);

    // Wheels
    ctx.fillStyle = '#1a1a1a';
    [x + 12, x + w * 0.28, x + w * 0.58, x + w - 28].forEach(wx => {
      ctx.beginPath();
      ctx.arc(wx + 7, y + h + bounce, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(wx + 7, y + h + bounce, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
    });

    // Headlights
    ctx.fillStyle = 'rgba(255,240,120,0.9)';
    ctx.fillRect(x + w - 8, y + h * 0.3 + bounce, 8, 12);
  }

  // ── Speed bump (was POTHOLE) ──
  _drawSpeedBump(ctx) {
    const { x, y, w, h } = this;
    const cx = x + w / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 2, y + h + 1, w - 2, 4);

    // Bump body — alternating yellow/black
    const sections = 5;
    const sW = w / sections;
    for (let i = 0; i < sections; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#FFD700' : '#1a1a1a';
      ctx.fillRect(x + i * sW, y, sW, h);
    }

    // Rounded top
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(cx, y, w / 2, h * 0.6, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    for (let i = 0; i < 2; i++) {
      const sx = x + sW + i * sW * 2;
      ctx.beginPath();
      ctx.ellipse(sx + sW / 2, y, sW / 2 * 0.9, h * 0.55, 0, Math.PI, 0);
      ctx.fill();
    }

    // Warning text
    ctx.fillStyle = '#1a1a1a';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPEED BUMP', cx, y + h - 3);

    // Warning sign
    ctx.font = '16px serif';
    ctx.fillText('⚠️', cx, y - 12);
  }

  // ── Concrete bollards (was BARRIER) ──
  _drawBollards(ctx, t) {
    const { x, y, w, h } = this;
    const flash = Math.floor(t / 400) % 2 === 0;

    const bollardW = 16;
    const bollardH = h;
    const count = 4;
    const spacing = (w - bollardW) / (count - 1);

    for (let i = 0; i < count; i++) {
      const bx = x + i * spacing;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx + 2, y + bollardH + 2, bollardW - 2, 5);

      // Bollard body — concrete grey
      const bGrad = ctx.createLinearGradient(bx, y, bx + bollardW, y);
      bGrad.addColorStop(0, '#8a8a8a');
      bGrad.addColorStop(0.4, '#c0c0c0');
      bGrad.addColorStop(1, '#707070');
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(bx, y + bollardH * 0.1, bollardW, bollardH * 0.9, 3);
      ctx.fill();

      // Rounded cap
      ctx.fillStyle = '#b0b0b0';
      ctx.beginPath();
      ctx.ellipse(bx + bollardW / 2, y + bollardH * 0.1, bollardW / 2, bollardH * 0.12, 0, Math.PI, 0);
      ctx.fill();

      // Reflective band
      ctx.fillStyle = flash ? '#FFD700' : 'rgba(255,215,0,0.4)';
      ctx.fillRect(bx + 1, y + bollardH * 0.35, bollardW - 2, 6);

      // Red stripe
      ctx.fillStyle = '#E8192C';
      ctx.fillRect(bx + 1, y + bollardH * 0.55, bollardW - 2, 5);
    }

    // Chain between bollards (optional detail)
    ctx.strokeStyle = 'rgba(160,160,160,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < count - 1; i++) {
      const ax = x + i * spacing + bollardW / 2;
      const bx2 = x + (i + 1) * spacing + bollardW / 2;
      const midY = y + bollardH * 0.4 + Math.sin(i * 1.2) * 4;
      ctx.beginPath();
      ctx.moveTo(ax, y + bollardH * 0.35);
      ctx.quadraticCurveTo((ax + bx2) / 2, midY + 8, bx2, y + bollardH * 0.35);
      ctx.stroke();
    }
  }

  _darken(hex, factor) {
    if (!hex.startsWith('#') || hex.length < 7) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.floor(r * factor);
    g = Math.floor(g * factor);
    b = Math.floor(b * factor);
    return `rgb(${r},${g},${b})`;
  }

  static spawnRandom(game) {
    const types = Object.keys(CONFIG.OBSTACLE_TYPES);
    const type = types[Utils.randomInt(0, types.length - 1)];
    return new Obstacle(type, CONFIG.CANVAS_WIDTH + 40, game);
  }
}
