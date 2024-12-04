import { buildCommand, type SubCommand } from "@elara-services/botbuilder";
import {
    embedComment,
    generate,
    get,
    getConfirmPrompt,
    is,
    proper,
} from "@elara-services/utils";
import {
    checkName,
    getPetLimit,
    getPetRarity,
    getRandomRarity,
    pets,
    prices,
    type Pets,
} from "../../../plugins/pets";
import {
    getPets,
    getProfileByUserId,
    removeBalance,
    updatePets,
} from "../../../services";
import { getAmount, locked } from "../../../utils";

export const buy = buildCommand<SubCommand>({
    subCommand: (b) =>
        b
            .setName(`buy`)
            .setDescription(`Buy a pet`)
            .addStringOption((o) =>
                o
                    .setName(`name`)
                    .setDescription(`What do you want the pet's name to be?`)
                    .setRequired(true)
                    .setMinLength(2)
                    .setMaxLength(40),
            )
            .addStringOption((o) =>
                o
                    .setName(`animal`)
                    .setDescription(`What animal do you want to get as a pet?`)
                    .setRequired(true)
                    .addChoices(
                        ...pets.map((c) => ({ name: proper(c), value: c })),
                    ),
            ),
    defer: { silent: false },
    async execute(i, r) {
        if (!i.inCachedGuild()) {
            return;
        }
        locked.set(i);
        const name = i.options.getString("name", true);
        const animal = i.options.getString("animal", true) as Pets;
        const rarity = getRandomRarity()?.rarity;
        if (!rarity) {
            return r.edit(embedComment(`Unable to select a rarity for you...`));
        }
        const amount = prices[animal][rarity];
        if (!is.number(amount)) {
            locked.del(i.user.id);
            return r.edit(
                embedComment(
                    `Unable to get the price for (${proper(animal)} | ${proper(
                        rarity,
                    )})`,
                ),
            );
        }
        const db = await getProfileByUserId(i.user.id);
        if (db.balance < amount) {
            locked.del(i.user.id);
            return r.edit(embedComment(`You can't afford this pet!`));
        }
        if (!checkName(name)) {
            await r.edit(embedComment(`The name you provided can't be used.`));
            locked.del(i.user.id);
            return r.deleteReply(get.secs(3));
        }
        const pets = await getPets(i.user.id);
        const limit = getPetLimit(i.member);
        if (pets.pets.length >= limit) {
            locked.del(i.user.id);
            return r.edit(embedComment(`You've hit the pet limit (${limit})!`));
        }
        const confirm = await getConfirmPrompt(
            i,
            i.user,
            `Are you sure you want to buy this ${proper(rarity)} (${proper(
                animal,
            )}) for ${getAmount(amount)}?`,
            get.secs(15),
        );
        if (!confirm) {
            locked.del(i.user.id);
            return;
        }
        await removeBalance(
            i.user.id,
            amount,
            false,
            `Bought a ${proper(rarity)} (${proper(animal)}) pet!`,
        );
        pets.pets.push({
            name,
            id: generate(10),
            rarity: getPetRarity(rarity) as number,
            multiplier: 0,
            multiplierReset: Date.now() + (get.days(1) + get.hrs(2)),
            type: animal,
            cooldowns: [
                { type: "claim", ends: Date.now() + get.days(1) },
                { type: "alive", ends: Date.now() + get.days(3) },
                // If they don't feed the pet within 3 days then the pet dies, every feed resets the timer.
                // If no timer is found then one will be set for 3 days.
            ],
        });
        await updatePets(i.user.id, {
            pets: { set: pets.pets },
        });
        locked.del(i.user.id);
        return r.edit(embedComment(`You now own a pet!`, "Green"));
    },
});
