'use strict';

// IAP SKUs — replace with real App Store / Google Play product IDs
const IAP_PRODUCTS = {
  SPICY_PASS_MONTHLY: {
    id: 'com.bellepros.piri_rush.spicy_pass_monthly',
    name: 'Spicy Pass',
    price: '$2.99',
    priceCents: 299,
    period: 'month',
    perks: ['Daily 25 bonus Piri Coins', 'Exclusive Spicy Pass Chef skin', '2x XP on all runs', 'Ad-free experience', 'Monthly secret reward'],
    emoji: '🌶️',
  },
  COINS_SMALL: { id: 'com.bellepros.piri_rush.coins_small',  name: '100 Piri Coins',  price: '$1.99', priceCents: 199, coins: 100,  emoji: '🟡' },
  COINS_MEDIUM: { id: 'com.bellepros.piri_rush.coins_medium', name: '300 Piri Coins',  price: '$4.99', priceCents: 499, coins: 300,  emoji: '🟠' },
  COINS_LARGE:  { id: 'com.bellepros.piri_rush.coins_large',  name: '700 Piri Coins',  price: '$9.99', priceCents: 999, coins: 700,  emoji: '🔴' },
  SKIN_PACK_1:  { id: 'com.bellepros.piri_rush.skin_pack_1',  name: 'Piri Fire Bundle', price: '$4.99', priceCents: 499, chars: ['fire_dancer', 'dragon_chef'], emoji: '🔥' },
  SKIN_PACK_2:  { id: 'com.bellepros.piri_rush.skin_pack_2',  name: 'Royal Bundle',    price: '$4.99', priceCents: 499, chars: ['piri_prncs', 'mtl_mayor'],   emoji: '👑' },
  STICKER_PACK: { id: 'com.bellepros.piri_rush.stickers',     name: 'Sticker Pack',    price: '$0.99', priceCents: 99,  stickers: true, emoji: '😄' },
  GIFT_COINS_S: { id: 'com.bellepros.piri_rush.gift_s',       name: 'Gift 100 Coins',  price: '$1.99', priceCents: 199, gift: true, coins: 100 },
  GIFT_COINS_L: { id: 'com.bellepros.piri_rush.gift_l',       name: 'Gift 500 Coins',  price: '$9.99', priceCents: 999, gift: true, coins: 500 },
};

class MonetizationSystem {
  constructor() {
    this.hasSpicyPass = Utils.loadState('spicyPass', false);
    this.spicyPassExpiry = Utils.loadState('spicyPassExpiry', 0);
    this.adWatchCount = Utils.loadState('adWatchCount', 0);
    this.lastInterstitialTime = 0;
    this.runsThisSession = 0;
    this._iapAvailable = false;
    this._storeReady = false;
    this._pendingRevive = null;

    this._checkPassExpiry();
  }

  _checkPassExpiry() {
    if (this.hasSpicyPass && Date.now() > this.spicyPassExpiry) {
      this.hasSpicyPass = false;
      Utils.saveState('spicyPass', false);
    }
  }

  isAdFree() { return this.hasSpicyPass; }
  get2xXP()  { return this.hasSpicyPass; }

  // ── In-App Purchases ──

  async initStore() {
    // In production: initialize Unity IAP or StoreKit/Google Play Billing
    // Here we simulate store availability
    this._storeReady = true;
    console.log('[IAP] Store initialized (test mode)');
  }

  async purchase(productId, options = {}) {
    if (!this._storeReady) { await this.initStore(); }

    const product = Object.values(IAP_PRODUCTS).find(p => p.id === productId);
    if (!product) return { success: false, error: 'Product not found' };

    Analytics.event('iap_initiated', { productId, price: product.priceCents });

    // Production: trigger native payment sheet
    // Test mode: simulate purchase after short delay
    const result = await this._simulatePurchase(product);

    if (result.success) {
      this._grantProduct(product, options);
      Analytics.event('iap_success', { productId, revenue: product.priceCents });
    } else {
      Analytics.event('iap_cancelled', { productId });
    }

    return result;
  }

  _simulatePurchase(product) {
    return new Promise((resolve) => {
      // Show mock payment confirmation
      if (confirm(`[TEST MODE]\nPurchase "${product.name}" for ${product.price}?\n\nIn production this opens App Store / Google Play.`)) {
        resolve({ success: true, transactionId: 'test_' + Date.now() });
      } else {
        resolve({ success: false, cancelled: true });
      }
    });
  }

