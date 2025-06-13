import openai from "../services/openai.js";
import fs from "fs";
import path from "path";

export default async function analyzeImagesWithAI(
  userImagesPayload,
  referenceImagesPayload,
  sku
) {
  console.log("starting analysis for SKU:", sku);

  const promptPath = path.resolve("../data/prompts/legit_check.prompt");
  const fetchPrompt = fs.readFileSync(promptPath, "utf-8");
  const prompt = fetchPrompt.replace("${sku}", sku);
  try {
    const messagePayload = [
      { type: "text", text: "--- REFERENCE IMAGES (Authentic) ---" },
      ...referenceImagesPayload,
      { type: "text", text: "--- USER IMAGES (To Be Authenticated) ---" },
      ...userImagesPayload,
      { type: "text", text: prompt },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: messagePayload }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const aiResonseContent = response.choices[0].message.content;
    console.log(`AI Response: ${aiResonseContent}`);

    const parsedResult = JSON.parse(aiResonseContent);

    console.log("Parsed AI Result:", parsedResult);
    return parsedResult;
  } catch (error) {
    console.error("Error during AI analysis:", error);
    throw new Error("Failed to analyze images with AI");
  }
}
