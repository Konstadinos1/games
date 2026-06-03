'use strict';

class Background {
  constructor() {
    this.offset = 0;
    this.speed = 0;
    this.time = 0;

    // Parked cars in lot background
    this._parkedCars = this._genParkedCars();
    // Parking lot light poles
    this._lights = this._genLights();
    // Shopping carts in background
    this._bgCarts = this._genBgCarts();
    // Clouds
    this._clouds = this._genClouds();
  }

  _genParkedCars() {
    const colors = ['#3498DB','#E74C3C','#F39C12','#9B59B6','#BDC3C7','#1ABC9C','#E67E22','#2C3E50'];
    const cars = [];
    for (let i = 0; i < 14; i++) {
      cars.push({
        x: i * 160 + Utils.randomBetween(0, 60),
        row: Utils.randomInt(0, 1),  // 0=far row, 1=near row
        color: colors[Utils.randomInt(0, colors.length - 1)],
        w: Utils.randomBetween(70, 95),
        h: 34,
      });
    }
    return cars;
  }

  _genLights() {
    const lights = [];
    for (let i = 0; i < 8; i++) {
      lights.push({ x: i * 210 + 60, phase: i * 0.4 });
    }
    return lights;
  }

  _genBgCarts() {
    const carts = [];
    for (let i = 0; i < 6; i++) {
      carts.push({ x: i * 300 + 100, speed: 0.3 + Math.random() * 0.2 });
    }
    return carts;
  }

  _genClouds() {
    return Array.from({ length: 6 }, (_, i) => ({
      x: i * 160 + Utils.randomBetween(0, 80),
      y: Utils.randomBetween(20, 90),
      w: Utils.randomBetween(100, 200),
      h: Utils.randomBetween(28, 50),
      speed: Utils.randomBetween(0.08, 0.2),
    }));
  }

  update(dt, gameSpeed, isPiriZone = false) {
    this.time += dt;
    this.speed = gameSpeed;
    const scroll = gameSpeed * dt * 0.06;
    this.offset += scroll;

    // Scroll parked cars (slow parallax)
    this._parkedCars.forEach(c => {
      c.x -= scroll * (c.row === 0 ? 0.18 : 0.35);
      const wrap = CONFIG.CANVAS_WIDTH + 110;
      if (c.x + c.w < -10) c.x += 14 * 160;
    });
    this._lights.forEach(l => {
      l.x -= scroll * 0.3;
      if (l.x < -10) l.x += 8 * 210;
    });
    this._bgCarts.forEach(c => {
      c.x -= scroll * c.speed;
      if (c.x < -30) c.x += 6 * 300;
    });
    this._clouds.forEach(c => {
      c.x -= c.speed * scroll * 8;
      if (c.x + c.w < 0) c.x = CONFIG.CANVAS_WIDTH + 20;
    });
  }

