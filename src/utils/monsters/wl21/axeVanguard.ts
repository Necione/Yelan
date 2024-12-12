import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Eremite: Axe Vanguard",
    group: MonsterGroup.Eremite,
    element: MonsterElement.Physical,
    minExp: 40,
    maxExp: 60,
    minWorldLevel: 21,
    image: "https://lh.elara.workers.dev/rpg/monsters/axe_vanguard.png",
    drops: [
        {
            item: "Rich Red Brocade",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    critChance: 50,
    critValue: 1.2,
    defChance: 25,
    defValue: 150,
    baseHp: 17,
    baseAtk: 12,
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
