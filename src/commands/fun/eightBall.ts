import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { Colors, SlashCommandBuilder } from "discord.js";

const answers = [
    "It is certain.",
    "It is decidedly so.",
    "Without a doubt.",
    "Yes – definitely.",
    "How the fuck should I know.",
    "As I see it, yes.",
    "Most likely.",
    "Outlook good.",
    "Probably not.",
    "Yes.",
    "This question is stupid.",
    "Depends on my mood.",
    "https://www.youtube.com/watch?v=Vvr8mzIxfAY",
    "Ask again later.",
    "Better not tell you now.",
    "Cannot predict now, shut the fuck up.",
    "Concentrate and ask again.",
    "Don't count on it.",
    "My reply is no.",
    "My sources say no.",
    "Outlook not so good.",
    "Lol no.",
    "Very doubtful.",
    "In accordance to the Oratrice Mecanique D'Analyse Cardinale... no.",
];

const dfla = "...";

const regexResponses = [
    {
        regex: /\b[Kk][\\ !@#$%^&*()Kk\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Ll][\\ !@#$%^&*()Ll\\-]*[Ll][\\ !@#$%^&*()Ll\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Ss][\\ !@#$%^&*()Ss\\-]*[Uu][\\ !@#$%^&*()Uu\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Cc][\\ !@#$%^&*()Cc\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Dd][\\ !@#$%^&*()Dd\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Pp][\\ !@#$%^&*()Pp\\-]*[Aa][\\ !@#$%^&*()Aa\\-]*[Ll][\\ !@#$%^&*()Ll\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*[Ss][\\ !@#$%^&*()Ss\\-]*[Tt][\\ !@#$%^&*()Tt\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Nn][\\ !@#$%^&*()Nn\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Ii][\\ !@#$%^&*()Ii\\-]*[Ss][\\ !@#$%^&*()Ss\\-]*[Rr][\\ !@#$%^&*()Rr\\-]*[Aa][\\ !@#$%^&*()Aa\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*[Ll][\\ !@#$%^&*()Ll\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Pp][\\ !@#$%^&*()Pp\\-]*[3Ee][\\ !@#$%^&*()3Ee\\-]*[Dd][\\ !@#$%^&*()Dd\\-]*[0Oo][\\ !@#$%^&*()0Oo\\-]*/i,
        response: ":face_with_raised_eyebrow:",
    },
    {
        regex: /\b[Ss][\\ !@#$%^&*()Ss\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*[Xx][\\ !@#$%^&*()Xx\\-]*/i,
        response: ":face_with_raised_eyebrow:",
    },
    {
        regex: /\b[Ss][\\ !@#$%^&*()Ss\\-]*[Hh][\\ !@#$%^&*()Hh\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Tt][\\ !@#$%^&*()Tt\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Cc][\\ !@#$%^&*()Cc\\-]*[Rr][\\ !@#$%^&*()Rr\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*[Aa][\\ !@#$%^&*()Aa\\-]*[Mm][\\ !@#$%^&*()Mm\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Nn][\\ !@#$%^&*()Nn\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Gg][\\ !@#$%^&*()Gg\\-]*[Gg][\\ !@#$%^&*()Gg\\-]*[Aa][\\ !@#$%^&*()Aa\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Nn][\\ !@#$%^&*()Nn\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Gg][\\ !@#$%^&*()Gg\\-]*[Gg][\\ !@#$%^&*()Gg\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*[Rr][\\ !@#$%^&*()Rr\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[RrЯя][\\ !@#$%^&*()RrЯя\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*[Tt][\\ !@#$%^&*()Tt\\-]*[Aa][\\ !@#$%^&*()Aa\\-]*[RrЯя][\\ !@#$%^&*()RrЯя\\-]*[Dd][\\ !@#$%^&*()Dd\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Hh][\\ !@#$%^&*()Hh\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Tt][\\ !@#$%^&*()Tt\\-]*[Ll][\\ !@#$%^&*()Ll\\-]*[Ee][\\ !@#$%^&*()Ee\\-]*[Rr][\\ !@#$%^&*()Rr\\-]*/i,
        response: dfla,
    },
    {
        regex: /\b[Ss][\\ !@#$%^&*()Ss\\-]*[Tt][\\ !@#$%^&*()Tt\\-]*[Aa][\\ !@#$%^&*()Aa\\-]*[Ll][\\ !@#$%^&*()Ll\\-]*[Ii][\\ !@#$%^&*()Ii\\-]*[Nn][\\ !@#$%^&*()Nn\\-]*/i,
        response: dfla,
    },
];

export const eightBall = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`8ball`)
        .setDescription(`Ask the Magic 8 Ball a question`)
        .setDMPermission(false)
        .addStringOption((option) =>
            option
                .setName("question")
                .setDescription("The question to ask the 8 Ball.")
                .setRequired(true),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const question = i.options.getString("question", true);
        for (const { regex, response } of regexResponses) {
            if (regex.test(question)) {
                return r.edit(embedComment(response));
            }
        }
        const answer = answers[Math.floor(Math.random() * answers.length)];
        return r.edit(
            embedComment(
                `🎱 Question: *${question}*\nAnswer: ${answer}`,
                i.member.displayColor || Colors.Purple,
            ),
        );
    },
});
