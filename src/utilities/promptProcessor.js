import { promises as fs } from "fs";
import path, { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import { callAiApi } from "./aiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env variables
dotenv.config({ path: resolve(__dirname, "../../.env") });
const promptUrl = process.env.PROMPT_URL;

if (!promptUrl) {
  throw new Error("PROMPT_URL is not set in the .env file.");
}

let systemPrompt = ""; // This will act as our cache

/**
 * @description Fetches the prompt from the Gist/URL and updates the cache.
 */
export async function reloadSystemPrompt() {
  try {
    // Add the current timestamp as a query parameter to "bust" the cache
    const cacheBustingUrl = `${promptUrl}?t=${Date.now()}`;
    const response = await axios.get(cacheBustingUrl);
    systemPrompt = response.data;
    console.log("Ok hiểu rồi nhé !");
  } catch (error) {
    console.error("Failed to fetch or cache the system prompt:", error.message);
    return;
  }
}

/**
 * Processes the user's input using the AI.
 * (This is mostly the same, just with a check)
 */
export async function generateResponse(
  userInput,
  imageUrl,
  conversationHistory = [],
  currentDate,
  isAdmin
) {
  // If the prompt isn't loaded (e.g., first run), load it.
  if (!systemPrompt) {
    console.log("Prompt is empty, loading for the first time...");
    await reloadSystemPrompt();
    if (!systemPrompt) {
      // If it *still* failed, we can't continue.
      throw new Error("System prompt could not be loaded.");
    }
  }

  try {
    const aiResponse = await callAiApi(
      systemPrompt,
      userInput,
      imageUrl,
      conversationHistory,
      currentDate,
      isAdmin
    );
    return aiResponse;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, I ran into an error trying to think of a response. 😵‍💫";
  }
}

reloadSystemPrompt();
