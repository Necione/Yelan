import { MonsterGroup } from "../../helpers/monsterHelper";

export default {
    startingHp: 0,
    name: "Primo Geovishap",
    group: MonsterGroup.Boss,
    minExp: 75,
    maxExp: 75,
    minadventurerank: 20,
    image: "https://lh.elara.workers.dev/rpg/bosses/primo_geovishap.png",
    drops: [
        {
            item: "Witch's Heart Flames",
            minAmount: 1,
            maxAmount: 1,
            chance: 100,
        },
    ],

    critChance: 25,
    critValue: 1.5,
    defChance: 90,
    defValue: 0.3,
    getStatsForadventureRank(adventureRank: number) {
        const stats = [
            {
                adventureRank: 20,
                minHp: 3500,
                maxHp: 3500,
                minDamage: 60,
                maxDamage: 80,
            },
        ];
        return (
            stats.find((stat) => stat.adventureRank === adventureRank) || null
        );
    },
};
