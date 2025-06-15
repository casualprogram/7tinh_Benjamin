import path from "path";

/**
 * @description - Determines the content type based on the file extension.
 * @param {String } fileName
 * @returns - {String|null} - The content type of the file or null if unsupported.
 */

export default function getContentType(fileName) {
  // Extract the file extension from the file name
  const extension = path.extname(fileName).toLowerCase();
  // Determine the content type based on the file extension
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return null;
  }
}
