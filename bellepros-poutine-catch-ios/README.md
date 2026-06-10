# Bellepro's Poutine Catch — iOS (SwiftUI + SpriteKit)

Native iOS port of the web game (`../bellepros-poutine-catch/`).
**SpriteKit** owns the field of play (60 fps loop, falling items, tray, collisions,
particles); **SwiftUI** owns everything around it (menus, HUD, modals). A single
`GameViewModel` (`ObservableObject`) is the source of truth both sides share.

## Requirements
- Xcode 15+ · iOS 16+ · Swift 5.9

## Create the Xcode project (one-time)
1. **File ▸ New ▸ Project… ▸ iOS ▸ App**
   - Product Name: **BelleprosPoutineCatch**
   - Interface: **SwiftUI** · Language: **Swift**
2. Delete the auto-generated `ContentView.swift` (it arrives in Step 6).
3. Drag the `BelleprosPoutineCatch/` folder groups below into the project
   (**Copy items if needed**, **Create groups**).
4. Target settings checklist:
   - **Display Name:** `Pluie de Poutine`
   - **Deployment:** iOS 16.0
   - **Orientation:** Portrait only
   - **Localizations:** add **French (fr)** + **English (en)** (wired in Step 2)
   - **App Icon / Launch Screen / Asset Catalog:** added in Step 9 (logo + storefront)

## Project structure
```
BelleprosPoutineCatch/
├── App/
│   └── GameConfig.swift          # all gameplay tunables (ported constants)
├── Models/
│   ├── Localization.swift        # AppLanguage + LocalizedText (bilingual string)
│   ├── ItemType.swift            # falling items + weighted spawn (the ITEM table)
│   ├── RewardTier.swift          # 100/250/500 coupon milestones (REWARD_TIERS)
│   └── Coupon.swift              # BP-LVL-XXXXXX code generation
├── State/
│   ├── GamePhase.swift           # the finite state machine enum
│   └── GameViewModel.swift       # source of truth: run state + transitions
└── Services/
    └── StorageService.swift      # UserDefaults (best, streak, redeemed) — bp_pc_* keys
```

## What Step 1 delivers (this commit)
The **foundation layer** — pure logic, no UI and no SpriteKit yet. It compiles as a
self-contained set of types that everything else plugs into:
- the `GamePhase` state machine and the `GameViewModel` that drives it,
- the data models (items, reward tiers, coupons),
- `GameConfig` (every tunable in one place),
- `StorageService` (best score, daily-streak bonus, redeemed-coupon cache) — using the
  same `bp_pc_*` keys as the web build, so a player's history is consistent in spirit.

> The app has no runnable screen until Step 3 (scene) / Step 6 (root view). Step 1 is
> the engine block, not the car.

## Build ladder
| Step | Scope |
|------|-------|
| **1 ✅** | Foundation: project structure, `GameConfig`, models, `StorageService`, `GameViewModel` |
| **2 ✅** | `AudioManager` (procedural SFX) + `Haptics` + `L10n` + `Localizable.strings` (fr/en) |
| 3 | `GameScene` skeleton + `TrayNode` + touch input |
| 4 | `Spawner` + `ItemNode` pool + difficulty ramp |
| 5 | `CatchSystem`: catch/miss, scoring, combo, lives, grace |
| 6 | `RootView` (SpriteView + overlays) + `HUDView` |
| 7 | Menu / Pause / GameOver views |
| 8 | Coupon view + `QRGenerator` + `CouponService` (Supabase) + `ShareService` |
| 9 | Polish: storefront backdrop, particles, screen shake, haptics, icon, launch screen |

Say **“Build Step 3”** to continue.
