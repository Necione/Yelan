import { MonsterGroup } from "../../helpers/monsterHelper";

export default {
    startingHp: 0,
    name: "Cryo Regisvine",
    group: MonsterGroup.Boss,
    minExp: 10,
    maxExp: 10,
    minadventurerank: 10,
    image: "https://lh.elara.workers.dev/rpg/bosses/cryo_regisvine.png",
    drops: [
        {
            item: "Witch's Ever-Burning Plume",
            minAmount: 1,
            maxAmount: 1,
            chance: 100,
        },
    ],

    critChance: 25,
    critValue: 1.5,
    defChance: 50,
    defValue: 0.25,
    getStatsForadventureRank(adventureRank: number) {
        const stats = [
            {
                adventureRank: 10,
                minHp: 600,
                maxHp: 600,
                minDamage: 15,
                maxDamage: 25,
            },
        ];
        return (
            stats.find((stat) => stat.adventureRank === adventureRank) || null
        );
    },
};
