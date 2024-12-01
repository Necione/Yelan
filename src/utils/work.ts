import { make } from "@elara-services/utils";
import { customEmoji, texts } from "@liyueharbor/econ";

const r = `${customEmoji.a.z_coins} \`%AMOUNT% ${texts.c.u}\``;

export const workMessages = make.array<{
    message: string;
    image: string;
    title: string;
    footer: string;
}>([
    {
        message: `You went out hunting for Hilichurls and earned ${r}.`,
        image: "https://i.imgur.com/jLt0v7v.png",
        title: "Whew! That took you a while to do...",
        footer: "Mondstadt | 001",
    },
    {
        message: `Jean gave you ${r} as payment for being a Knight of Favonius.`,
        image: "https://i.imgur.com/ybUFChp.png",
        title: "This isn't enough payment for the job",
        footer: "Mondstadt | 002",
    },
    {
        message: `Helping Lisa with her books rewarded you with ${r}. Hopefully the new adventurers don't mess things up again.`,
        image: "https://i.imgur.com/mUlkfqe.png",
        title: "Has the library always been this messy?",
        footer: "Mondstadt | 003",
    },
    {
        message: `Amber's bunny helped you find ${r} in hidden places.`,
        image: "https://i.imgur.com/hGPheKI.png",
        title: "Baron Bunny's Treasure Hunt",
        footer: "Mondstadt | 004",
    },
    {
        message: `Diluc gave you ${r} for helping out at the tavern.`,
        image: "https://i.imgur.com/zHqiENJ.png",
        title: "A Reward from the Dawn Winery",
        footer: "Mondstadt | 005",
    },
    {
        message: `You helped Venti gather some dandelion seeds and earned ${r}.`,
        image: "https://i.imgur.com/oCkjDAk.png",
        title: "Songs of the Wind",
        footer: "Mondstadt | 006",
    },
    {
        message: `You assisted Albedo with an experiment and received ${r}.`,
        image: "https://i.imgur.com/YbGg9L5.png",
        title: "A Little Alchemical Reward",
        footer: "Mondstadt | 007",
    },
    {
        message: `Xiao thanked you for the Almond Tofu. +${r}!`,
        image: "https://i.imgur.com/l0frlxz.png",
        title: "He's a real glutton deep down huh.",
        footer: "Liyue | 001",
    },
]);
