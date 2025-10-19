/**
 * @description Formats an array of image data for AI processing.
 * Each image data object should contain a Buffer and its content type.
 * @param {{Array <{Buffer: Buffer, contentType: string}}} imageDataArray
 * @returns  an array of objects formatted as expected by the AI.
 */
export default function formatImagesForAI(imageDataArray) {
  return imageDataArray.map((img) => {
    // Convert the buffer to a Base64 string
    const base64String = img.buffer.toString("base64");

    // Create the Data URI
    const dataUri = `data:${img.contentType};base64,${base64String}`;

    // Return the object in the correct format expected by the API
    return {
      type: "image_url",
      image_url: {
        url: dataUri,
      },
    };
  });
}
