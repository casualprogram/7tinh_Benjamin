import path from "path";

export default function getContentTypeFromUrl(url) {
  const extension = path.extname(new URL(url).pathname).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      console.warn(
        `Unsupported file extension: ${extension} for URL: ${url}, check sample images Database`
      );
      return null;
  }
}
