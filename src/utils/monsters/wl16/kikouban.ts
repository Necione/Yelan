import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Nobushi: Kikouban",
    group: MonsterGroup.Nobushi,
    element: MonsterElement.Physical,
    minExp: 20,
    maxExp: 30,
    minadventurerank: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/kikouban.png",
    critChance: 25,
    critValue: 5,
    defchance: 90,
    defValue: 25,
    drops: [
        {
            item: "Old Handguard",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
    ],
    baseHp: 14,
    baseAtk: 7,
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
