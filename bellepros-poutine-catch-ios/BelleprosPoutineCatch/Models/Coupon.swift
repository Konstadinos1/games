import Foundation

/// A generated, redeemable coupon. The `code` is shown as text + QR and validated
/// against the Supabase registry (CouponService, Step 8). Mirrors `genCouponCode`.
struct Coupon: Identifiable, Hashable {
    let id: String           // the code itself, e.g. "BP-LVL-7K3QF9"
    let tierThreshold: Int
    var redeemed: Bool

    var code: String { id }

    /// "BP-LVL-" + 6 unambiguous chars (no 0/O/1/I), matching the web format.
    static func generateCode() -> String {
        let alphabet = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        let suffix = String((0..<6).map { _ in alphabet.randomElement()! })
        return "BP-LVL-\(suffix)"
    }

    static func make(for tier: RewardTier) -> Coupon {
        Coupon(id: generateCode(), tierThreshold: tier.threshold, redeemed: false)
    }
}
