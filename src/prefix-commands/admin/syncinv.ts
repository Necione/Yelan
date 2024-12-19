import { type PrefixCommand } from "@elara-services/botbuilder";
import { discord, embedComment, noop } from "@elara-services/utils";
import { roles } from "../../config";
import { syncInventoryItems, syncInventoryItemsForUser } from "../../services";

export const syncinv: PrefixCommand = {
    enabled: true,
    name: "syncinv",
    locked: {
        roles: roles.main,
    },
    async execute(_, r) {
        const m = await r.loading();
        if (!m) {
            return;
        }
        if (r.args[0]) {
            const user = await discord.user(_.client, r.args[0], {
                fetch: true,
                mock: false,
            });
            if (!user || user.bot) {
                return m
                    .edit(
                        embedComment(
                            `Unable to find the user or it's a bot account`,
                        ),
                    )
                    .catch(noop);
            }
            const res = await syncInventoryItemsForUser(
                user.id,
                undefined,
                false,
            );
            return m
                .edit(embedComment(res.message, res.status ? "Green" : "Red"))
                .catch(noop);
        }
        const res = await syncInventoryItems(_.client);
        return m
            .edit(embedComment(res.message, res.status ? "Green" : "Red"))
            .catch(noop);
    },
};
