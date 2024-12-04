import { limits } from "..";
import { MonsterGroup } from "../../monsterHelper";
import { getAtkScaleMultiplier, getHpScaleMultiplier } from "../../statHelper";

export default {
    currentHp: 0,
    name: "Fatui Pyro Agent",
    group: MonsterGroup.Fatui,
    minExp: 10,
    maxExp: 25,
    minWorldLevel: 13,
    image: "https://lh.elara.workers.dev/rpg/monsters/fatui_pyro_agent.png",
    drops: [
        {
            item: "Hunter's Sacrificial Knife",
            minAmount: 1,
            maxAmount: 2,
            chance: 75,
        },
        {
            item: "Agent's Sacrificial Knife",
            minAmount: 1,
            maxAmount: 2,
            chance: 25,
        },
    ],

    critChance: 10,
    critValue: 1.5,
    defChance: 30,
    defValue: 20,
    baseHp: 12,
    baseAtk: 6.5,
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
