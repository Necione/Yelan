import { buildCommand, type SlashCommand } from "@elara-services/botbuilder";
import { is, noop } from "@elara-services/utils";
import {
    Colors,
    EmbedBuilder,
    SlashCommandBuilder,
    type GuildMember,
    type Role,
} from "discord.js";
import { roles } from "../../config";
import { getAllColorRoles, getColorRoles } from "../../plugins/other/color";

const availableRolesEmbed = (availableRoles: string[], member: GuildMember) => {
    const hasRestrictedRole = member.roles.cache.hasAny(
        ...roles.restrictedColors,
    );
    const embed = new EmbedBuilder().setTitle(`Color Roles`);
    if (hasRestrictedRole || availableRoles.length <= 0) {
        const description = hasRestrictedRole
            ? "Unfortunately, due to your position, you cannot have a custom color."
            : "You don't have any color roles available to you.";
        return embed.setDescription(description).setColor(Colors.Red);
    }

    return embed
        .setDescription(
            `You can unlock more color roles by leveling up! Check <#1132118507694330047> for more info. Here are all the color roles available to you:\n\n${availableRoles
                .map(
                    (x, i) =>
                        `<@&${x}>${
                            i + 1 !== availableRoles.length
                                ? (i + 1) % 3 === 0
                                    ? "\n"
                                    : ", "
                                : ""
                        }`,
                )
                .join("")}`,
        )
        .setColor(0xc0f6fb);
};

const roleUpdatedEmbed = (removedRoles: Role[], addedRoles: Role[]) => {
    const removedRoleText = `${removedRoles
        .map((x) => `<:minus:1103245214082142288> <@&${x.id}>`)
        .join("\n")}`;
    const addedRoleText = `${addedRoles
        .map((x) => `<:plus:1103245217794117652> <@&${x.id}>`)
        .join("\n")}`;

    if (!removedRoleText && !addedRoleText) {
        return new EmbedBuilder()
            .setTitle("Color updated")
            .setColor(Colors.Orange)
            .setDescription(`Nothing was changed`);
    }
    return new EmbedBuilder()
        .setTitle("Color updated")
        .setColor(Colors.Green)
        .setDescription(
            `${[removedRoleText, addedRoleText]
                .filter((x) => x)
                .map((x) => `${x}`)
                .join("\n")}`,
        );
};
export const color = buildCommand<SlashCommand>({
    command: new SlashCommandBuilder()
        .setName(`color`)
        .setDescription(`Change your color`)
        .setDMPermission(false)
        .addRoleOption((option) =>
            option
                .setName("color")
                .setDescription("The color")
                .setRequired(false),
        ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        const colors = await getColorRoles(i.member);
        if (!is.array(colors)) {
            return r.edit({
                embeds: [availableRolesEmbed([], i.member)],
            });
        }
        const role = i.options.getRole("color", false);
        if (!role) {
            return r.edit({
                embeds: [availableRolesEmbed(colors, i.member)],
            });
        }

        // Check if user chosen role is available
        if (!colors.includes(role.id)) {
            return r.edit({
                embeds: [availableRolesEmbed(colors, i.member)],
            });
        }
        let roles = [...i.member.roles.cache.keys()];
        const removedRoles: Role[] = [];

        // Remove all colored roles, apply the one user selected
        const allColorRoles = await getAllColorRoles();
        if (is.array(allColorRoles)) {
            for (const role of i.member.roles.cache.values()) {
                if (allColorRoles.includes(role.id)) {
                    removedRoles.push(role);
                    roles = roles.filter((c) => c !== role.id);
                }
            }
        }
        roles.push(role.id);

        await i.member
            .edit({
                roles,
                reason: `Updated color roles.`,
            })
            .catch(noop);

        await r.edit({
            embeds: [roleUpdatedEmbed(removedRoles, [role])],
        });
    },
});
