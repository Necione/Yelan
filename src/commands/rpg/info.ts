import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { embedComment, is, make, noop } from "@elara-services/utils";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { getProfileByUserId, getUserStats, syncStats } from "../../services";
import {
    initializeMonsters,
    monsters,
    monstersLoaded,
    weaponAdvantages,
} from "../../utils/hunt";
import { getCommonLocationsForGroup } from "../../utils/locationUtils";
import { MonsterGroup } from "../../utils/monsterHelper";
import type { WeaponType } from "../../utils/rpgitems/weapons";
import { weapons, type WeaponName } from "../../utils/rpgitems/weapons";
import { getUserSkillLevelData, skills } from "../../utils/skillsData";
import { specialSkills } from "../../utils/specialSkills";

const specialEffects: Array<{
    substring: string;
    effect: string;
}> = [
    {
        substring: "Absolution",
        effect: "Enemies can never land a Critical Attack on you.",
    },
    {
        substring: "Memory of Dust",
        effect: "Keep hunting for another 500 HP after death.",
    },
    {
        substring: "Wolf's Gravestone",
        effect: "Deal 20% more damage per 1000 HP the monster has.",
    },
    {
        substring: "Vortex Vanquisher",
        effect: "Reduce all damage taken by 50%.",
    },
    {
        substring: "Everlasting Moonglow",
        effect: "Disable all Anemo and Electro elemental effects.",
    },
    {
        substring: "Aqua Simulacra",
        effect: "Put yourself in the hands of fate.",
    },
    {
        substring: "Calamity Queller",
        effect: "Monsters can no longer defend.",
    },
];

