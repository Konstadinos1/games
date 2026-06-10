import Foundation

/// Runtime-switchable localization. Unlike `String(localized:)` (which follows the
/// device locale), this resolves keys from a *chosen* `.lproj` bundle so the in-app
/// FR/EN toggle works regardless of system language — mirroring the web `t()` helper.
///
/// Usage:  `l10n("play")`  ·  `l10n.format("coupon_congrats", ["n": "100"])`
@MainActor
final class L10n: ObservableObject {

    @Published private(set) var language: AppLanguage
    private var bundle: Bundle

    init(language: AppLanguage) {
        self.language = language
        self.bundle = L10n.bundle(for: language)
    }

    func setLanguage(_ language: AppLanguage) {
        guard language != self.language else { return }
        self.language = language
        self.bundle = L10n.bundle(for: language)
    }

    /// Look up a key. Falls back to the key itself if missing (so gaps are visible).
    func callAsFunction(_ key: String) -> String {
        bundle.localizedString(forKey: key, value: key, table: nil)
    }

    /// Look up + substitute `{token}` placeholders, e.g. `{n}`, `{offer}`.
    func format(_ key: String, _ substitutions: [String: String]) -> String {
        substitutions.reduce(callAsFunction(key)) { acc, pair in
            acc.replacingOccurrences(of: "{\(pair.key)}", with: pair.value)
        }
    }

    private static func bundle(for language: AppLanguage) -> Bundle {
        guard let path = Bundle.main.path(forResource: language.rawValue, ofType: "lproj"),
              let bundle = Bundle(path: path) else {
            return .main
        }
        return bundle
    }
}
