import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Geo Samachurl",
    group: MonsterGroup.Hilichurl,
    element: MonsterElement.Geo,
    minExp: 5,
    maxExp: 10,
    minadventurerank: 9,
    image: "https://lh.elara.workers.dev/rpg/monsters/geo_samachurl.png",
    drops: [
        { item: "Divining Scroll", minAmount: 1, maxAmount: 2, chance: 90 },
        { item: "Sealed Scroll", minAmount: 1, maxAmount: 1, chance: 75 },
        {
            item: "Forbidden Curse Scroll",
            minAmount: 1,
            maxAmount: 1,
            chance: 50,
        },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],
    critChance: 10,
    critValue: 1.5,
    defChance: 50,
    defValue: 50,
    baseHp: 17,
    baseAtk: 6,
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
