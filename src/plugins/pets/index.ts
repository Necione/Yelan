import { randomWeight } from "@elara-services/packages";
import {
    addButtonRow,
    embedComment,
    field,
    formatNumber,
    get,
    getConfirmPrompt,
    getInteractionResponder,
    is,
    proper,
    time,
    type XOR,
    type getInteractionResponders,
} from "@elara-services/utils";
import type { Pet } from "@prisma/client";
import type { PaginatedMessageAction } from "@sapphire/discord.js-utilities";
import {
    ButtonStyle,
    Colors,
    ComponentType,
    EmbedBuilder,
    TextInputStyle,
    type GuildMember,
    type Interaction,
    type InteractionEditReplyOptions,
    type RepliableInteraction,
} from "discord.js";
import { economy, roles } from "../../config";
import {
    addBalance,
    getPets,
    getProfileByUserId,
    removeBalance,
    updatePets,
} from "../../services";
import { customEmoji, getPaginatedMessage, logs, texts } from "../../utils";

export type PetTypes = "common" | "epic" | "legendary" | "mythic";
export const prices: Record<Pets | string, Record<PetTypes, number>> = {};
export const claims: Record<Pets | string, Record<PetTypes, number>> = {};
export const rarities: PetTypes[] = ["common", "epic", "legendary", "mythic"];
export type PetRarityNums = 0 | 1 | 2 | 3;

export const petNameFilters: RegExp[] | string[] = [
    "chink",
    "cunt",
    "nigga",
    "nigger",
    "faggot",
    "dick",
    "pussy",
    "penis",
    "vagina",
    "negro",
    "coon",
    "rape",
    "molest",
    "anal",
    "buttrape",
    "coont",
    "sex",
    "retard",
    "fuckface",
    "assfucker",
    "ass-fucker",
    "blowjob",
    "cum",
    "cummer",
    "cumming",
    "cums",
    "cumshot",
    "cunt",
    "cunt hair",
    "ejaculate",
    "loli",
    "lolicon",
    "cp",
    "pedo",
    "pedophile",
    "pedophilia",
    "child predator",
    "creampie",
    "K!ll urself",
    "k!ll yourself",
    "K!ll Yourself",
    "kill urself",
    "kill yourself",
    "Kill Yourself",
    "niga",
    "niger",
    "pedos",
    "rape",
    "rapist",
    "shota",
    "shotacon",
    "suicide",
    "hitler",
].map((c) => new RegExp(c, "i"));

export function checkName(name: string) {
    return petNameFilters.some((c) => name.match(c)) ? false : true;
}

export function getRandomRarity() {
    return randomWeight<{ rarity: PetTypes }>([
        { weight: 1, rarity: "mythic" }, // Should be extremely rare.
        { weight: 10, rarity: "legendary" },
        { weight: 25, rarity: "epic" },
        { weight: 500, rarity: "common" }, // Extremely common
    ]);
}

export type Pets =
    | "cat"
    | "dog"
    | "turtle"
    | "horse"
    | "pig"
    | "bunny"
    | "otter"
    | "bird"
    | "hamster"
    | "cow"
    | "fish"
    | "monkey";

export const pets: Pets[] = [
    "cat",
    "dog",
    "turtle",
    "horse",
    "pig",
    "bunny",
    "otter",
    "bird",
    "cow",
    "hamster",
    "fish",
    "monkey",
];
for (const pet of pets) {
    prices[pet] = {
        common: 250,
        epic: 400,
        legendary: 500,
        mythic: 600,
    };
    claims[pet] = {
        common: 30,
        epic: 40,
        legendary: 50,
        mythic: 60,
    };
}
export function getPetRarity(
    type: number | string,
): XOR<PetTypes, PetRarityNums> {
    switch (type) {
        case 0:
        default:
            return "common" as PetTypes;
        case 1:
            return "epic" as PetTypes;
        case 2:
            return "legendary" as PetTypes;
        case 3:
            return "mythic" as PetTypes;
        case "common":
            return 0 as PetRarityNums;
        case "epic":
            return 1 as PetRarityNums;
        case "legendary":
            return 2 as PetRarityNums;
        case "mythic":
            return 3 as PetRarityNums;
    }
}

export function getPetLimit(member: GuildMember) {
    if (member.roles.cache.hasAny(...roles.main)) {
        return 25;
    }
    if (member.roles.cache.has(economy.boost.role)) {
        return 2;
    }
    return 1;
}

