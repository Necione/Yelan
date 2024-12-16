import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    startingHp: 0,
    name: "Fatui Pyroslinger",
    group: MonsterGroup.Fatui,
    element: MonsterElement.Pyro,
    minExp: 10,
    maxExp: 20,
    minadventurerank: 11,
    image: "https://lh.elara.workers.dev/rpg/monsters/fatui_pyroslinger.png",
    drops: [
        { item: "Recruit's Insignia", minAmount: 1, maxAmount: 2, chance: 75 },
        { item: "Sergeant's Insignia", minAmount: 1, maxAmount: 2, chance: 25 },
        {
            item: "Life Essence",
            minAmount: 1,
            maxAmount: 1,
            chance: 10,
        },
    ],

    critChance: 33,
    critValue: 1.5,
    defChance: 50,
    defValue: 50,
    baseHp: 15,
    baseAtk: 7.5,
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
