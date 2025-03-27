import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../helpers/monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Rockfond Rifthound",
    group: MonsterGroup.Abyss,
    element: MonsterElement.Geo,
    minExp: 75,
    maxExp: 100,
    minadventurerank: 30,
    souls: 5,
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
    defValue: 250,
    baseHp: 28,
    baseAtk: 15,
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
