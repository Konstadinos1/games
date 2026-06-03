'use strict';

const CONFIG = {
  VERSION: '1.0.0',
  CANVAS_WIDTH: 390,
  CANVAS_HEIGHT: 844,

  PLAYER: {
    X: 90,
    GROUND_Y: 665,
    WIDTH: 44,
    HEIGHT: 76,
    JUMP_FORCE: -21,
    GRAVITY: 1.1,
    SLIDE_DURATION: 500,
    INVINCIBLE_DURATION: 1800,
    START_LIVES: 3,
  },

  CHICKEN_TYPES: {
    COMMON: {
      id: 'COMMON', name: 'Classic Burger', coins: 1, score: 100,
      glowColor: 'rgba(255,255,255,0.3)', weight: 60, size: 38, xpBonus: 5,
      hue: null
    },
    RARE: {
      id: 'RARE', name: 'Piri Hot Dog', coins: 5, score: 500,
      glowColor: 'rgba(255,215,0,0.6)', weight: 25, size: 44, xpBonus: 15,
      hue: 50
    },
    EPIC: {
      id: 'EPIC', name: 'Smoked Poutine', coins: 10, score: 1000,
      glowColor: 'rgba(255,80,20,0.7)', weight: 12, size: 50, xpBonus: 30,
      hue: 20
    },
    LEGENDARY: {
      id: 'LEGENDARY', name: 'Bellepros Chicken', coins: 25, score: 2500,
      glowColor: 'rgba(180,80,255,0.8)', weight: 3, size: 58, xpBonus: 75,
      hue: 290
    }
  },

  STREAK_LEVELS: [
    { at: 0,  multiplier: 1,  label: '' },
    { at: 3,  multiplier: 2,  label: '2x SPICY!' },
    { at: 6,  multiplier: 3,  label: '3x HOT!' },
    { at: 10, multiplier: 5,  label: '5x INFERNO!' },
    { at: 20, multiplier: 10, label: '10x BELLEPROS MODE!' }
  ],

  SPAWN: {
    CHICKEN_MIN: 1100,
    CHICKEN_MAX: 2400,
    OBSTACLE_MIN: 1700,
    OBSTACLE_MAX: 3200,
  },

  SPEED: {
    INITIAL: 4.5,
    MAX: 15,
    INCREMENT_PER_SECOND: 0.04,
  },

  OBSTACLE_TYPES: {
    CONE: {
      id: 'CONE', label: 'Pylon',
      width: 34, height: 52,
      canJump: true, canSlide: false, isGround: false,
      groundY: 0, // relative to player ground
    },
    CAR: {
      id: 'CAR', label: 'Car',
      width: 110, height: 52,
      canJump: false, canSlide: true, isGround: false,
      groundY: 0,
    },
    STM_BUS: {
      id: 'STM_BUS', label: 'STM Bus',
      width: 168, height: 72,
      canJump: false, canSlide: true, isGround: false,
      groundY: 0,
    },
    POTHOLE: {
      id: 'POTHOLE', label: 'Pothole',
      width: 64, height: 18,
      canJump: true, canSlide: false, isGround: true,
      groundY: 12,
    },
    BARRIER: {
      id: 'BARRIER', label: 'Barrier',
      width: 84, height: 58,
      canJump: true, canSlide: false, isGround: false,
      groundY: 0,
    }
  },

  CHARACTERS: [
    { id: 'classic',    name: 'Classic Chef',         emoji: '👨‍🍳', bodyColor: '#E8192C', hatColor: '#FFFFFF', unlockLevel: 1,   bio: 'The original Bellepros hero' },
    { id: 'piri_prncs', name: 'Piri-Piri Princess',  emoji: '👸',   bodyColor: '#FF69B4', hatColor: '#FF1493', unlockLevel: 5,   bio: 'Royally spicy' },
    { id: 'smk_samurai',name: 'Smoked Meat Samurai',  emoji: '⚔️',  bodyColor: '#8B4513', hatColor: '#3D0C02', unlockLevel: 10,  bio: 'Montreal deli warrior' },
    { id: 'ptn_knight', name: 'Poutine Knight',       emoji: '🛡️',  bodyColor: '#8B6914', hatColor: '#5C4011', unlockLevel: 15,  bio: 'Guardian of the gravy' },
    { id: 'roti_rider', name: 'Rotisserie Rider',     emoji: '🏍️',  bodyColor: '#2C3E50', hatColor: '#1A252F', unlockLevel: 20,  bio: 'Speed delivery legend' },
    { id: 'spice_sorc', name: 'Spice Sorcerer',       emoji: '🧙',   bodyColor: '#8E44AD', hatColor: '#5B2C6F', unlockLevel: 25,  bio: 'Magic heat wielder' },
    { id: 'port_pirate',name: 'Portuguese Pirate',    emoji: '🏴‍☠️',bodyColor: '#2C3E50', hatColor: '#17202A', unlockLevel: 30,  bio: 'Sails the spice trade' },
    { id: 'ndg_ninja',  name: 'NDG Ninja',             emoji: '🥷',   bodyColor: '#1C2833', hatColor: '#0D1117', unlockLevel: 35,  bio: 'Notre-Dame-de-Grâce style' },
    { id: 'plat_punk',  name: 'Plateau Punk',          emoji: '🤘',   bodyColor: '#E74C3C', hatColor: '#000000', unlockLevel: 40,  bio: 'Plateau-Mont-Royal rebel' },
    { id: 'fire_dancer',name: 'Piri Fire Dancer',      emoji: '💃',   bodyColor: '#E74C3C', hatColor: '#C0392B', unlockLevel: 45,  bio: 'Olé! Heat in motion' },
    { id: 'gold_chef',  name: 'Golden Chef',           emoji: '🥇',   bodyColor: '#F1C40F', hatColor: '#D4AC0D', unlockLevel: 50,  bio: '50 levels of pure gold' },
    { id: 'mtl_mayor',  name: 'Montreal Mayor',        emoji: '🎩',   bodyColor: '#2C3E50', hatColor: '#17202A', unlockLevel: 55,  bio: 'Vote Bellepros 2026' },
    { id: 'crypto_chef',name: 'Crypto Chef',           emoji: '💎',   bodyColor: '#3498DB', hatColor: '#1F618D', unlockLevel: 60,  bio: 'HODL the chicken' },
    { id: 'alien_chef', name: 'Alien Chef',            emoji: '👽',   bodyColor: '#1ABC9C', hatColor: '#17A589', unlockLevel: 65,  bio: 'Piri from outer space' },
    { id: 'robot_cook', name: 'Robot Cook',            emoji: '🤖',   bodyColor: '#BDC3C7', hatColor: '#7F8C8D', unlockLevel: 70,  bio: 'AI-seasoned perfection' },
    { id: 'dragon_chef',name: 'Dragon Chef',           emoji: '🐉',   bodyColor: '#C0392B', hatColor: '#7B241C', unlockLevel: 75,  bio: 'Breathes piri sauce' },
    { id: 'uni_chef',   name: 'Unicorn Chef',          emoji: '🦄',   bodyColor: '#FF69B4', hatColor: '#DA70D6', unlockLevel: 80,  bio: 'Magical flavor only' },
    { id: 'ghost_cook', name: 'Ghost Cook',            emoji: '👻',   bodyColor: '#E8E8E8', hatColor: '#BDC3C7', unlockLevel: 85,  bio: 'Haunted kitchen specialist' },
    { id: 'santa_chef', name: 'Santa Chef',            emoji: '🎅',   bodyColor: '#E74C3C', hatColor: '#C0392B', unlockLevel: 90,  bio: 'Ho ho HOT!' },
    { id: 'legend',     name: 'The Legend',            emoji: '🌶️',  bodyColor: '#C0392B', hatColor: '#7B241C', unlockLevel: 100, bio: 'Maximum Bellepros spice' }
  ],

  LOCATIONS: [
    { name: 'Bellepros Verdun',   address: '3826 Wellington, Verdun',           lat: 45.4604, lng: -73.5744 },
    { name: 'Bellepros Plateau',  address: '100 Mont-Royal Ave, Montréal',      lat: 45.5254, lng: -73.5806 },
    { name: 'Bellepros Laval',    address: '2500 Daniel-Johnson, Laval',        lat: 45.5719, lng: -73.6920 },
    { name: 'Bellepros NDG',      address: '6000 Sherbrooke O, Montréal',       lat: 45.4765, lng: -73.6301 },
    { name: 'Bellepros Downtown', address: '1000 Ste-Catherine O, Montréal',    lat: 45.5076, lng: -73.5674 }
  ],
  PIRI_ZONE_RADIUS_M: 500,

  REWARDS: [
    { id: 'drink_up',  name: 'Drink Upgrade',          cost: 30,  emoji: '🥤', desc: 'Upgrade to large',             category: 'food'     },
    { id: 'side',      name: 'Free Side',               cost: 50,  emoji: '🍟', desc: 'Any regular side item',        category: 'food'     },
    { id: 'disc_10',   name: '10% Off Order',           cost: 75,  emoji: '🏷️', desc: '10% off your next order',     category: 'discount' },
    { id: 'disc_20',   name: '20% Off Order',           cost: 130, emoji: '🎫', desc: '20% off your next order',     category: 'discount' },
    { id: 'poutine',   name: 'Free Poutine',            cost: 200, emoji: '🍟', desc: 'Classic Quebec poutine',      category: 'food'     },
    { id: 'quarter',   name: 'Quarter Chicken',         cost: 250, emoji: '🍗', desc: 'Free quarter rotisserie',      category: 'food'     },
    { id: 'secret',    name: 'Secret Menu Item',        cost: 350, emoji: '⭐', desc: 'Exclusive secret menu access', category: 'special'  },
    { id: 'half',      name: 'Half Chicken',            cost: 500, emoji: '🍗', desc: 'Free half rotisserie chicken', category: 'food'     }
  ],

  TIERS: [
    { name: 'Bronze',   minCoins: 0,    color: '#CD7F32', textColor: '#FFF8F0', bonus: 0,    vipCard: false },
    { name: 'Silver',   minCoins: 100,  color: '#C0C0C0', textColor: '#1A1A1A', bonus: 0.05, vipCard: false },
    { name: 'Gold',     minCoins: 500,  color: '#FFD700', textColor: '#1A1A1A', bonus: 0.10, vipCard: true  },
    { name: 'Platinum', minCoins: 2000, color: '#E8E8FF', textColor: '#1A1A1A', bonus: 0.20, vipCard: true  }
  ],

  PROGRESSION: {
    XP_PER_100_SCORE: 1,
    XP_PER_COIN: 2,
    BASE_LEVEL_XP: 150,
    LEVEL_XP_SCALE: 1.07,   // ~200 hrs to level 100 at avg play pace
    MAX_LEVEL: 100
  },

  MISSION_POOL: [
    { id: 'catch_chickens',   label: 'Catch {n} chickens',              targets: [25, 50, 100], xp: [50, 100, 200],   coins: [10, 20,  40]  },
    { id: 'reach_streak',     label: 'Reach a {n}x streak',            targets: [5, 10, 20],   xp: [75, 150, 300],   coins: [15, 30,  60]  },
    { id: 'play_runs',        label: 'Complete {n} runs',               targets: [3, 5, 10],    xp: [30, 60,  120],   coins: [5,  10,  20]  },
    { id: 'score_single',     label: 'Score {n} pts in one run',       targets: [1000, 5000, 15000], xp: [60, 120, 240], coins: [12, 25, 50] },
    { id: 'catch_epic',       label: 'Catch {n} Epic chickens',        targets: [3, 7, 15],    xp: [100, 200, 400],  coins: [20, 40,  80]  },
    { id: 'catch_legendary',  label: 'Catch {n} Legendary chickens',   targets: [1, 3, 5],     xp: [200, 400, 800],  coins: [40, 80,  160] },
    { id: 'no_obstacle_hit',  label: 'Run without hitting an obstacle', targets: [1],           xp: [150],            coins: [30]           },
    { id: 'collect_coins',    label: 'Collect {n} Piri Coins',         targets: [50, 100, 250], xp: [25, 50, 100],   coins: [0,  0,   0]   }
  ],

  COLORS: {
    PRIMARY:  '#E8192C',
    SECONDARY:'#FF6B35',
    ACCENT:   '#FFD700',
    DARK:     '#14080A',
    SUCCESS:  '#27AE60',
    WARNING:  '#F39C12',
    INFO:     '#3498DB',
    WHITE:    '#FFFFFF',
  },
};
