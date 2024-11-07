import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Ruin Grader",
    group: MonsterGroup.Machine,
    minExp: 50,
    maxExp: 75,
    minWorldLevel: 24,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_grader.png",
    drops: [
        {
            item: "Chaos Gear",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
        {
            item: "Chaos Axis",
            minAmount: 1,
            maxAmount: 1,
            chance: 25,
        },
    ],

    critChance: 10,
    critValue: 2,
    defChance: 75,
    defValue: 300,
    baseHp: 30,
    baseAtk: 8,
    getStatsForWorldLevel(worldLevel: number) {
        if (worldLevel < 1 || worldLevel > 30) {
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
