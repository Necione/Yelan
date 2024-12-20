import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Nobushi: Hitsukeban",
    group: MonsterGroup.Nobushi,
    element: MonsterElement.Physical,
    minExp: 40,
    maxExp: 60,
    minadventurerank: 24,
    image: "https://lh.elara.workers.dev/rpg/monsters/hitsukeban.png",
    critChance: 50,
    critValue: 2,
    defchance: 90,
    defValue: 300,
    drops: [
        {
            item: "Old Handguard",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
    ],
    baseHp: 25,
    baseAtk: 15,
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
