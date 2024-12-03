import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Nobushi: Jintouban",
    group: MonsterGroup.Nobushi,
    minExp: 20,
    maxExp: 30,
    minWorldLevel: 16,
    image: "https://lh.elara.workers.dev/rpg/monsters/jintouban.png",
    critChance: 25,
    critValue: 7.5,
    defChance: 50,
    defValue: 50,
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
