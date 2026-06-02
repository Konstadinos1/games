'use strict';

class GeofencingSystem {
  constructor() {
    this.currentLocation = null;
    this.nearestLocation = null;
    this.distanceToNearest = Infinity;
    this.inPiriZone = false;
    this.watchId = null;
    this.onPiriZoneEnter = null;
    this.onPiriZoneExit = null;
    this._lastNotifyTime = 0;
    this._mockMode = false;
    this._mockLocation = null;
  }

  start() {
    if (!('geolocation' in navigator)) {
      console.log('Geolocation not available, using mock mode');
      this._mockMode = true;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => this._onPosition(pos),
      err => { console.log('Geo error:', err.code); this._mockMode = true; },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    this.watchId = navigator.geolocation.watchPosition(
      pos => this._onPosition(pos),
      err => console.log('Geo watch error:', err.code),
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // For testing in browser - simulate being near a location
  simulateLocation(locationIndex = 0) {
    const loc = CONFIG.LOCATIONS[locationIndex];
    this._mockMode = true;
    this._mockLocation = { latitude: loc.lat + 0.001, longitude: loc.lng + 0.001 };
    this._onPosition({ coords: this._mockLocation });
  }

  _onPosition(pos) {
    const { latitude, longitude } = pos.coords;
    this.currentLocation = { lat: latitude, lng: longitude };

    let minDist = Infinity;
    let nearest = null;
    CONFIG.LOCATIONS.forEach(loc => {
      const dist = Utils.distanceBetween(latitude, longitude, loc.lat, loc.lng);
      if (dist < minDist) { minDist = dist; nearest = loc; }
    });

    this.nearestLocation = nearest;
    this.distanceToNearest = minDist;

    const wasInZone = this.inPiriZone;
    this.inPiriZone = minDist <= CONFIG.PIRI_ZONE_RADIUS_M;

    if (!wasInZone && this.inPiriZone) {
      this._onEnterPiriZone();
    } else if (wasInZone && !this.inPiriZone) {
      this._onExitPiriZone();
    }
  }

  _onEnterPiriZone() {
    console.log('Entered Piri Zone at', this.nearestLocation.name);
    if (this.onPiriZoneEnter) this.onPiriZoneEnter(this.nearestLocation);

    const now = Date.now();
    if (now - this._lastNotifyTime > 30 * 60 * 1000) {
      this._lastNotifyTime = now;
      Notifications.scheduleLocal(
        'Piri Zone Activated! 🌶️🔥',
        `You're near ${this.nearestLocation.name}! Play now for 2x rewards & exclusive chickens!`,
        0
      );
    }

    Audio.play('piri_zone');
  }

  _onExitPiriZone() {
    if (this.onPiriZoneExit) this.onPiriZoneExit();
  }

  getZoneStatus() {
    if (this.inPiriZone) {
      return {
        active: true,
        locationName: this.nearestLocation.name,
        distance: Math.round(this.distanceToNearest),
        bonus: '2x Rewards + Exclusive Chickens'
      };
    }
    if (this.nearestLocation && this.distanceToNearest < 2000) {
      return {
        active: false,
        locationName: this.nearestLocation.name,
        distance: Math.round(this.distanceToNearest),
        hint: `${Math.round(this.distanceToNearest - CONFIG.PIRI_ZONE_RADIUS_M)}m away from Piri Zone!`
      };
    }
    return { active: false };
  }

  // QR code scan handling (invoked when camera reads a Bellepros QR)
  handleQRScan(code) {
    const prefix = 'BELLEPROS-QR-';
    if (!code.startsWith(prefix)) return false;

    const locationCode = code.replace(prefix, '');
    const locMap = {
      'VDN': 0, 'PLT': 1, 'LVL': 2, 'NDG': 3, 'DWN': 4
    };

    if (locationCode in locMap) {
      // Grant secret character unlock
      const secretChars = ['ghost_cook', 'robot_cook', 'alien_chef'];
      const charIdx = locMap[locationCode] % secretChars.length;
      const charId = secretChars[charIdx];
      const char = CONFIG.CHARACTERS.find(c => c.id === charId);

      if (char && !Progression.isCharUnlocked(charId)) {
        Progression.unlockedChars.push(charId);
        Progression._save();
        return { type: 'char_unlock', character: char };
      }
      return { type: 'already_unlocked' };
    }
    return false;
  }
}

// Notifications system (referenced in geofencing)
class NotificationsSystem {
  constructor() {
    this.permission = 'default';
  }

  async requestPermission() {
    if (!('Notification' in window)) return false;
    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  scheduleLocal(title, body, delayMs = 0) {
    if (!('Notification' in window) || this.permission !== 'granted') return;
    setTimeout(() => {
      try {
        new Notification(title, {
          body,
          icon: 'assets/icon-192.png',
          badge: 'assets/badge-96.png',
          tag: 'bellepros-piri-rush',
          requireInteraction: false,
        });
      } catch (e) {}
    }, delayMs);
  }

  scheduleDailyReminder() {
    if (!('Notification' in window) || this.permission !== 'granted') return;
    const now = new Date();
    const target = new Date();
    target.setHours(18, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;

    this.scheduleLocal(
      'Your Bellepros missions await! 🍗',
      'Daily missions reset. Earn Piri Coins and unlock new characters!',
      delay
    );
  }

  sendFriendChallenge(friendName, score) {
    this.scheduleLocal(
      `${friendName} challenged you! 🏆`,
      `They scored ${Utils.formatNumber(score)}. Beat it to make them buy you Bellepros!`,
      500
    );
  }
}

const Notifications = new NotificationsSystem();
const Geofencing = new GeofencingSystem();
