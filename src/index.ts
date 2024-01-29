import { config } from "dotenv";
config({ path: `${process.cwd()}/.env` });
import type { Shard } from "discord.js";
import { ShardingManager } from "discord.js";
const time = Date.now();
const manager = new ShardingManager(`./dist/client.js`, {
    token: process.env.TOKEN,
    totalShards: "auto",
});

manager.on("shardCreate", (shard: Shard) => {
    console.log(
        `[SHARDS]: [${((new Date().getTime() - time) / 1000).toFixed(
            2,
        )}s] Shard (${shard.id}) online.`,
    );
});

manager.spawn();
