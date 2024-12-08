import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Eremite: Loremaster",
    group: MonsterGroup.Eremite,
    minExp: 75,
    maxExp: 100,
    minWorldLevel: 24,
    image: "https://lh.elara.workers.dev/rpg/monsters/loremaster.png",
    drops: [
        {
            item: "Faded Red Satin",
            minAmount: 1,
            maxAmount: 1,
            chance: 100,
        },
        {
            item: "Trimmed Red Silk",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
        {
            item: "Rich Red Brocade",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 25,
    critValue: 1.25,
    defChance: 50,
    defValue: 200,
    baseHp: 25,
    baseAtk: 19,
    getStatsForWorldLevel(worldLevel: number) {
        if (!limits.check(worldLevel)) {
            return null;
        }

        const hpScaleMultiplier = getHpScaleMultiplier(worldLevel);
        const newBaseHp = this.baseHp * hpScaleMultiplier;
        const minHp = Math.ceil(newBaseHp * 0.9);
        const maxHp = Math.ceil(newBaseHp * 1.1);

        const atkScaleMultiplier = getAtkScaleMultiplier(worldLevel);
        const newBaseAtk = Math.ceil(this.baseAtk * atkScaleMultiplier);
        const minDamage = Math.floor(newBaseAtk * 0.95);
        const maxDamage = Math.ceil(newBaseAtk * 1.05);

        return {
            worldLevel,
            minHp,
            maxHp,
            minDamage,
            maxDamage,
        };
    },
};
