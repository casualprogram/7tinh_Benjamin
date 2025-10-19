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
 * Calls the OpenAI API (Same as before, but references the new tool name)
 */
export async function callAiApi(system, userInput) {
  console.log("Calling OpenAI API...");

  const messages = [
    { role: "system", content: system },
    { role: "user", content: userInput },
  ];

  try {
    let completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      tools: tools,
      tool_choice: "auto",
      max_tokens: 350,
    });

    let message = completion.choices[0].message;

    while (message.tool_calls) {
      console.log("AI wants to use a tool...");
      messages.push(message);

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        // This will now correctly find "google_search" in our map
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
        messages: messages,
      });

      message = completion.choices[0].message;
    }

    return message.content;
  } catch (error) {
    console.error("Error in AI service:", error);
    throw error;
  }
}
