import fs from "fs";
import https from "https";
import { resolve as resolvePath } from "path"; // Renamed to avoid conflict with Promise's resolve

/**
 * @saveImage - Function to download and save an image from a URL
 * @param {*} Attachment - Attachment object containing the image URL and name
 * @param {*} directory - Directory where the image will be saved
 * @param {*} sku - Save for an easy look up for future references
 * @returns {Promise<string>} A promise that resolves with the unique filename on success.
 */
export default function saveImage(Attachment, directory, sku) {
  // We wrap the entire logic in a new Promise
  return new Promise((resolve, reject) => {
    try {
      // get the extension of the file (png, jpeg,...)
      const fileExtention = Attachment.name.split(".").pop();
      // Create ID name
      const uniqueFileName = `${Date.now()}_${sku}.${fileExtention}`;
      // draft the path  to store the image
      const imagePath = resolvePath(directory, uniqueFileName);
      // Ensure the directory exists
      const file = fs.createWriteStream(imagePath);

      // start the down load with https
      https
        .get(Attachment.url, (response) => {
          // Check for non-successful status codes
          if (response.statusCode !== 200) {
            reject(
              new Error(
                `Failed to get '${Attachment.url}' (${response.statusCode})`
              )
            );
            return;
          }
          // Pipe the response data to the file, put it in a stream/queue
          response.pipe(file);
          file.on("finish", () => {
            file.close(() => resolve(uniqueFileName)); // Now 'resolve' is defined by the Promise
          });
        })
        // Handle errors during the request
        .on("error", (err) => {
          fs.unlink(imagePath, () => {}); //clean up empty file on error
          console.error(`Error downloading image: ${err.message}`);
          reject(err); // 'reject' is also defined by the Promise
        });
      // Handle errors during the file writing
    } catch (error) {
      console.error(`Error saving image: ${error}`);
      reject(error); // And here too
    }
  });
}
