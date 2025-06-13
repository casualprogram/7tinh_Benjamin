import OpenAI from "openai";
import dotenv from "dotenv";
import { resolve } from "path";

// Ensure environment variables are loaded
dotenv.config({ path: resolve("../../.env") });

const OPENAI_API_KEY = process.env.OPENAI_API;

if (!OPENAI_API_KEY) {
  throw new Error("The OPENAI_API_KEY environment variable is missing!");
}

// Create a single, shared instance of the OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Export this instance for use in other parts of our application
export default openai;
