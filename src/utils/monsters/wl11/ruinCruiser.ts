import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Ruin Cruiser",
    group: MonsterGroup.Machine,
    minExp: 10,
    maxExp: 20,
    minWorldLevel: 11,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_cruiser.png",
    drops: [
        {
            item: "Chaos Device",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
    ],

    critChance: 5,
    critValue: 5,
    defChance: 50,
    defValue: 40,
    baseHp: 16,
    baseAtk: 8,
    getStatsForWorldLevel(worldLevel: number) {
        if (!limits.worlds.check(worldLevel)) {
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
