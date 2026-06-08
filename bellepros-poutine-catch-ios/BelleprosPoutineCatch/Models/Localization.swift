import Foundation

/// Supported UI languages. Step 2 wires these to `Localizable.strings`;
/// for now `LocalizedText` carries both strings inline (as the web `I18N` dict did).
enum AppLanguage: String, CaseIterable, Codable {
    case fr
    case en

    /// First launch: follow the device, defaulting to FR for Québec parity.
    static var deviceDefault: AppLanguage {
        (Locale.preferredLanguages.first?.hasPrefix("fr") ?? false) ? .fr : .en
    }

    var toggled: AppLanguage { self == .fr ? .en : .fr }
    var buttonLabel: String { self == .fr ? "EN" : "FR" }
}

/// A bilingual string. Mirrors the `{fr, en}` records in the web build.
struct LocalizedText: Hashable, Codable {
    let fr: String
    let en: String
    func value(_ lang: AppLanguage) -> String { lang == .fr ? fr : en }
}
