import { limits } from "..";
import { MonsterElement, MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Fatui Cryogunner",
    group: MonsterGroup.Fatui,
    element: MonsterElement.Cryo,
    minExp: 40,
    maxExp: 60,
    minWorldLevel: 24,
    image: "https://lh.elara.workers.dev/rpg/monsters/fatui_cryogunner.png",
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
    defChance: 75,
    defValue: 100,
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
