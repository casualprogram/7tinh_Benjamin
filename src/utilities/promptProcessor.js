import { promises as fs } from "fs";
import path, { resolve, dirname } from "path";
import { fileURLToPath } from "url";
// --- We've moved the OpenAI and dotenv imports ---

// --- Import our new AI service ---
import { callAiApi } from "./aiService.js";

// --- Setup for ES Modules (to get __dirname) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- We've removed the API Key and OpenAI client init ---

// --- Prompt Loading (This stays the same) ---
const promptFilePath = resolve(__dirname, "../data/prompts/benjamin.prompt");

let systemPrompt = ""; // We'll load this once on startup

async function loadSystemPrompt() {
  try {
    systemPrompt = await fs.readFile(promptFilePath, "utf-8");
    console.log("Ok hiểu rồi"); // This message means the prompt loaded successfully
  } catch (error) {
    console.error("Failed to load system prompt:", error);
    process.exit(1);
  }
}

/**
 * Processes the user's input using the AI.
 * This is the main function you'll export.
 * @param {string} userInput - The user's message content.
 * @returns {Promise<string>} The AI-generated response.
 */
export async function generateResponse(userInput) {
  if (!systemPrompt) {
    throw new Error("System prompt is not loaded.");
  }

  try {
    // This now calls the imported function!
    const aiResponse = await callAiApi(systemPrompt, userInput);
    return aiResponse;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, I ran into an error trying to think of a response. 😵‍💫";
  }
}

// --- Load the prompt as soon as the app starts (Stays the same) ---
loadSystemPrompt();
