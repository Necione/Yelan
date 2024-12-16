import { MonsterGroup } from "../../monsterHelper";

export default {
    startingHp: 0,
    name: "Rhodeia of Loch",
    group: MonsterGroup.Boss,
    minExp: 40,
    maxExp: 40,
    minadventurerank: 15,
    image: "https://lh.elara.workers.dev/rpg/bosses/oceanid.png",
    drops: [
        {
            item: "Witch's End Time",
            minAmount: 1,
            maxAmount: 1,
            chance: 100,
        },
    ],

    critChance: 25,
    critValue: 1.5,
    defChance: 100,
    defValue: 0.1,
    getStatsForadventureRank(adventureRank: number) {
        const stats = [
            {
                adventureRank: 15,
                minHp: 1750,
                maxHp: 1750,
                minDamage: 35,
                maxDamage: 60,
            },
        ];
        return (
            stats.find((stat) => stat.adventureRank === adventureRank) || null
        );
    },
};
