import openai from "../services/openai.js";
import fs from "fs";
import path from "path";

/**
 * @description Analyzes user images against reference images using OpenAI's GPT-4o model.
 * @param {Array} userImagesPayload
 * @param {Array} referenceImagesPayload
 * @param {String} sku
 * @returns {Promise<Object>} - The parsed AI response containing analysis results.
 */
export default async function analyzeImagesWithAI(
  userImagesPayload,
  referenceImagesPayload,
  sku
) {
  console.log("starting analysis for SKU:", sku);
  // Construct the path to the prompt file
  const promptPath = path.resolve("../data/prompts/legit_check.prompt");
  const fetchPrompt = fs.readFileSync(promptPath, "utf-8");
  // Replace the placeholder in the prompt with the actual SKU
  const prompt = fetchPrompt.replace("${sku}", sku);

  try {
    // Prepare the message payload for the AI model
    const messagePayload = [
      { type: "text", text: "--- REFERENCE IMAGES (Authentic) ---" },
      ...referenceImagesPayload,
      { type: "text", text: "--- USER IMAGES (To Be Authenticated) ---" },
      ...userImagesPayload,
      { type: "text", text: prompt },
    ];

    // Log the message payload for debugging and setup OPENAI request
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: messagePayload }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    // Log the response from the AI model
    const aiResonseContent = response.choices[0].message.content;
    console.log(`AI Response: ${aiResonseContent}`);

    // Parse the AI response content
    const parsedResult = JSON.parse(aiResonseContent);

    console.log("Parsed AI Result:", parsedResult);
    return parsedResult;
  } catch (error) {
    console.error("Error during AI analysis:", error);
    throw new Error("Failed to analyze images with AI");
  }
}