  draw(ctx, isPiriZone = false) {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const t = this.time;

    // ── Sky: late afternoon / golden hour ──
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    if (isPiriZone) {
      skyGrad.addColorStop(0, '#2d0a00');
      skyGrad.addColorStop(0.5, '#6b1800');
      skyGrad.addColorStop(1, '#c43510');
    } else {
      skyGrad.addColorStop(0, '#1a2a4a');
      skyGrad.addColorStop(0.3, '#2e4a7a');
      skyGrad.addColorStop(0.7, '#c07030');
      skyGrad.addColorStop(1, '#e8922a');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.55);

    // Clouds
    this._clouds.forEach(c => this._drawCloud(ctx, c));

    // Piri Zone atmosphere
    if (isPiriZone) {
      const glow = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W);
      glow.addColorStop(0, `rgba(232,25,44,${0.15 + 0.08 * Math.sin(t * 0.005)})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }

    // ── Bellepros storefront (far background) ──
    this._drawStorefront(ctx, isPiriZone, t);

    // ── Far parked car row ──
    const farRowY = 530;
    this._parkedCars.filter(c => c.row === 0).forEach(c => {
      this._drawParkedCar(ctx, c.x, farRowY, c.w, c.h, c.color, 0.75);
    });

    // ── Lot surface ──
    this._drawParkingLot(ctx, isPiriZone);

    // ── Lot lights ──
    this._lights.forEach(l => this._drawLightPole(ctx, l, t));

    // ── Near parked car row ──
    const nearRowY = 590;
    this._parkedCars.filter(c => c.row === 1).forEach(c => {
      this._drawParkedCar(ctx, c.x, nearRowY, c.w * 1.15, c.h * 1.1, c.color, 0.95);
    });

    // Background shopping carts
    this._bgCarts.forEach(c => this._drawBgCart(ctx, c));

    // Speed heat shimmer at high speed
    if (this.speed > 9) {
      const alpha = Math.min((this.speed - 9) / 6, 0.25);
      ctx.strokeStyle = `rgba(255,180,50,${alpha * 0.4})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const lineY = 540 + Math.sin(t * 0.01 + i) * 20;
        const lineX = ((this.offset * 0.5 + i * 80) % (W + 100)) - 50;
        ctx.beginPath();
        ctx.moveTo(lineX, lineY);
        ctx.lineTo(lineX - 60, lineY + 3);
        ctx.stroke();
      }
    }
  }

  _drawCloud(ctx, c) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#e8c090';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.2, c.y - c.h * 0.25, c.w * 0.3, c.h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawStorefront(ctx, isPiriZone, t) {
    const W = CONFIG.CANVAS_WIDTH;
    // Store building base
    const storeY = 320;
    const storeH = 210;

    // Building body — red brand color
    ctx.fillStyle = isPiriZone ? '#5a0010' : '#c41020';
    ctx.fillRect(0, storeY, W, storeH);

    // Lighter upper facade
    ctx.fillStyle = isPiriZone ? '#7a0018' : '#e8192c';
    ctx.fillRect(0, storeY, W, 70);

    // Roof line
    ctx.fillStyle = isPiriZone ? '#3a000c' : '#8b0010';
    ctx.fillRect(0, storeY - 8, W, 16);

    // ── BELLEPROS wordmark ──
    const logoY = storeY + 38;
    // Dark red background pill for logo
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 130, logoY - 28, 260, 48, 8);
    ctx.fill();

    // Main BELLEPROS text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    ctx.fillText('BELLEPROS', W / 2, logoY - 6);

    // Tagline
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText('PIRI-PIRI ROTISSERIE', W / 2, logoY + 14);

    // Pepper icon on each side
    ctx.font = '18px serif';
    ctx.fillText('🌶️', W / 2 - 120, logoY - 6);
    ctx.fillText('🌶️', W / 2 + 120, logoY - 6);

    // Store windows
    const winY = storeY + 80;
    const winH = 80;
    const wins = [30, 120, 220, 310];
    wins.forEach(wx => {
      // Window frame
      ctx.fillStyle = '#333';
      ctx.fillRect(wx - 2, winY - 2, 66, winH + 4);
      // Glass
      const winGrad = ctx.createLinearGradient(wx, winY, wx + 64, winY + winH);
      winGrad.addColorStop(0, 'rgba(180,220,255,0.4)');
      winGrad.addColorStop(0.5, 'rgba(220,240,255,0.65)');
      winGrad.addColorStop(1, 'rgba(160,200,240,0.4)');
      ctx.fillStyle = winGrad;
      ctx.fillRect(wx, winY, 64, winH);
      // Warm light inside
      if (!isPiriZone) {
        ctx.fillStyle = `rgba(255,180,80,${0.15 + 0.05 * Math.sin(t * 0.002)})`;
        ctx.fillRect(wx, winY, 64, winH);
      }
      // Window divider
      ctx.strokeStyle = 'rgba(100,120,140,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wx + 32, winY);
      ctx.lineTo(wx + 32, winY + winH);
      ctx.stroke();
    });

    // Front door
    ctx.fillStyle = '#222';
    ctx.fillRect(W / 2 - 28, storeY + 100, 56, 130);
    // Door glass
    const dGrad = ctx.createLinearGradient(W / 2 - 24, storeY + 104, W / 2 + 24, storeY + 104);
    dGrad.addColorStop(0, 'rgba(160,200,240,0.5)');
    dGrad.addColorStop(1, 'rgba(180,220,255,0.3)');
    ctx.fillStyle = dGrad;
    ctx.fillRect(W / 2 - 24, storeY + 104, 24, 126);
    ctx.fillRect(W / 2 + 0, storeY + 104, 24, 126);
    // Door handle
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(W / 2 - 6, storeY + 162, 12, 4);

    // OPEN / PIRI ZONE sign
    if (isPiriZone) {
      const signAlpha = 0.7 + 0.3 * Math.sin(t * 0.006);
      ctx.fillStyle = `rgba(232,25,44,${signAlpha})`;
      ctx.beginPath();
      ctx.roundRect(W / 2 - 55, storeY + 72, 110, 24, 4);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('🌶️ PIRI ZONE — 2X REWARDS!', W / 2, storeY + 88);
    } else {
      ctx.fillStyle = '#27AE60';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 28, storeY + 72, 56, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('OPEN', W / 2, storeY + 85);
    }

    // Sidewalk apron in front of store
    ctx.fillStyle = isPiriZone ? '#2a0a10' : '#b0a898';
    ctx.fillRect(0, storeY + storeH, W, 14);
  }

  _drawParkingLot(ctx, isPiriZone) {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const lotY = 544;

    // Asphalt surface
    const asphalt = ctx.createLinearGradient(0, lotY, 0, H);
    if (isPiriZone) {
      asphalt.addColorStop(0, '#1a0810');
      asphalt.addColorStop(1, '#300d18');
    } else {
      asphalt.addColorStop(0, '#3a3a38');
      asphalt.addColorStop(1, '#2e2e2c');
    }
    ctx.fillStyle = asphalt;
    ctx.fillRect(0, lotY, W, H - lotY);

    // Curb / sidewalk strip at store front
    ctx.fillStyle = isPiriZone ? '#3a1520' : '#6a6560';
    ctx.fillRect(0, lotY, W, 12);

    // Painted parking space lines (far bay)
    ctx.strokeStyle = isPiriZone ? 'rgba(255,100,100,0.35)' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    const spaceW = 55;
    const farLineY = lotY + 55;
    const farLineH = 42;
    const lineOffset = this.offset * 0.18 % spaceW;
    for (let x = -spaceW + lineOffset; x < W + spaceW; x += spaceW) {
      ctx.beginPath();
      ctx.moveTo(x, farLineY);
      ctx.lineTo(x, farLineY + farLineH);
      ctx.stroke();
    }
    // Far lane line
    ctx.strokeStyle = isPiriZone ? 'rgba(255,150,150,0.4)' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, lotY + 108);
    ctx.lineTo(W, lotY + 108);
    ctx.stroke();

    // Drive lane — where player runs (slightly different shade)
    ctx.fillStyle = isPiriZone ? 'rgba(60,0,20,0.4)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, lotY + 108, W, 140);

    // Painted parking space lines (near bay, below player lane)
    ctx.strokeStyle = isPiriZone ? 'rgba(255,100,100,0.3)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    const nearLineY = lotY + 260;
    const nearOffset = this.offset * 0.6 % spaceW;
    for (let x = -spaceW + nearOffset; x < W + spaceW; x += spaceW) {
      ctx.beginPath();
      ctx.moveTo(x, nearLineY);
      ctx.lineTo(x, nearLineY + 50);
      ctx.stroke();
    }

    // Drive lane arrows (painted on ground)
    ctx.fillStyle = isPiriZone ? 'rgba(255,100,100,0.15)' : 'rgba(255,255,255,0.10)';
    const arrowPeriod = 180;
    const arrowOffset = this.offset * 0.5 % arrowPeriod;
    for (let x = -arrowPeriod + arrowOffset; x < W + arrowPeriod; x += arrowPeriod) {
      ctx.save();
      ctx.translate(x + 20, lotY + 170);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  _drawLightPole(ctx, light, t) {
    const x = light.x;
    const groundY = 554;
    const poleH = 130;
    const topY = groundY - poleH;

    // Pole
    ctx.fillStyle = '#888';
    ctx.fillRect(x - 3, topY, 6, poleH);

    // Arm
    ctx.fillStyle = '#999';
    ctx.fillRect(x - 3, topY, 36, 5);

    // Lamp housing
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 25, topY - 10, 20, 12);

    // Light glow
    const gAlpha = 0.6 + 0.1 * Math.sin(t * 0.004 + light.phase);
    const grd = ctx.createRadialGradient(x + 35, topY + 2, 0, x + 35, topY + 2, 50);
    grd.addColorStop(0, `rgba(255,220,100,${gAlpha})`);
    grd.addColorStop(0.3, `rgba(255,200,80,${gAlpha * 0.4})`);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 15, topY - 20, 100, 80);

    // Light cone on ground
    ctx.fillStyle = `rgba(255,220,100,0.04)`;
    ctx.beginPath();
    ctx.moveTo(x + 35, topY + 2);
    ctx.lineTo(x - 30, groundY + 80);
    ctx.lineTo(x + 100, groundY + 80);
    ctx.closePath();
    ctx.fill();
  }

  _drawParkedCar(ctx, x, y, w, h, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 4, y + h + 2, w - 4, 6);

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);

    // Roof
    ctx.fillStyle = this._darken(color, 0.7);
    ctx.fillRect(x + w * 0.15, y - h * 0.45, w * 0.7, h * 0.5);

    // Windshield
    ctx.fillStyle = 'rgba(180,220,255,0.7)';
    ctx.fillRect(x + w * 0.18, y - h * 0.4, w * 0.27, h * 0.35);
    ctx.fillRect(x + w * 0.52, y - h * 0.4, w * 0.27, h * 0.35);

    // Wheels
    ctx.fillStyle = '#1a1a1a';
    [x + 10, x + w - 22].forEach(wx => {
      ctx.beginPath();
      ctx.arc(wx + 6, y + h, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  _drawBgCart(ctx, c) {
    if (c.x < -30 || c.x > CONFIG.CANVAS_WIDTH + 30) return;
    const y = 585;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#AAA';
    ctx.lineWidth = 1.5;
    // Frame
    ctx.strokeRect(c.x, y - 22, 22, 20);
    // Handle
    ctx.beginPath();
    ctx.moveTo(c.x - 4, y - 22);
    ctx.lineTo(c.x + 4, y - 34);
    ctx.lineTo(c.x + 22, y - 34);
    ctx.stroke();
    // Wheels
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(c.x + 4, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x + 18, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
}
