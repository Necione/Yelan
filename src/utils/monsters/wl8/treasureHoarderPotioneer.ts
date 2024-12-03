import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    name: "Treasure Hoarder Potioneer",
    group: MonsterGroup.Human,
    minHp: 150,
    maxHp: 250,
    minDamage: 25,
    maxDamage: 50,
    minExp: 7,
    maxExp: 13,
    minWorldLevel: 8,
    image: "https://lh.elara.workers.dev/rpg/monsters/treasure_hoarder_potioneer.png",
    critChance: 10,
    critValue: 3,
    defChance: 50,
    defValue: 50,
    drops: [
        {
            item: "Silver Raven Insignia",
            minAmount: 1,
            maxAmount: 3,
            chance: 90,
        },
        {
            item: "Golden Raven Insignia",
            minAmount: 1,
            maxAmount: 2,
            chance: 50,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    baseHp: 18,
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
