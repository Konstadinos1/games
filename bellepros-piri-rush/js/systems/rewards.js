'use strict';

class RewardsSystem {
  constructor() {
    this.redemptions = Utils.loadState('redemptions', []);
    this.activeRedemption = null;
  }

  canAfford(rewardId) {
    const reward = CONFIG.REWARDS.find(r => r.id === rewardId);
    return reward && Progression.coins >= reward.cost;
  }

  redeem(rewardId) {
    const reward = CONFIG.REWARDS.find(r => r.id === rewardId);
    if (!reward) return null;
    if (!Progression.spendCoins(reward.cost)) return null;

    const code = Utils.generateCode('BP' + rewardId.toUpperCase().slice(0, 3), 6);
    const redemption = {
      id: Date.now().toString(),
      rewardId,
      rewardName: reward.name,
      rewardEmoji: reward.emoji,
      code,
      timestamp: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      used: false,
    };

    this.redemptions.unshift(redemption);
    if (this.redemptions.length > 50) this.redemptions.pop();
    Utils.saveState('redemptions', this.redemptions);
    Analytics.event('reward_redeemed', { rewardId, cost: reward.cost });
    return redemption;
  }

  markUsed(redemptionId) {
    const r = this.redemptions.find(r => r.id === redemptionId);
    if (r) { r.used = true; Utils.saveState('redemptions', this.redemptions); }
  }

  getActive() {
    const now = Date.now();
    return this.redemptions.filter(r => !r.used && r.expiresAt > now);
  }

  getExpired() {
    const now = Date.now();
    return this.redemptions.filter(r => r.expiresAt <= now && !r.used);
  }

  // Generate QR code data URL for in-store redemption
  generateQRDisplay(redemption) {
    // Returns structured data for QR rendering (actual QR generation uses qrcode.js or similar)
    return {
      code: redemption.code,
      displayText: `${redemption.rewardEmoji} ${redemption.rewardName}`,
      barcode: redemption.code.replace(/-/g, ''),
      expiresText: new Date(redemption.expiresAt).toLocaleDateString('fr-CA'),
      instructions: 'Montrez ce code au comptoir Bellepros'
    };
  }

  // Loser pays mechanic - generate discount code for challenge loser
  generateLoserDiscount() {
    const code = Utils.generateCode('LOSER', 6);
    const redemption = {
      id: Date.now().toString(),
      rewardId: 'disc_10',
      rewardName: '10% Off (Challenge Loss 😂)',
      rewardEmoji: '😂',
      code,
      timestamp: Date.now(),
      expiresAt: Date.now() + 48 * 60 * 60 * 1000,
      used: false,
      isLoserDiscount: true
    };
    this.redemptions.unshift(redemption);
    Utils.saveState('redemptions', this.redemptions);
    return redemption;
  }
}

const Rewards = new RewardsSystem();
