import dotenv from "dotenv";
import { resolve } from "path";
import { Client, GatewayIntentBits, Partials, EmbedBuilder } from "discord.js";
import fetchSampleImages from "../utilities/fetchSampleImages.js";
import fetchImageToBuffer from "../utilities/fetchImageToBuffer.js";
import formatImagesForAI from "../utilities/formatImagesForAI.js";
import analyzeImagesWithAI from "../utilities/analyzeImageesWithAI.js";

dotenv.config({ path: resolve("../../.env") });

const discord_token = process.env.DISCORD_BOT_TOKEN;
const PREFIX = "!7tinh_";

console.log("Discord bot token:", discord_token ? "Set" : "Not Set");

if (!discord_token) {
  throw new Error(
    "Discord bot toke_n is not set in the environment variables."
  );
}

const shoePicsDir = resolve("../data/legit_sample");

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

    console.log(
      `Command received: ${CMD_NAME} \nwith shoe name: ${args.join(" ")}`
    );

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
        // STEP 1 - FETCH REFERENCE IMAGES
        // fetch sample images for the given SKU
        const referenceImageBuffers = fetchSampleImages(sku, shoePicsDir);

        if (!referenceImageBuffers || referenceImageBuffers.length === 0) {
          return message.reply(
            `không tìm thấy hình ảnh mẫu cho mẫu SKU : ${sku} này. Vui lòng kiểm tra lại SKU hoặc liên hệ ông tín nha.`
          );
        }

        // get all messages in the thread so far
        const allMessage = await message.channel.messages.fetch({ limit: 100 });
        const chatHist = []; // store chat history for context
        const imageAttachments = []; // store image attachments from the user

        // iterate through ever message
        for (const msg of allMessage.values()) {
          // if message is the command then we skip
          if (msg.id === message.id) continue;

          // store message history for context
          if (msg.MessageContent) {
            chatHist.push({
              role: "user",
              content: msg.content,
            });
          }

          // console.log(`Message from ${msg.author.tag}: ${msg.content}`);

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

        // map through image and fetch image buffer type and storage in a format that
        //      Vision API can easily read
        const userImagePromises = imageAttachments.map(async (att) => {
          const buffer = await fetchImageToBuffer(att.url);
          return {
            buffer,
            contentType: att.contentType,
          };
        });

        // store the final result when all promise completed
        const userImageData = await Promise.all(userImagePromises);

        // await message.reply(
        //   `đã nhận ${userImageBuffers.length} hình ảnh từ bạn`
        // );

        // STEP 2 - FORMAT IMAGES FOR AI
        // format both user and reference images for AI

        const userImagesPayload = formatImagesForAI(userImageData);
        const referenceImagesPayload = formatImagesForAI(referenceImageBuffers);

        // STEP 3 - ANALYZE IMAGES WITH AI
        await message.channel.sendTyping();
        const aiResult = await analyzeImagesWithAI(
          userImagesPayload,
          referenceImagesPayload,
          sku
        );

        console.log(`AI Analysis Result: ${aiResult}`);

        const resultEmbed = new EmbedBuilder()
          .setColor(
            aiResult.verdict === "Likely Authentic" ? 0x00ff00 : 0xff0000
          ) // Green for authentic, Red for replica
          .setTitle(`Legit Check Result for: ${sku}`)
          .setAuthor({
            name: "7tinh AI Authenticator",
            iconURL: client.user.displayAvatarURL(),
          })
          .addFields(
            { name: "Verdict", value: `**${aiResult.verdict}**`, inline: true },
            {
              name: "Confidence",
              value: `**${aiResult.confidence_percentage}%**`,
              inline: true,
            },
            {
              name: "Analysis Details",
              value: `- ${aiResult.analysis_details.join("\n- ")}`,
            } // Format array into a bulleted list
          )
          .setThumbnail(imageAttachments[0].url)
          .setTimestamp()
          .setFooter({ text: `powered by Casual Solutions` });

        // ---------- save the images to the shoePics directory ----------
        // const skuDir = resolve(shoePicsDir, sku);
        // // create a directory for the SKU if it doesn't exist
        // if (!fs.existsSync(skuDir)) {
        //   fs.mkdirSync(skuDir, { recursive: true });
        // }
        // const savePromises = imageAttachments.map((att) =>
        //   saveImage(att, skuDir)
        // );
        // await Promise.all(savePromises);
        // ---------- save the images to the shoePics directory ----------
        // wait for all images to be saved with Promise .all since savePromises is still saving

        await message.react("✅");
        return message.reply({ embeds: [resultEmbed] });
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
