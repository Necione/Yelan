import { MonsterGroup } from "../../monsterHelper";

export default {
    startingHp: 0,
    name: "Electro Hypostasis",
    group: MonsterGroup.Boss,
    minExp: 20,
    maxExp: 20,
    minadventurerank: 5,
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
    getStatsForadventureRank(adventureRank: number) {
        const stats = [
            {
                adventureRank: 5,
                minHp: 300,
                maxHp: 300,
                minDamage: 10,
                maxDamage: 18,
            },
        ];
        return (
            stats.find((stat) => stat.adventureRank === adventureRank) || null
        );
    },
};