export function getFeedAmount(db: Pet) {
    const rarity = getPetRarity(db.rarity);
    switch (rarity) {
        case "common":
        default:
            return 10;
        case "epic":
            return 13;
        case "legendary":
            return 16;
        case "mythic":
            return 19;
    }
}

export function getPetClaim(db: Pet) {
    const f = db.cooldowns.find((c) => c.type === "claim");
    if (f) {
        if (Date.now() < f.ends) {
            return 0;
        }
    }
    let claimAmount = 0;
    const amount = claims[db.type as Pets][getPetRarity(db.rarity) as PetTypes];
    if (db.multiplier <= 0) {
        claimAmount += Math.floor(amount / 3); // If there is 0 multiplier, make the claim amount a third of what they would've got.
        // Why?: They didn't feed their pet so they get way lower claim amount.
    } else {
        claimAmount += Math.floor(amount * (1 + db.multiplier)); // DO NOT CHANGE THIS
        // At the base they get `+1` (so it's the base claim amount) then the multiplier that they have for feeding the pet. (x0.3 for every feed, and feed can be given every X hours)
    }
    return claimAmount;
}

export async function displayData(
    interaction: RepliableInteraction,
    responder: getInteractionResponders,
) {
    let pets = await getPets(interaction.user.id);
    const p = await getProfileByUserId(interaction.user.id);
    if (!pets || !is.array(pets.pets) || !p) {
        return responder.edit(embedComment(`You don't have any pets.`));
    }
    let update = false;
    const status: { id: string; message: string }[] = [];
    for await (const pet of pets.pets) {
        const alive = pet.cooldowns.find((c) => c.type === "alive");
        if (!alive) {
            const ends = Date.now() + get.days(3);
            pet.cooldowns.push({ type: "alive", ends });
            update = true;
        } else {
            if (Date.now() >= alive.ends) {
                update = true;
                pets.pets = pets.pets.filter((c) => c.id !== pet.id);
                status.push({
                    id: pet.id,
                    message: `\`${pet.name}\` (**${proper(pet.type)}, ${proper(
                        getPetRarity(pet.rarity) as string,
                    )}**) has died, due to you not feeding it.`,
                });
                logs.misc({
                    content: `\`${interaction.user.username}\` (${
                        interaction.user.id
                    })'s pet \`${pet.name}\` (**${proper(pet.type)}, ${proper(
                        getPetRarity(pet.rarity) as string,
                    )}**) died.`,
                    files: [
                        {
                            name: "data.json",
                            attachment: Buffer.from(
                                JSON.stringify(pet, undefined, 2),
                            ),
                        },
                    ],
                    allowedMentions: { parse: [] },
                });
            } else {
                status.push({
                    id: pet.id,
                    message: `\`${pet.name}\` has ${time.relative(
                        new Date(alive.ends),
                    )} left, make sure to feed it!`,
                });
            }
        }
    }
    if (update) {
        pets = await updatePets(interaction.user.id, {
            pets: {
                set: pets.pets,
            },
        });
    }
    if (!pets || !is.array(pets.pets)) {
        return responder.edit(
            embedComment(
                `You don't have any pets.${
                    status.length
                        ? `\n\n# Status:\n${status
                              .map((c) => `- ${c.message}`)
                              .join("\n")}`
                        : ""
                }`,
            ),
        );
    }
    const pager = getPaginatedMessage();
    const deadPets = status.filter(
        (c) => !pets.pets.find((r) => r.id === c.id),
    );
    if (is.array(deadPets)) {
        pager.pages.push({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.Red)
                    .setTitle(`Pet Status`)
                    .setDescription(
                        deadPets.map((c) => `- ${c.message}`).join("\n"),
                    ),
            ],
        });
    }
    for (const pet of pets.pets) {
        const actions: PaginatedMessageAction[] = [];
        const claim = pet.cooldowns.find((c) => c.type === "claim");
        const feed = pet.cooldowns.find((c) => c.type === "feed");
        const message = status.find((c) => c.id === pet.id);

        const addClaim = () =>
            actions.push({
                customId: `pet:${pet.id}:claim`,
                style: ButtonStyle.Success,
                label: "Claim",
                type: ComponentType.Button,
                run({ collector }) {
                    collector.stop();
                },
            });

        const addFeed = () =>
            actions.push({
                customId: `pet:${pet.id}:feed`,
                style: ButtonStyle.Success,
                label: "Feed",
                type: ComponentType.Button,
                run({ collector }) {
                    collector.stop();
                },
            });

        if (claim) {
            if (Date.now() > claim.ends) {
                addClaim();
            }
        } else {
            addClaim();
        }
        if (pet.multiplier < 2.4) {
            if (feed) {
                if (Date.now() > feed.ends) {
                    addFeed();
                }
            } else {
                addFeed();
            }
        }
        if (p.balance >= 10) {
            actions.push({
                customId: `pet:${pet.id}:rename`,
                style: ButtonStyle.Success,
                label: "Rename",
                type: ComponentType.Button,
                run({ collector }) {
                    collector.stop();
                },
            });
        }

        if (p.balance >= 100) {
            actions.push({
                customId: `pet:${pet.id}:disown`,
                style: ButtonStyle.Danger,
                type: ComponentType.Button,
                label: "Disown",
                run({ collector }) {
                    collector.stop();
                },
            });
        }
        const embed = new EmbedBuilder()
            .setAuthor({
                name: interaction.user.displayName,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTitle(`Pet`)
            .setColor(Colors.Aqua)
            .setDescription(
                [
                    `Name: ${pet.name}`,
                    `Animal: ${proper(pet.type)}`,
                    `Rarity: ${proper(getPetRarity(pet.rarity) as string)}`,
                    `Multiplier ${pet.multiplier.toFixed(2)}`,
                    `Claim Amount: ${formatNumber(getPetClaim(pet))}`,
                    `Cooldowns: ${
                        pet.cooldowns.length
                            ? `\n${pet.cooldowns
                                  .filter((c) => c.type !== "alive")
                                  .map((c) => {
                                      if (
                                          c.type === "feed" &&
                                          pet.multiplier >= 2.4
                                      ) {
                                          return `Full`;
                                      }
                                      const t = c.ends - Date.now();
                                      return ` - ${proper(c.type)}: ${
                                          t <= 0
                                              ? "Can use!"
                                              : time.countdown(t)
                                      }`;
                                  })
                                  .join("\n")}`
                            : "None"
                    }`,
                ]
                    .map((c) => `- ${c}`)
                    .join("\n"),
            )
            .setFooter({ text: `ID: ${pet.id}` });
        if (message) {
            embed.addFields(field(`Status`, message.message));
        }
        pager.pages.push({
            embeds: [embed],
            actions,
        });
    }

    return pager.run(interaction, interaction.user).catch(console.log);
}

export async function handleInteractions(interaction: Interaction) {
    if (!("customId" in interaction)) {
        return;
    }
    const responder = getInteractionResponder(interaction);
    const [, id, action] = interaction.customId.split(":");
    const user = interaction.user;
    const send = async (
        options: InteractionEditReplyOptions,
        displayBack = true,
    ) => {
        if (displayBack) {
            options.components = [
                addButtonRow({
                    id: `pets:view`,
                    label: "Back",
                    emoji: { id: "847541454578647070" },
                    style: ButtonStyle.Success,
                }),
            ];
        }
        return await responder.edit(options);
    };
    if (id === "view") {
        await responder.deferUpdate();
        return displayData(interaction, responder);
    }
    if (action === "feed") {
        await responder.deferUpdate();
        const p = await getPets(user.id);
        const pe = p.pets.find((c) => c.id === id);
        if (!pe) {
            return await send(
                embedComment(`Unable to find the pet in your inventory...`),
            );
        }
        const f = pe.cooldowns.find((c) => c.type === "feed");
        const alive = pe.cooldowns.find((c) => c.type === "alive");
        if (f) {
            if (Date.now() < f.ends) {
                return await send(
                    embedComment(
                        `You can't feed your pet again until:\n> ${time.long.dateTime(
                            new Date(f.ends),
                        )} (${time.relative(new Date(f.ends))})`,
                    ),
                );
            }
        }
        if (pe.multiplier >= 2.4) {
            return await send(
                embedComment(
                    `You've reached the max amount of food you can give your pet within one day.`,
                ),
            );
        }
        if (alive) {
            alive.ends = Date.now() + get.days(3);
        } else {
            pe.cooldowns.push({
                type: "alive",
                ends: Date.now() + get.days(3),
            });
        }
        const amount = getFeedAmount(pe);
        pe.multiplier = pe.multiplier + 0.3;
        if (f) {
            f.ends = Date.now() + get.hrs(3);
        } else {
            pe.cooldowns.push({
                type: "feed",
                ends: Date.now() + get.hrs(3),
            });
        }
        await Promise.all([
            updatePets(user.id, { pets: { set: p.pets } }),
            removeBalance(user.id, amount, false, `Fed their pet.`),
        ]);

        return await send(
            embedComment(
                `You fed your pet for ${customEmoji.a.z_coins} \`${formatNumber(
                    amount,
                )} ${texts.c.u}\``,
                "Green",
            ),
        );
    }
    if (action === "claim") {
        await responder.deferUpdate();
        const p = await getPets(user.id);
        const pe = p.pets.find((c) => c.id === id);
        if (!pe) {
            return await send(
                embedComment(`Unable to find the pet in your inventory...`),
            );
        }
        const amount = getPetClaim(pe);
        if (!is.number(amount)) {
            return await send(
                embedComment(`You don't have anything to claim for that pet.`),
            );
        }
        pe.multiplier = 0;
        pe.multiplierReset = Date.now() + get.days(1); // After 1 day reset the multiplier timer.
        const f = pe.cooldowns.find((c) => c.type === "claim");
        if (f) {
            f.ends = Date.now() + get.days(1);
        } else {
            pe.cooldowns.push({
                type: "claim",
                ends: Date.now() + get.days(1),
            });
        }
        await Promise.all([
            updatePets(user.id, { pets: { set: p.pets } }),
            addBalance(user.id, amount, false, `Via pet claim`),
        ]);
        return await send(
            embedComment(
                `You've claimed ${customEmoji.a.z_coins} \`${formatNumber(
                    amount,
                )} ${texts.c.u}\` from your pet!`,
                "Green",
            ),
        );
    }

    if (action === "rename" && "showModal" in interaction) {
        await interaction
            .showModal({
                customId: `pet:${id}:rename_modal`,
                title: `Rename Pet`,
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            {
                                customId: `name`,
                                label: `New Name`,
                                style: TextInputStyle.Paragraph,
                                type: ComponentType.TextInput,
                                minLength: 2,
                                maxLength: 40,
                                required: true,
                            },
                        ],
                    },
                ],
            })
            .catch(() => null);
        const prompt = await interaction
            .awaitModalSubmit({
                filter: (i) =>
                    i.user.id === interaction.user.id &&
                    i.customId === `pet:${id}:rename_modal`,
                time: get.secs(30),
            })
            .catch(() => null);
        if (!prompt) {
            return await send(
                embedComment(`You failed to provide a new name after 30s`),
            );
        }
        const name = prompt.fields.getTextInputValue("name");
        await prompt.deferUpdate().catch(() => null);
        if (!checkName(name)) {
            return await send(
                embedComment(
                    `The name you provided can't be used, pick a different one.`,
                ),
            );
        }
        const [p, d] = await Promise.all([
            getPets(user.id),
            getProfileByUserId(user.id),
        ]);
        const pe = p.pets.find((c) => c.id === id);
        if (!pe) {
            return await send(
                embedComment(`Unable to find the pet in your invetory....`),
            );
        }
        if (d.balance < 10) {
            return await send(
                embedComment(
                    `You need ${customEmoji.a.z_coins} \`10 ${texts.c.u}\` to rename`,
                ),
            );
        }
        const confirm = await getConfirmPrompt(
            interaction,
            user,
            `Are you 100% sure you want to rename your pet for ${customEmoji.a.z_coins} \`10 ${texts.c.u}\`?`,
            get.secs(10),
        );
        if (!confirm) {
            return;
        }
        pe.name = name;
        await Promise.all([
            updatePets(user.id, {
                pets: {
                    set: p.pets,
                },
            }),
            removeBalance(user.id, 10, false, `Rename pet to \`${name}\``),
        ]);
        return await send(embedComment(`I've renamed your pet!`, "Green"));
    }

    if (action === "disown") {
        await responder.deferUpdate();
        const [p, d] = await Promise.all([
            getPets(user.id),
            getProfileByUserId(user.id),
        ]);
        const pe = p.pets.find((c) => c.id === id);
        if (!pe) {
            return await send(
                embedComment(`Unable to find the pet in your inventory...`),
            );
        }
        if (d.balance < 100) {
            return await send(
                embedComment(
                    `You need ${customEmoji.a.z_coins} \`100 ${texts.c.u}\` to disown`,
                ),
            );
        }
        const confirm = await getConfirmPrompt(
            interaction,
            user,
            `Are you 100% sure you want to disown your pet for ${customEmoji.a.z_coins} \`100 ${texts.c.u}\`?`,
            get.secs(10),
        );
        if (!confirm) {
            return;
        }
        await Promise.all([
            updatePets(user.id, {
                pets: {
                    set: p.pets.filter((c) => c.id !== id),
                },
            }),
            removeBalance(user.id, 100, false, `Disowned the pet 😭`),
        ]);
        return await send(
            embedComment(`You've disowned your pet! 😭`, "Green"),
        );
    }
    return responder.reply(embedComment(`Invalid option?`));
}
