import Foundation

/// `UserDefaults`-backed persistence. Keys deliberately match the web build
/// (`bp_pc_*`) so behaviour — best score, daily streak, redeemed cache — ports 1:1.
final class StorageService {

    static let shared = StorageService()
    private let defaults: UserDefaults
    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    private enum Key {
        static let best     = "bp_pc_best"
        static let lang     = "bp_pc_lang"
        static let muted    = "bp_pc_muted"
        static let streak   = "bp_pc_streak"
        static let lastDay  = "bp_pc_lastday"
        static let bonusDay = "bp_pc_bonusday"
        static let redeemed = "bp_pc_redeemed"
    }

    // MARK: - Best score
    var best: Int {
        get { defaults.integer(forKey: Key.best) }
        set { defaults.set(max(newValue, best), forKey: Key.best) }
    }

    // MARK: - Language / sound
    var language: AppLanguage {
        get { AppLanguage(rawValue: defaults.string(forKey: Key.lang) ?? "") ?? .deviceDefault }
        set { defaults.set(newValue.rawValue, forKey: Key.lang) }
    }
    var isMuted: Bool {
        get { defaults.bool(forKey: Key.muted) }
        set { defaults.set(newValue, forKey: Key.muted) }
    }

    // MARK: - Redeemed-coupon cache (offline mirror of the server registry)
    func isRedeemed(_ code: String) -> Bool { redeemedCodes().contains(code) }
    func markRedeemed(_ code: String) {
        var codes = redeemedCodes()
        codes.insert(code)
        defaults.set(Array(codes), forKey: Key.redeemed)
    }
    private func redeemedCodes() -> Set<String> {
        Set(defaults.stringArray(forKey: Key.redeemed) ?? [])
    }

    // MARK: - Daily streak (ports the web `Daily` module)
    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()
    private func dayString(_ date: Date) -> String { Self.dayFormatter.string(from: date) }
    private var today: String { dayString(Date()) }
    private var yesterday: String { dayString(Date().addingTimeInterval(-86_400)) }

    var streak: Int { max(0, defaults.integer(forKey: Key.streak)) }

    /// Roll the streak over once per launch. Returns the streak after refresh.
    @discardableResult
    func refreshStreak() -> Int {
        let last = defaults.string(forKey: Key.lastDay) ?? ""
        if last != today {
            let rolled = (last == yesterday) ? streak + 1 : 1
            defaults.set(rolled, forKey: Key.streak)
            defaults.set(today, forKey: Key.lastDay)
        }
        return max(1, streak)
    }

    /// A +1-life bonus is offered on the first run of a returning day (streak ≥ 2).
    var dailyBonusAvailable: Bool {
        streak >= 2 && (defaults.string(forKey: Key.bonusDay) ?? "") != today
    }
    func consumeDailyBonus() { defaults.set(today, forKey: Key.bonusDay) }
}
