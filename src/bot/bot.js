import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from "discord.js";
// --- MODIFIED: Import the reload function ---
import {
  generateResponse,
  reloadSystemPrompt,
} from "../utilities/promptProcessor.js";

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

const discord_token = process.env.DISCORD_BOT_TOKEN2;
// --- NEW: Get the admin ID from .env ---
const adminUserId = process.env.ADMIN_USER_ID;

console.log("Discord bot token:", discord_token ? "Set" : "Not Set");

if (!discord_token) {
  throw new Error("Discord bot token is not set in the environment variables.");
}
// ... (client setup is the same) ...
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

// Helper function (same as before)
function buildOpenAiContent(message) {
  // ... (this function is unchanged) ...
  const content = [
    {
      type: "text",
      text: message.content,
    },
  ];

  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment?.contentType?.startsWith("image/")) {
      content.push({
        type: "image_url",
        image_url: { url: attachment.url },
      });
    }
  }
  return content;
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const isMentioned = message.mentions.has(client.user);

  // --- MODIFIED: Get clean input first ---
  const userInput = message.content
    .replace(/<@!?${client.user.id}>/g, "")
    .trim();

  // --- NEW: Check for reload command FIRST ---
  if (isMentioned && userInput.toLowerCase() === "reload prompt") {
    if (message.author.id === adminUserId) {
      try {
        await reloadSystemPrompt();
        return message.reply(
          "Ok ní, tui 'reload' cái prompt xong rồi. Hệ tư tưởng mới đã được cập nhật! 🔥"
        );
      } catch (err) {
        return message.reply(
          "U là trời, 'reload' bị lỗi rồi bro. Check lại cái link Gist coi."
        );
      }
    } else {
      return message.reply(
        "Haha, 'out trình' rồi bro. Chỉ 'sếp' tui mới 'reload' được thôi. 😜"
      );
    }
  }
  // --- END OF RELOAD CHECK ---

  // --- Existing reply/mention logic continues... ---
  let imageUrl = null;
  let conversationHistory = [];
  const isReply = message.reference && message.reference.messageId;

  // --- CHECK 1: Is this a reply to our bot? ---
  if (isReply) {
    try {
      const repliedToMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );

      if (repliedToMessage.author.id === client.user.id) {
        console.log("This is a follow-up reply.");
        conversationHistory.push({
          role: "assistant",
          content: repliedToMessage.content,
        });

        if (
          repliedToMessage.reference &&
          repliedToMessage.reference.messageId
        ) {
          const originalUserMessage = await message.channel.messages.fetch(
            repliedToMessage.reference.messageId
          );
          conversationHistory.unshift({
            role: "user",
            content: buildOpenAiContent(originalUserMessage),
          });
        }
      }
    } catch (err) {
      console.warn("Could not fetch reply chain:", err);
    }
  }

  // --- CHECK 2: Should the bot respond? ---
  if (!isMentioned && conversationHistory.length === 0) {
    return;
  }

  // --- Process the *new* user's image (if any) ---
  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment.contentType?.startsWith("image/")) {
      imageUrl = attachment.url;
      console.log("Image found:", imageUrl);
    }
  }

  // --- Check if there is ANY input (text or image) ---
  // (This check now uses the userInput variable from the top)
  if (!userInput && !imageUrl && conversationHistory.length === 0) {
    return;
  }

  // Show a "Bot is typing..." indicator
  await message.channel.sendTyping();

  try {
    // --- processing the prompt and generate response ---
    const aiResponse = await generateResponse(
      userInput,
      imageUrl,
      conversationHistory
    );

    message.reply(aiResponse);
  } catch (error) {
    console.error("Error in messageCreate:", error);
    message.reply("Lên lương thì tui làm tiếp nha Ní :))))))");
  }
});

client.login(discord_token).catch((error) => {
  console.error("Failed to login to Discord:", error);
});
