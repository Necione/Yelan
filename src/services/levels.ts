import "dotenv/config";

import { Leveling } from "@elara-services/leveling";
import { error, is } from "@elara-services/utils";
import client from "../client";
import { checkIfDeploy } from "../scripts/checks";

if (!is.string(process.env.LEVELING_URL)) {
    error(
        `[LEVELING:ERROR]: No database URL found to use. (LEVELING_URL="xxx")`,
    );
    process.exit(1);
}
let levels: Leveling;

if (!checkIfDeploy()) {
    levels = new Leveling(client, process.env.LEVELING_URL as string);
}
export { levels };
