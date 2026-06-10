import UIKit

/// Thin wrapper over `UIFeedbackGenerator`, mapping to the web build's `vibrate()`
/// calls. Generators are retained + prepared so the taps fire with low latency.
/// All calls are main-thread only (UIKit requirement).
@MainActor
enum Haptics {
    private static let impactLight  = UIImpactFeedbackGenerator(style: .light)
    private static let impactMedium = UIImpactFeedbackGenerator(style: .medium)
    private static let impactHeavy  = UIImpactFeedbackGenerator(style: .heavy)
    private static let notify       = UINotificationFeedbackGenerator()

    /// Call on screen appear / run start to minimise first-tap latency.
    static func prepare() {
        impactLight.prepare(); impactMedium.prepare(); impactHeavy.prepare(); notify.prepare()
    }

    static func tap()     { impactLight.impactOccurred() }          // good catch
    static func bump()    { impactMedium.impactOccurred() }          // UI press
    static func thud()    { impactHeavy.impactOccurred() }           // game over
    static func success() { notify.notificationOccurred(.success) }  // reward unlocked
    static func warning() { notify.notificationOccurred(.warning) }  // hazard / life lost
}