  _grantProduct(product, options) {
    if (product.id === IAP_PRODUCTS.SPICY_PASS_MONTHLY.id) {
      this.hasSpicyPass = true;
      this.spicyPassExpiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
      Utils.saveState('spicyPass', true);
      Utils.saveState('spicyPassExpiry', this.spicyPassExpiry);
      Progression.addCoins(25);
    } else if (product.coins) {
      if (options.giftTo) {
        // Gift flow — in production, calls backend to credit friend account
        console.log('[Gift]', product.coins, 'coins gifted to', options.giftTo);
      } else {
        Progression.addCoins(product.coins);
      }
    } else if (product.chars) {
      product.chars.forEach(charId => {
        if (!Progression.isCharUnlocked(charId)) Progression.unlockedChars.push(charId);
      });
      Progression._save();
    } else if (product.stickers) {
      Utils.saveState('stickers_unlocked', true);
    }

    Audio.play('level_up');
  }

  async restorePurchases() {
    // Production: calls StoreKit.restoreTransactions() or Google Play restorePurchases()
    console.log('[IAP] Restoring purchases...');
    return { restored: 0 };
  }

  // ── Rewarded Video Ads ──

  canShowRewardedAd() {
    return !this.isAdFree();
  }

  async showRewardedAd(rewardType) {
    if (!this.canShowRewardedAd()) return { watched: false, reason: 'ad_free' };

    Analytics.event('rewarded_ad_shown', { rewardType });

    // Production: show ironSource/AppLovin MAX rewarded video
    // Test mode: auto-complete after simulated watch
    const watched = await this._simulateRewardedAd();

    if (watched) {
      this.adWatchCount++;
      Utils.saveState('adWatchCount', this.adWatchCount);
      Analytics.event('rewarded_ad_completed', { rewardType });
      return { watched: true, reward: this._getAdReward(rewardType) };
    }

    Analytics.event('rewarded_ad_skipped', { rewardType });
    return { watched: false };
  }

  _simulateRewardedAd() {
    return new Promise(resolve => {
      // Simulate 15-second ad with a confirm dialog in test mode
      resolve(confirm('[TEST MODE] Simulate watching a 15s rewarded ad?\n\n(In production: real video ad plays here)'));
    });
  }

  _getAdReward(type) {
    switch (type) {
      case 'revive':      return { type: 'revive', description: 'Extra life!' };
      case 'coins':       return { type: 'coins', amount: 15, description: '+15 Piri Coins' };
      case 'score_boost': return { type: 'multiplier', value: 2, duration: 30000, description: '2x score for 30s' };
      default:            return { type: 'coins', amount: 10, description: '+10 Piri Coins' };
    }
  }

  grantAdReward(reward) {
    switch (reward.type) {
      case 'coins':      Progression.addCoins(reward.amount); break;
      case 'multiplier': return reward; // Game handles this
    }
    return reward;
  }

  // ── Interstitial Ads ──

  shouldShowInterstitial() {
    if (this.isAdFree()) return false;
    this.runsThisSession++;
    // Show every 3rd run, skippable after 5s
    if (this.runsThisSession % 3 === 0) {
      const now = Date.now();
      if (now - this.lastInterstitialTime > 60000) {
        this.lastInterstitialTime = now;
        return true;
      }
    }
    return false;
  }

  async showInterstitial() {
    // Production: ironSource/AppLovin interstitial
    Analytics.event('interstitial_shown', { run: this.runsThisSession });
    await new Promise(r => setTimeout(r, 300)); // Brief delay
    return true;
  }

  // ── Sponsored Challenges ──

  getSponsoredChallenge() {
    const sponsors = [
      { brand: 'Red Bull Montréal', challenge: 'Reach a 10x streak without missing', reward: '20% off Bellepros + Red Bull', emoji: '🐂' },
      { brand: 'Koodo Mobile',      challenge: 'Catch 100 chickens this week',       reward: 'Data bonus + free side',      emoji: '📱' },
      { brand: 'Montreal Pride',    challenge: 'Play 5 runs on Pride weekend',        reward: 'Pride sticker pack',          emoji: '🌈' },
    ];
    const dayOfWeek = new Date().getDay();
    return sponsors[dayOfWeek % sponsors.length];
  }

  getSpicyPassStatus() {
    return {
      active: this.hasSpicyPass,
      expiry: this.hasSpicyPass ? new Date(this.spicyPassExpiry).toLocaleDateString('fr-CA') : null,
      product: IAP_PRODUCTS.SPICY_PASS_MONTHLY,
    };
  }

  getProducts() { return IAP_PRODUCTS; }
}

const Monetization = new MonetizationSystem();
