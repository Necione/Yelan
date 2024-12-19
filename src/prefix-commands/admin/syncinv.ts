import { type PrefixCommand } from "@elara-services/botbuilder";
import { embedComment } from "@elara-services/utils";
import { roles } from "../../config";
import { syncInventoryItems } from "../../services";

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
        const res = await syncInventoryItems(_.client);
        return m.edit(embedComment(res.message, res.status ? "Green" : "Red"));
    },
};
