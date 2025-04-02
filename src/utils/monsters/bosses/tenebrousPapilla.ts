import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";

export default {
    startingHp: 0,
    name: "Tenebrous Papilla",
    group: MonsterGroup.Boss,
    element: MonsterElement.Electro,
    minExp: 40,
    maxExp: 40,
    minadventurerank: 35,
    image: "https://lh.elara.workers.dev/rpg/monsters/tene.png",
    drops: [
        {
            item: "Ensnaring Gaze",
            minAmount: 1,
            maxAmount: 1,
            chance: 100,
        },
    ],

    critChance: 25,
    critValue: 1.1,
    defChance: 75,
    defValue: 50,
    getStatsForadventureRank(adventureRank: number) {
        return {
            adventureRank,
            minHp: 15000,
            maxHp: 20000,
            minDamage: 300,
            maxDamage: 600,
        };
    },
};