export const info = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName("info")
        .setDescription(
            "[RPG] View information about a skill, monster, or weapon.",
        )
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("The type of information you want to view.")
                .setRequired(true)
                .addChoices(
                    { name: "Skill", value: "skill" },
                    { name: "Monster", value: "monster" },
                    { name: "Weapon", value: "weapon" },
                ),
        )
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription(
                    "The name of the skill, monster, or weapon you want to view.",
                )
                .setRequired(true)
                .setAutocomplete(true),
        )
        .setDMPermission(false),
    defer: { silent: false },
    async autocomplete(i) {
        const type = i.options.getString("type", false) ?? "";
        const searchTerm =
            i.options.getString("name", false)?.toLowerCase() || "";

        if (type === "skill") {
            const allOptions = [
                ...skills.map((skill) => ({
                    name: `${skill.name}`,
                    value: skill.name,
                })),
                ...specialSkills.map((special) => ({
                    name: `${special.skillName}`,
                    value: special.skillName,
                })),
            ];

            const filteredOptions = allOptions.filter((option) =>
                option.name.toLowerCase().includes(searchTerm),
            );

            return i.respond(filteredOptions.slice(0, 25)).catch(noop);
        } else if (type === "monster") {
            if (!monstersLoaded) {
                await initializeMonsters();
            }

            const monsterNames = monsters.map((monster) => monster.name);
            const filteredNames = monsterNames.filter((name) =>
                name.toLowerCase().includes(searchTerm),
            );

            if (!is.array(filteredNames)) {
                return i
                    .respond([{ name: "No match found.", value: "n/a" }])
                    .catch(noop);
            }

            return i
                .respond(
                    filteredNames.slice(0, 25).map((name) => ({
                        name,
                        value: name,
                    })),
                )
                .catch(noop);
        } else if (type === "weapon") {
            const weaponNames = Object.keys(weapons);
            const filteredNames = weaponNames.filter((name) =>
                name.toLowerCase().includes(searchTerm),
            );

            if (!is.array(filteredNames)) {
                return i
                    .respond([{ name: "No match found.", value: "n/a" }])
                    .catch(noop);
            }

            return i
                .respond(
                    filteredNames.slice(0, 25).map((name) => ({
                        name,
                        value: name,
                    })),
                )
                .catch(noop);
        } else {
            return i.respond([]).catch(noop);
        }
    },
    async execute(i, r) {
        const type = i.options.getString("type", true);
        const name = i.options.getString("name", true);

        if (type === "skill") {
            const stats = await getUserStats(i.user.id);

            if (!stats) {
                return r.edit(
                    embedComment(
                        `No stats found for you, please set up your profile.`,
                    ),
                );
            }

            const skill =
                skills.find(
                    (s) => s.name.toLowerCase() === name.toLowerCase(),
                ) ||
                specialSkills.find(
                    (s) => s.skillName.toLowerCase() === name.toLowerCase(),
                );

            if (!skill) {
                return r.edit(
                    embedComment(`The skill "${name}" does not exist.`),
                );
            }

            if ("levels" in skill) {
                const userSkillLevelData = getUserSkillLevelData(
                    stats,
                    skill.name,
                );
                const userSkillLevel = userSkillLevelData
                    ? userSkillLevelData.level
                    : 0;

                const embed = new EmbedBuilder()
                    .setColor("Aqua")
                    .setTitle(`\`${skill.emoji}\` ${skill.name} Skill Details`)
                    .setThumbnail(skill.icon)
                    .setDescription(
                        skill.levels
                            .map((level) => {
                                const isCurrentLevel =
                                    level.level === userSkillLevel;
                                const levelHeader = isCurrentLevel
                                    ? `**Level ${level.level}:** (Current)`
                                    : `**Level ${level.level}:**`;
                                return `> ${levelHeader}\n${level.description}`;
                            })
                            .join("\n\n"),
                    )
                    .setFooter({
                        text: `Use /learn to learn or upgrade this skill.`,
                    });

                return r.edit({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor("Gold")
                    .setTitle(
                        `\`${skill.emoji}\` ${skill.skillName} Special Skill`,
                    )
                    .setDescription(skill.description)
                    .setFooter({
                        text: "Special skills are unlocked through mastery levels.",
                    });

                return r.edit({ embeds: [embed] });
            }
        } else if (type === "monster") {
            if (!monstersLoaded) {
                await initializeMonsters();
            }

            const monster = monsters.find(
                (m) => m.name.toLowerCase() === name.toLowerCase(),
            );

            if (!monster) {
                return r.edit(
                    embedComment(
                        `The monster "${name}" was not found. Please check the name and try again.`,
                    ),
                );
            }

            const group =
                MonsterGroup[monster.group as keyof typeof MonsterGroup] ||
                MonsterGroup.Human;

            let commonLocations = getCommonLocationsForGroup(group, 3);

            commonLocations = commonLocations.filter(
                (location) => location !== "Default",
            );

            const dropsList = monster.drops
                .map(
                    (drop) =>
                        `\`${drop.item}\`: \`${drop.minAmount}-${drop.maxAmount}\` (Chance: \`${drop.chance}%\`)`,
                )
                .join("\n");

            const embed = new EmbedBuilder()
                .setColor("Orange")
                .setTitle(`${monster.name}`)
                .addFields(
                    {
                        name: "Min Adventure Rank",
                        value: `${monster.minadventurerank}`,
                        inline: true,
                    },
                    {
                        name: "Commonly Found:",
                        value:
                            commonLocations.length > 0
                                ? commonLocations.join(", ")
                                : "Unknown",
                        inline: true,
                    },
                    {
                        name: "Drops",
                        value:
                            dropsList.length > 0
                                ? dropsList
                                : "No drops available.",
                        inline: false,
                    },
                )
                .setThumbnail(monster.image);

            return r.edit({ embeds: [embed] });
        } else if (type === "weapon") {
            const profile = await getProfileByUserId(i.user.id);
            if (!profile) {
                const noProfileEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Profile Not Found")
                    .setDescription(
                        "You don't have a user profile yet. Please create one using `/profile`.",
                    )
                    .setTimestamp();

                return r.edit({ embeds: [noProfileEmbed] });
            }

            if (profile.locked) {
                const lockedProfileEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Profile Locked")
                    .setDescription(
                        "Your user profile is locked. You cannot use this command.",
                    )
                    .setTimestamp();

                return r.edit({ embeds: [lockedProfileEmbed] });
            }

            const stats = await syncStats(i.user.id);
            if (!stats) {
                const noStatsEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("No Stats Found")
                    .setDescription("No stats found for you.")
                    .setTimestamp();

                return r.edit({ embeds: [noStatsEmbed] });
            }

            const weaponName = name as WeaponName;
            const selectedWeapon = weapons[weaponName];

            if (!selectedWeapon) {
                const weaponNotFoundEmbed = new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("Weapon Not Found")
                    .setDescription(`The weapon "${name}" could not be found.`)
                    .setTimestamp();

                return r.edit({ embeds: [weaponNotFoundEmbed] });
            }

            const fullWeaponName = selectedWeapon.name;

            const weaponStats = make.array<string>();
            for (const [key, value] of Object.entries(selectedWeapon)) {
                if (
                    [
                        "emoji",
                        "imageURL",
                        "sellPrice",
                        "chestChance",
                        "minadventurerank",
                        "name",
                    ].includes(key)
                ) {
                    continue;
                }

                if (typeof value === "number" && value === 0) {
                    continue;
                }

                const statName = capitalizeFirstLetter(key);

                let statValue = "";
                if (typeof value === "number") {
                    statValue = `\`${value.toFixed(2)}\``;
                } else if (typeof value === "string") {
                    statValue = `\`${value}\``;
                } else {
                    statValue = `\`${value}\``;
                }

                weaponStats.push(`${statName}: ${statValue}`);
            }

            const statsDisplay =
                weaponStats.length > 0
                    ? weaponStats.join("\n")
                    : "No additional stats.";

            const weaponType = selectedWeapon.type as WeaponType;
            const effectiveGroups = weaponAdvantages[weaponType] || [];

            const advantageDisplay =
                effectiveGroups.length > 0
                    ? effectiveGroups
                          .map((group: MonsterGroup) => `- **${group}**`)
                          .join("\n")
                    : "No advantages.";

            let description = `**${fullWeaponName}**\n\nThis weapon deals more damage to the following monster groups:\n${advantageDisplay}`;

            if (weaponType === "Catalyst") {
                description += `\nThis weapon can cast spells using </spell:1303910605257969695>. Spells are pre-casted and activate during combat in the same order they are casted.`;
            }

            const embed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle(`Weapon: ${fullWeaponName}`)
                .setDescription(description)
                .setThumbnail(selectedWeapon.imageURL)
                .addFields({
                    name: "Weapon Stats",
                    value: statsDisplay,
                });

            for (const { substring, effect } of specialEffects) {
                if (fullWeaponName.includes(substring)) {
                    embed.addFields({
                        name: "Special Effect",
                        value: effect,
                    });
                }
            }

            return r.edit({ embeds: [embed] });
        } else {
            return r.edit(
                embedComment(
                    "Invalid type specified. Please choose 'skill', 'monster', or 'weapon'.",
                ),
            );
        }
    },
});

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
