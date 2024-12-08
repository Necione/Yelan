import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Rockfond Rifthound",
    group: MonsterGroup.Abyss,
    minExp: 45,
    maxExp: 50,
    minWorldLevel: 30,
    image: "https://lh.elara.workers.dev/rpg/monsters/rockfond_rifthound.png",
    drops: [
        { item: "Concealed Claw", minAmount: 1, maxAmount: 1, chance: 50 },
        { item: "Concealed Unguis", minAmount: 1, maxAmount: 1, chance: 25 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 20,
    critValue: 1.1,
    defChance: 75,
    defValue: 100,
    baseHp: 28,
    baseAtk: 15,
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
