import Foundation

/// A falling object. Good items score points; the hazard (rain) penalises a
/// catch. Mirrors the web build's `ITEM` table / menu legend.
struct ItemType: Identifiable, Hashable {
    let id: String
    let assetName: String      // Asset Catalog image (added in Step 9)
    let emoji: String          // placeholder render until art is wired
    let isHazard: Bool         // rain drop → lose a life if caught
    let points: Int            // base points if good (before combo multiplier)
    let spawnWeight: Double     // relative spawn frequency

    /// The five legend items: Frites, Sauce brune, Fromage squic-squic,
    /// Poutine maison, Goutte de pluie (hazard).
    static let catalog: [ItemType] = [
        ItemType(id: "fries",   assetName: "item_fries",   emoji: "🍟", isHazard: false, points: 10, spawnWeight: 1.00),
        ItemType(id: "gravy",   assetName: "item_gravy",   emoji: "🥣", isHazard: false, points: 10, spawnWeight: 1.00),
        ItemType(id: "cheese",  assetName: "item_cheese",  emoji: "🧀", isHazard: false, points: 12, spawnWeight: 0.90),
        ItemType(id: "poutine", assetName: "item_poutine", emoji: "🍛", isHazard: false, points: 18, spawnWeight: 0.55),
        ItemType(id: "rain",    assetName: "item_rain",    emoji: "💧", isHazard: true,  points: 0,  spawnWeight: 0.80),
    ]

    static let goodItems = catalog.filter { !$0.isHazard }
    static let hazards   = catalog.filter {  $0.isHazard }

    /// Weighted random pick across the whole catalog (Spawner uses this in Step 4).
    static func weightedRandom() -> ItemType {
        let total = catalog.reduce(0) { $0 + $1.spawnWeight }
        var roll = Double.random(in: 0..<total)
        for item in catalog {
            roll -= item.spawnWeight
            if roll < 0 { return item }
        }
        return catalog[0]
    }
}
