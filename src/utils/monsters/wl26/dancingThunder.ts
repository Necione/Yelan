import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Kairagi: Dancing Thunder",
    group: MonsterGroup.Nobushi,
    element: MonsterElement.Electro,
    minExp: 40,
    maxExp: 60,
    minadventurerank: 26,
    image: "https://lh.elara.workers.dev/rpg/monsters/dancing_thunder.png",
    critChance: 50,
    critValue: 2,
    defchance: 100,
    defValue: 350,
    drops: [
        {
            item: "Kageuchi Handguard",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
        {
            item: "Famed Handguard",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
        {
            item: "Strange Sword Hilt",
            minAmount: 1,
            maxAmount: 1,
            chance: 1,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    baseHp: 30,
    baseAtk: 22,
    getStatsForadventureRank(adventureRank: number) {
        if (!limits.check(adventureRank)) {
            return null;
        }

        const hpScaleMultiplier = getHpScaleMultiplier(adventureRank);
        const newBaseHp = this.baseHp * hpScaleMultiplier;
        const minHp = Math.ceil(newBaseHp * 0.9);
        const maxHp = Math.ceil(newBaseHp * 1.1);

        const atkScaleMultiplier = getAtkScaleMultiplier(adventureRank);
        const newBaseAtk = Math.ceil(this.baseAtk * atkScaleMultiplier);
        const minDamage = Math.floor(newBaseAtk * 0.95);
        const maxDamage = Math.ceil(newBaseAtk * 1.05);

        return {
            adventureRank,
            minHp,
            maxHp,
            minDamage,
            maxDamage,
        };
    },
};
