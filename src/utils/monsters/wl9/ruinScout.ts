import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Ruin Scout",
    group: MonsterGroup.Machine,
    minExp: 5,
    maxExp: 10,
    minWorldLevel: 9,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_scout.png",
    drops: [
        {
            item: "Chaos Gear",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
    ],
    critChance: 10,
    critValue: 2,
    defChance: 25,
    defValue: 50,
    baseHp: 14,
    baseAtk: 6,
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
