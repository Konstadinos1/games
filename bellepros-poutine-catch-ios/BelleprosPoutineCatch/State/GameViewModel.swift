import Foundation
import Combine

/// The single source of truth shared by SwiftUI and the SpriteKit scene.
///
/// - SwiftUI **observes** `@Published` state and **commands** transitions
///   (`startRun`, `pause`, `resume`, …).
/// - The scene **reads** `phase` to gate its loop and **reports** gameplay events
///   through the `record*` hooks (wired in Steps 4–5).
///
/// It is the only writer of `phase`, so there is no dual-source drift between
/// the UIKit/SpriteKit world and SwiftUI.
@MainActor
final class GameViewModel: ObservableObject {

    // MARK: Run state (scene reports into these)
    @Published private(set) var phase: GamePhase = .mainMenu
    @Published private(set) var score = 0
    @Published private(set) var lives = GameConfig.startLives
    @Published private(set) var maxLives = GameConfig.startLives
    @Published private(set) var combo = 0
    @Published private(set) var multiplier = 1
    @Published private(set) var rewardsClaimed = 0

    // MARK: Meta / persistent
    @Published private(set) var best = 0
    @Published private(set) var streak = 0
    @Published private(set) var dailyBonusActive = false
    @Published var language: AppLanguage { didSet { store.language = language } }
    @Published var isMuted: Bool { didSet { store.isMuted = isMuted } }

    // MARK: Active coupon (valid while phase == .rewardUnlocked)
    @Published private(set) var activeCoupon: Coupon?

    private let store: StorageService

    init(store: StorageService = .shared) {
        self.store = store
        self.best = store.best
        self.language = store.language
        self.isMuted = store.isMuted
        self.streak = store.refreshStreak()
    }

    // MARK: - Top-level transitions

    /// Begin a run from the menu. Applies the daily-streak bonus life.
    func startRun() {
        dailyBonusActive = store.dailyBonusAvailable
        if dailyBonusActive { store.consumeDailyBonus() }
        maxLives = GameConfig.startLives + (dailyBonusActive ? GameConfig.dailyBonusLife : 0)

        score = 0
        lives = maxLives
        combo = 0
        multiplier = 1
        rewardsClaimed = 0
        activeCoupon = nil
        phase = .playing
    }

    func pause()  { if phase.isPlaying { phase = .paused } }
    func resume() { if phase == .paused { phase = .playing } }
    func togglePause() { phase.isPlaying ? pause() : resume() }

    func goToMenu()        { phase = .mainMenu }
    func showHighScores()  { phase = .highScores }

    // MARK: - Gameplay events (called by the scene's CatchSystem, Step 5)

    /// A good item was caught. Returns the points awarded (for the floating score).
    @discardableResult
    func recordCatch(_ item: ItemType) -> Int {
        combo += 1
        multiplier = min(GameConfig.maxMultiplier, 1 + combo / GameConfig.comboPerMultiplier)
        let gained = item.points * multiplier
        score += gained
        evaluateRewards()
        return gained
    }

    /// A hazard (rain) was caught → break the combo and lose a life.
    func recordHazard() {
        resetCombo()
        loseLife()
    }

    /// A good item fell past the miss line → break the combo only.
    func recordMiss() { resetCombo() }

    func loseLife() {
        lives = max(0, lives - 1)
        if lives == 0 { endRun() }
    }

    private func resetCombo() { combo = 0; multiplier = 1 }

    // MARK: - Rewards / coupon

    private func evaluateRewards() {
        guard rewardsClaimed < RewardTier.all.count else { return }
        let next = RewardTier.all[rewardsClaimed]
        if score >= next.threshold {
            rewardsClaimed += 1
            activeCoupon = Coupon.make(for: next)
            phase = .rewardUnlocked(tier: next)
        }
    }

    func continueAfterReward() {
        if case .rewardUnlocked = phase { phase = .playing }
    }

    /// The next reward still to earn (drives the HUD progress bar), or nil if all claimed.
    var nextReward: RewardTier? {
        rewardsClaimed < RewardTier.all.count ? RewardTier.all[rewardsClaimed] : nil
    }

    // MARK: - Game over / revive

    private func endRun() {
        let isBest = score > best
        if isBest {
            best = score
            store.best = score
        }
        phase = .gameOver(score: score, isBest: isBest)
    }

    func beginAdRevive() { phase = .adRevive }

    /// Ad finished → restore lives and drop back into play.
    func grantRevive() {
        lives = maxLives
        resetCombo()
        phase = .playing
    }

    // MARK: - Settings
    func toggleLanguage() { language = language.toggled }
    func toggleMute()     { isMuted.toggle() }
}
