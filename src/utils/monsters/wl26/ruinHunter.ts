import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Ruin Hunter",
    group: MonsterGroup.Machine,
    minExp: 45,
    maxExp: 50,
    minWorldLevel: 26,
    image: "https://lh.elara.workers.dev/rpg/monsters/ruin_hunter.png",
    drops: [
        {
            item: "Chaos Device",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
    ],

    critChance: 25,
    critValue: 1.25,
    defChance: 50,
    defValue: 150,
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
