import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Hydro Samachurl",
    group: MonsterGroup.Hilichurl,
    minExp: 75,
    maxExp: 100,
    minWorldLevel: 30,
    image: "https://lh.elara.workers.dev/rpg/monsters/hydro_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 2, chance: 100 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 1, chance: 100 },
        {
            item: "Forbidden Curse Scroll",
            minAmount: 1,
            maxAmount: 1,
            chance: 75,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 25,
    critValue: 1.2,
    defChance: 75,
    defValue: 150,
    baseHp: 25,
    baseAtk: 16,
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
