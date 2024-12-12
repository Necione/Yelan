import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    name: "Treasure Hoarder Potioneer",
    group: MonsterGroup.Human,
    element: MonsterElement.Physical,
    minHp: 150,
    maxHp: 250,
    minDamage: 25,
    maxDamage: 50,
    minExp: 7,
    maxExp: 13,
    minadventurerank: 8,
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
    getStatsForadventureRank(adventureRank: number) {
        if (!limits.check(adventureRank)) {
            return null;
        }

        const hpScaleMultiplier = getHpScaleMultiplier(adventureRank);
        const newBaseHp = this.baseHp * hpScaleMultiplier;
        const minHp = Math.ceil(newBaseHp * 0.9);
        const maxHp = Math.ceil(newBaseHp * 1.1);

        const atkScaleMultiplier = getAtkScaleMultiplier(adventureRank);
        const newBaseAtk = Math.ceil(this.baseAtk * atkScaleMultiplier);
        const minDamage = Math.floor(newBaseAtk * 0.95);
        const maxDamage = Math.ceil(newBaseAtk * 1.05);

        return {
            adventureRank,
            minHp,
            maxHp,
            minDamage,
            maxDamage,
        };
    },
};
