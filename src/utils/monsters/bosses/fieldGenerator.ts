import { MonsterElement, MonsterGroup } from "../../monsterHelper";

export default {
    currentHp: 0,
    name: "Experimental Field Generator",
    group: MonsterGroup.Boss,
    element: MonsterElement.Geo,
    minExp: 40,
    maxExp: 50,
    minadventurerank: 35,
    image: "https://lh.elara.workers.dev/rpg/monsters/proto.png",
    drops: [
        {
            item: "Tourbillon Device",
            minAmount: 1,
            maxAmount: 1,
            chance: 100,
        },
    ],

    critChance: 5,
    critValue: 1.5,
    defChance: 75,
    defValue: 100,
    getStatsForadventureRank(adventureRank: number) {
        return {
            adventureRank,
            minHp: 15000,
            maxHp: 20000,
            minDamage: 700,
            maxDamage: 1400,
        };
    },
};
