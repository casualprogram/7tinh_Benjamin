import dotenv from "dotenv";
import { resolve } from "path";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import fs from "fs";
import https from "https";
import saveImage from "../utilities/save-images.js";

dotenv.config({ path: resolve("../../.env") });

const discord_token = process.env.DISCORD_BOT_TOKEN;
const PREFIX = "!7tinh_";

console.log("Discord bot token:", discord_token ? "Set" : "Not Set");

if (!discord_token) {
  throw new Error(
    "Discord bot toke_n is not set in the environment variables."
  );
}

const shoePicsDir = resolve("../data/shoePics");

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
  if (message.author.bot) return;

  if (message.content.toLocaleLowerCase() === "chịc đâu") {
    return message.reply(`?`);
  }

  if (message.content.startsWith(PREFIX)) {
    const [CMD_NAME, ...args] = message.content
      .trim()
      .substring(PREFIX.length)
      .split(/\s+/);

    console.log(`Command received: ${CMD_NAME} \nwith sku: ${args.join(" ")}`);

    if (CMD_NAME === "legitcheck") {
      // Handle the legit check command
      if (args.length === 0) {
        return message.reply("cho tui xin tên đôi giày + tên màu giày cái nè");
      }

      // limit the shoe name to 100 characters
      const shoeName = args.join(" ").slice(0, 100);

      try {
        // Create a thread in the channel where the command was issued
        const legitCheckThread = await message.channel.threads.create({
          name: `Legit Check: ${shoeName}`,
          autoArchiveDuration: 60,
          reason: `Legit check requested for ${shoeName}`,
        });

        // Send a message in the thread with instructions
        await legitCheckThread.send({
          content: `Chào ${message.author}, gửi tui mấy tấm hình của món đồ cần check,\nxong cái nào sẵn sàng thì dùng lệnh \n> \`${PREFIX}check SKU_OF_THE_SHOE\` \n\n> thí dụ : \`${PREFIX}check HV8563-600\` `,
        });

        await message.reply(`Vô đây bạn ơi: ${legitCheckThread.toString()}`);
      } catch (error) {
        console.error("Error creating thread:", error);
        return message.reply("tui lam bieng qua, lien he admin nhe");
      }

      // if the user use command check
    } else if (CMD_NAME === "check") {
      // check if message is in a legit check thread
      if (
        !message.channel.isThread() ||
        !message.channel.name.startsWith("Legit Check:")
      ) {
        // if not, remind them
        return message.reply(
          "Tạo threads trước đã !\ndùng lệnh `!7tinh_legitcheck` để tạo threads"
        );
      }
      // collect SKU
      const sku = args[0];

      // check if sku is provided
      if (!sku) {
        return message.reply("cho xin SKU của đôi giày cái");
      }

      // everything seems good, move to legit check phase
      try {
        await message.reply("Đang check đôi giày của bạn, đợi xíu nha");

        // get all messages in the thread so far

        const allMessage = await message.channel.messages.fetch({ limit: 100 });

        const chatHist = [];
        const imageAttachments = [];

        // iterate through ever message
        for (const msg of allMessage.values()) {
          // if message is the command then we skip
          if (msg.id === message.id) continue;
          if (msg.MessageContent) {
            chatHist.push({
              role: "user",
              content: msg.content,
            });
          }
          console.log(`Message from ${msg.author.tag}: ${msg.content}`);
          // if message has some sort of attachments
          if (msg.attachments.size > 0) {
            // we iterate through each attachment and check if it is an image
            for (const attachment of msg.attachments.values()) {
              if (attachment.contentType?.startsWith("image/")) {
                // push the image attachment to the array
                imageAttachments.push(attachment);
              }
            }
          }
        }

        // if no image founded, remind user
        if (imageAttachments.length === 0) {
          return message.reply("hình đâu?\nđâu thấy hình nào đâu ta?");
        }

        // save the images to the shoePics directory.
        const savePromises = imageAttachments.map((att) =>
          saveImage(att, shoePicsDir, sku)
        );

        // wait for all images to be saved with Promise .all since savePromises is still saving
        await Promise.all(savePromises);
        await message.react("✅");
        return message.reply("đã lưu hình ảnh của đôi giày");
      } catch (error) {
        console.error("Error fetching messages in the threads:", error);
        return message.reply("tui lam bieng qua, lien he admin nhe");
      }
    }
  }
});

client.login(discord_token).catch((error) => {
  console.error("Failed to login to Discord:", error);
});
