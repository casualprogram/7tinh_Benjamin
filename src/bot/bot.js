import dotenv from "dotenv";
import { resolve } from "path";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config({ path: resolve("../../.env") });

const discord_token = process.env.DISCORD_BOT_TOKEN;

console.log("Discord bot token:", discord_token);

if (!discord_token) {
  throw new Error("Discord bot token is not set in the environment variables.");
}
