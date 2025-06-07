import dotenv from "dotenv";
import { resolve } from "path";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import fs from "fs";
import https from "https";

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

  //   // SAVE IMAGES LOGIC
  //   if (
  //     message.channel.isThread() && // Check if the message is in a thread
  //     message.channel.name.startsWith("Legit Check:") // Check if the message is in a thread that starts with "Legit Check:"
  //   ) {
  //     // Check if the message has attachments
  //     if (message.attachments.size > 0) {
  //       for (const attachment of message.attachments.values()) {
  //         // Check if the attachment is an image
  //         if (attachment.contentType?.startsWith("image/")) {
  //           try {
  //             // Create the shoePics directory if it doesn't exist
  //             const fileExtension = attachment.name.split(".").pop();
  //             const uniqueFilenName = `${Date.now()}-${Math.random()
  //               .toString(36)
  //               .substring(2, 15)}.${fileExtension}`;
  //             const imagePath = resolve(shoePicsDir, uniqueFilenName);

  //             //DownLload the image
  //             const file = fs.createWriteStream(imagePath);

  //             // Use https to download the image
  //             https
  //               .get(attachment.url, (response) => {
  //                 response.pipe(file);
  //                 file.on("finish", () => {
  //                   file.close();
  //                   console.log(
  //                     `Image downloaded and saved as ${uniqueFilenName}`
  //                   );
  //                   message.react("✅");
  //                 });
  //               })
  //               .on("error", (err) => {
  //                 console.error(`Error downloading image: ${err.message}`);
  //                 message.react(
  //                   "Tới đây cái làm biếng quá, thôi thôi kêu ông Tín đi nha"
  //                 );
  //               });
  //           } catch (err) {
  //             console.log("Error processing attachment :", err);
  //           }
  //         }
  //       }
  //     }
  //   }

  if (message.content.startsWith(PREFIX)) {
    const [CMD_NAME, ...args] = message.content
      .trim()
      .substring(PREFIX.length)
      .split(/\s+/);

    console.log(`Command received: ${CMD_NAME} \nwith args: ${args.join(" ")}`);

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

        const message_tu_user = await legitCheckThread.messages.fetch();

        await message.reply(`Mại vô mại vô : ${legitCheckThread.toString()}`);
      } catch (error) {
        console.error("Error creating thread:", error);
        return message.reply("tui lam bieng qua, lien he admin nhe");
      }
    }
  }
});

client.login(discord_token).catch((error) => {
  console.error("Failed to login to Discord:", error);
});
