import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Frostarm Lawachurl",
    group: MonsterGroup.Hilichurl,
    element: MonsterElement.Cryo,
    minExp: 5,
    maxExp: 10,
    minadventurerank: 6,
    critChance: 25,
    critValue: 1.5,
    defChance: 20,
    defValue: 20,
    image: "https://lh.elara.workers.dev/rpg/monsters/frostarm_lawachurl.png",
    drops: [
        { item: "Stained Mask", minAmount: 1, maxAmount: 3, chance: 90 },
        { item: "Ominous Mask", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Heavy Horn", minAmount: 1, maxAmount: 2, chance: 50 },
        { item: "Black Bronze Horn", minAmount: 1, maxAmount: 2, chance: 25 },
        { item: "Life Essence", minAmount: 1, maxAmount: 1, chance: 10 },
    ],
    baseHp: 16,
    baseAtk: 5,
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
