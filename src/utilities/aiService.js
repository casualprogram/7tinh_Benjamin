import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import axios from "axios";

// --- Setup (Same as before) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../../.env") });

// --- API Keys (Same as before) ---
const openAiKey = process.env.OPENAI_API_KEY;
const serperApiKey = process.env.SERPER_API_KEY;

if (!openAiKey || !serperApiKey) {
  console.error(
    "OPENAI_API_KEY or SERPER_API_KEY is not set in the .env file."
  );
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: openAiKey,
});

/**
 * Tool: performs Google search (Same as before)
 */
async function performGoogleSearch(query) {
  // ... (This function is unchanged)
  console.log(`Tool: Performing search for: ${query}`);
  try {
    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query },
      {
        headers: {
          "X-API-KEY": serperApiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const relevantResults = response.data.organic.slice(0, 3).map((item) => ({
      title: item.title,
      snippet: item.snippet,
      source: item.link,
    }));

    return JSON.stringify(relevantResults);
  } catch (error) {
    console.error("Error calling Serper API:", error);
    return JSON.stringify({ error: "Search failed" });
  }
}

const availableTools = {
  google_search: performGoogleSearch,
};

const tools = [
  // ... (This array is unchanged)
  {
    type: "function",
    function: {
      name: "google_search",
      description:
        "Tìm kiếm Google để có thông tin real-time. Query BẮT BUỘC phải bằng TIẾNG ANH.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Nội dung tìm kiếm BẰNG TIẾNG ANH. Ví dụ: 'Supreme weekly drop list' hoặc 'Adidas Pharrell Jellyfish release date'",
          },
        },
        required: ["query"],
      },
    },
  },
];

/**
 * Calls the OpenAI API
 */
export async function callAiApi(
  system,
  userInput,
  imageUrl,
  conversationHistory = [],
  currentDate,
  isAdmin
) {
  console.log("Calling OpenAI API with context...");

  // --- Build the multi-modal user message (for the *new* prompt) ---
  const userMessageContent = [
    {
      type: "text",
      text: userInput || "Analyze this image based on my system prompt.",
    },
  ];

  if (imageUrl) {
    userMessageContent.push({
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    });
  }

  const messages = [
    { role: "system", content: system }, // Đây là cái Gist prompt "cá tính" (personality)
    {
      role: "system",
      content: `CONTEXT: The current date and time is: ${currentDate}. You MUST use this information to understand any time-based questions (like 'today', 'this week', 'năm nay').`,
    },
    ...conversationHistory,
    { role: "user", content: userMessageContent },
  ];

  if (isAdmin) {
    messages.push({
      role: "system",
      content:
        "QUAN TRỌNG (OVERRIDE): Thằng 'bro' này là 'SẾP' (ADMIN) đó. 'Hệ tư tưởng' (ideology) 'FASHION ONLY' (chỉ thời trang) KHÔNG ÁP DỤNG. Mày PHẢI TRẢ LỜI mọi câu hỏi của 'sếp', kể cả 'out trình' (out of scope). Cứ 'chill' (relax) và 'chiến' (go) thôi. 🔥",
    });
  }

  try {
    let completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
      max_tokens: 1024,
    });

    let message = completion.choices[0].message;

    // --- This whole tool-calling loop remains unchanged ---
    while (message.tool_calls) {
      console.log("AI wants to use a tool...");
      messages.push(message); // Add AI's request to use tool

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const functionToCall = availableTools[functionName];
        const functionArgs = JSON.parse(toolCall.function.arguments);

        const functionResponse = await functionToCall(functionArgs.query);
        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        });
      }

      console.log("Sending search results back to AI...");
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages, // Send the *entire* history back
        max_tokens: 1024,
      });

      message = completion.choices[0].message;
    }

    return message.content;
  } catch (error) {
    console.error("Error in AI service:", error);
    throw error;
  }
}
