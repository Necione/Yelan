import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Anemo Samachurl",
    group: MonsterGroup.Hilichurl,
    minExp: 5,
    maxExp: 7,
    minWorldLevel: 3,
    image: "https://lh.elara.workers.dev/rpg/monsters/anemo_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 3, chance: 85 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 2, chance: 35 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 10,
    critValue: 1.5,
    defChance: 20,
    defValue: 20,
    baseHp: 15,
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
