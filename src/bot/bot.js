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
const adminUserId = process.env.ADMIN_USER_ID;
const adminRoleId = process.env.ADMIN_ROLE_ID;
const logWebhookUrl = process.env.LOG_WEBHOOK_URL;

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

  if (!isMentioned && conversationHistory.length === 0) {
    return;
  }

  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment.contentType?.startsWith("image/")) {
      imageUrl = attachment.url;
      console.log("Image found:", imageUrl);
    }
  }

  if (!userInput && !imageUrl && conversationHistory.length === 0) {
    return;
  }

  try {
    await message.channel.sendTyping();
  } catch (typingError) {
    // LỖI "CHÍ MẠNG" (CRITICAL BUG) 50001 (ĐÉO CÓ QUYỀN)
    if (typingError.code === 50001) {
      console.warn(
        `ĐM THUA: Đéo "type" (gõ) được trong channel: ${message.channel.name}. (Missing Access)`
      );

      // --- LOGIC "NÉM LỖI" (THROW ERROR) QUA "WEBHOOK" (WEBHOOK) ---
      if (logWebhookUrl) {
        try {
          // "Tạo" (Build) cái "cục gạch" (brick) "lỗi" (error)
          const errorMessage =
            `SẾP ƠI CỨU TUI! <@${adminUserId}>\n` +
            `Tui bị lỗi **50001: Missing Access** (đéo có quyền) khi tui 'cố' 'type' (gõ) trong kênh: **#${message.channel.name}** (ID: ${message.channel.id})\n` +
            `Sếp 'check' (kiểm tra) lẹ cái 'permission' (quyền) **View Channel** và **Send Messages** của tui trong kênh đó đi. Đm thua. 💀`;
          await axios.post(logWebhookUrl, {
            content: errorMessage,
            username: "Ben Lỗi (Bot Errors)",
          });
        } catch (logError) {
          console.error(
            `ĐM THUA HƠN NỮA: Đéo "gửi log" (send log) qua "webhook" (webhook) được. Lỗi: ${logError.message}`
          );
        }
      }
    } else {
      console.warn("LỖI 'SEND TYPING' (IGNORING):", typingError.message);
    }
  }

  const currentDate = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    timeZoneName: "short",
  });

  let isAdmin = false;
  if (message.member && message.member.roles.cache.has(adminRoleId)) {
    isAdmin = true;
    console.log("ADMIN HỎI !");
  }

  try {
    // --- processing the prompt and generate response ---
    const aiResponse = await generateResponse(
      userInput,
      imageUrl,
      conversationHistory,
      currentDate,
      isAdmin
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
