import { MonsterGroup } from "../../groups";

export default {
    currentHp: 0,
    name: "Electro Hypostasis",
    group: MonsterGroup.Boss,
    minExp: 20,
    maxExp: 20,
    minWorldLevel: 5,
    image: "https://lh.elara.workers.dev/rpg/bosses/electro_hypostasis.png",
    drops: [
        {
            item: "Witch's Flower of Blaze",
            minAmount: 1,
            maxAmount: 1,
            chance: 100,
        },
    ],

    critChance: 50,
    critValue: 2,
    defChance: 50,
    defValue: 0.25,
    getStatsForWorldLevel(worldLevel: number) {
        const stats = [
            {
                worldLevel: 5,
                minHp: 300,
                maxHp: 300,
                minDamage: 10,
                maxDamage: 18,
            },
        ];
        return stats.find((stat) => stat.worldLevel === worldLevel) || null;
    },
};
