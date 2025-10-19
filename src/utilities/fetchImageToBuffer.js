import axios from "axios";

/**
 * @description Fetches an image from a given URL and returns it as a Buffer.
 * @param {string} url - The URL of the image to fetch
 * @returns {Promise<Buffer>} A promise that resolves with the image data as a Buffer.
 */
export default async function fetchImageToBuffer(url) {
  try {
    // create an axios instance with default headers
    const response = await axios.get(url, {
      responseType: "arraybuffer", // this ensures we get the data as a buffer
    });
    // check if the response is successful
    return Buffer.from(response.data, "binary");
  } catch (error) {
    // log the error and rethrow it for further handling
    console.error(`Failed to fetch image from ${url}`);
    throw error;
  }
}
