import fs from "fs";
import path from "path";
import getContentType from "./getContentType.js";

export default function fetchSampleImages(sku, baseDirectory) {
  try {
    // construct the full path to the SKU directory
    const skuDirectory = path.join(baseDirectory, sku);

    if (!fs.existsSync(skuDirectory)) {
      console.error(`Directory for ${sku} does not exist.`);
      return null;
    }

    // read all files in the SKU directory
    const allFiles = fs.readdirSync(skuDirectory);

    console.log(`ALl files in SKU directory: ${allFiles}`);

    // filter out files that are not images based on their content type
    const referenceImages = [];

    // iterate through each file and check its content type
    for (const file of allFiles) {
      // get the content type of the file
      const contentType = getContentType(file);

      // if the content type is valid, read the file and push it to the array
      if (contentType) {
        // read the file as a buffer
        const imagePath = path.join(skuDirectory, file);
        const buffer = fs.readFileSync(imagePath);
        // push the buffer and content type to the referenceImages array
        referenceImages.push({ buffer, contentType });
      }
    }

    console.log(
      `Fetched ${referenceImages.length} sample images for SKU ${sku}`
    );

    return referenceImages;
  } catch (error) {
    console.error(`Error fetching sample images for SKU ${sku}:`, error);
    return null;
  }
}
