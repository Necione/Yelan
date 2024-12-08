import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Electro Cicin Mage",
    group: MonsterGroup.Fatui,
    element: MonsterElement.Electro,
    minExp: 10,
    maxExp: 25,
    minWorldLevel: 13,
    image: "https://lh.elara.workers.dev/rpg/monsters/electro_cicin_mage.png",
    drops: [
        {
            item: "Mist Grass Pollen",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
        },
        {
            item: "Mist Grass",
            minAmount: 1,
            maxAmount: 2,
            chance: 25,
        },
    ],

    critChance: 50,
    critValue: 1.5,
    defChance: 90,
    defValue: 20,
    baseHp: 15,
    baseAtk: 7.5,
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
