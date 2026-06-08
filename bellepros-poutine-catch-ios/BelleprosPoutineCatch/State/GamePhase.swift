import Foundation

/// The app-wide finite state machine. SwiftUI switches top-level screens on this;
/// the SpriteKit scene reads it to gate `update(_:)` and toggle `isPaused`.
/// Mirrors the web build's `game.state` ('menu','playing','paused','coupon',
/// 'gameover','ad').
enum GamePhase: Equatable {
    case mainMenu
    case playing
    case paused
    case rewardUnlocked(tier: RewardTier)   // the coupon modal
    case adRevive
    case gameOver(score: Int, isBest: Bool)
    case highScores

    /// Only `.playing` advances the gameplay loop.
    var isPlaying: Bool {
        if case .playing = self { return true }
        return false
    }

    /// The SpriteKit scene halts (isPaused / early-return) for every non-playing phase.
    var blocksGameLoop: Bool { !isPlaying }

    /// Phases rendered as a full-screen SwiftUI overlay above the scene.
    var presentsOverlay: Bool {
        switch self {
        case .playing: return false
        default:       return true
        }
    }
}
