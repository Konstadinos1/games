import Foundation

/// A score milestone that unlocks a real in-store coupon. Mirrors `REWARD_TIERS`.
struct RewardTier: Identifiable, Hashable {
    let id: Int            // == threshold
    let threshold: Int
    let title: LocalizedText
    let sub: LocalizedText
    let short: LocalizedText

    static let all: [RewardTier] = [
        RewardTier(id: 100, threshold: 100,
                   title: LocalizedText(fr: "DOUBLE FROMAGE GRATUIT", en: "FREE DOUBLE CHEESE"),
                   sub:   LocalizedText(fr: "à l'achat d'un combo",   en: "with any combo"),
                   short: LocalizedText(fr: "Double fromage",        en: "Double cheese")),
        RewardTier(id: 250, threshold: 250,
                   title: LocalizedText(fr: "POUTINE CLASSIQUE GRATUITE", en: "FREE CLASSIC POUTINE"),
                   sub:   LocalizedText(fr: "à l'achat d'un combo",       en: "with any combo"),
                   short: LocalizedText(fr: "Poutine",                    en: "Poutine")),
        RewardTier(id: 500, threshold: 500,
                   title: LocalizedText(fr: "COMBO POUTINE GRATUIT", en: "FREE POUTINE COMBO"),
                   sub:   LocalizedText(fr: "poutine + liqueur",     en: "poutine + soft drink"),
                   short: LocalizedText(fr: "Combo",                 en: "Combo")),
    ]
}
