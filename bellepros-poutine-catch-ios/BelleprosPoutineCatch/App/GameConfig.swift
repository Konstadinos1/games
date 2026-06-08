import CoreGraphics
import Foundation

/// Single source of truth for gameplay numbers, ported from the web build's
/// top-of-file constants. The SpriteKit scene is authored in this design space
/// and scaled to fit the device.
enum GameConfig {

    // Design-space canvas (points). Mirrors DESIGN_W / DESIGN_H.
    static let designSize = CGSize(width: 414, height: 736)

    // Vertical reference lines, measured from the TOP in design space
    // (kept identical to the web build so the feel ports 1:1).
    static let counterY: CGFloat = 568              // top of the counter / tray rail
    static let catchY:   CGFloat = counterY - 14    // catch a good item above this line  (CATCH_Y)
    static let missY:    CGFloat = counterY + 46    // below this a good item is "missed"  (MISS_Y)

    // Lives
    static let startLives    = 3                    // START_LIVES
    static let dailyBonusLife = 1                   // +1 on the first run of a returning day

    // Tray
    static let trayHalfWidth: CGFloat = 52          // half the catch width
    static let trayY:         CGFloat = counterY - 6
    static let trayFollow:    CGFloat = 18          // lerp factor; higher = snappier follow

    // Spawning + difficulty ramp (tunable; matches the web pacing)
    static let firstSpawnDelay:    TimeInterval = 0.4
    static let spawnIntervalStart: TimeInterval = 0.95
    static let spawnIntervalMin:   TimeInterval = 0.42
    static let rampDuration:       TimeInterval = 75   // seconds to reach the hardest pacing

    // Fall speed (design points / second), ramped over rampDuration.
    static let fallSpeedStart: CGFloat = 250
    static let fallSpeedMax:   CGFloat = 560

    // Grace windows — misses are ignored briefly after start / revive.
    static let graceStart:  TimeInterval = 0.6
    static let graceRevive: TimeInterval = 1.2

    // Scoring
    static let basePoints        = 10               // before combo multiplier
    static let maxMultiplier     = 5                // 5x BELLEPROS!
    static let comboPerMultiplier = 4               // combo hits to step the multiplier
}
