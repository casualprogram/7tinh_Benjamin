import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from "discord.js";
import { generateResponse } from "../utilities/promptProcessor.js";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

const discord_token = process.env.DISCORD_BOT_TOKEN;
// const PREFIX = "!Ben_oi"; // --- We don't need this anymore ---

console.log("Discord bot token:", discord_token ? "Set" : "Not Set");

if (!discord_token) {
  throw new Error(
    "Discord bot toke_n is not set in the environment variables."
  );
}

// This directory path seems unused for now, but leaving it
const shoePicsDir = resolve(__dirname, "../data/legit_sample");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

client.once("ready", () => {
  console.log(`${client.user.tag} is online and ready!`);
});

client.on("messageCreate", async (message) => {
  // Ignore messages from other bots
  if (message.author.bot) return;

  // --- NEW LOGIC: Check for mention ---
  // Check if the bot's user was mentioned in the message
  if (!message.mentions.has(client.user)) {
    return;
  }
  // ------------------------------------

  // --- Take in user prompt ---
  // Remove the bot's mention from the message to get the clean user input
  // This regex replaces <@USER_ID> or <@!USER_ID> (nickname) with an empty string
  const userInput = message.content
    .replace(/<@!?${client.user.id}>/g, "")
    .trim();

  // If there's no text after the mention (e.g., just "@MyBotName"), do nothing
  if (!userInput) return;

  // Show a "Bot is typing..." indicator
  await message.channel.sendTyping();

  try {
    // --- processing the prompt and generate response ---
    // Call our new utility function and wait for the AI response
    const aiResponse = await generateResponse(userInput);

    // --- send back to user ---
    // message.reply() is perfect as it pings the user back
    message.reply(aiResponse);
  } catch (error) {
    console.error("Error in messageCreate:", error);
    message.reply("Something went very wrong. Please try again later.");
  }
});

client.login(discord_token).catch((error) => {
  console.error("Failed to login to Discord:", error);
});
