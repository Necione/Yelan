import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Treasure Hoarder Crusher",
    group: MonsterGroup.Human,
    element: MonsterElement.Physical,
    minExp: 7,
    maxExp: 13,
    minWorldLevel: 7,
    image: "https://lh.elara.workers.dev/rpg/monsters/treasure_hoarder_crusher.png",
    critChance: 12,
    critValue: 1.4,
    defChance: 50,
    defValue: 50,
    drops: [
        {
            item: "Treasure Hoarder Insignia",
            minAmount: 1,
            maxAmount: 3,
            chance: 90,
        },
        {
            item: "Silver Raven Insignia",
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
    baseHp: 19,
    baseAtk: 6,
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
