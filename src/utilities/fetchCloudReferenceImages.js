import { supabase } from "../services/supabaseClient.js";

export default async function fetchCloudReferenceImages(sku) {
  try {
    console.log(`Fetching reference images for SKU: ${sku}`);
    // Fetch reference images from Supabase storage

    const { data, error } = await supabase
      .from("shoes") // select the 'shoes' table
      .select("name", "image_urls") // only want 'name' and 'images_urls' columns
      .eq("sku", sku) // find row WHERE sku is equal to the provided {sku}
      .single(); //only one/single object is expected

    if (error) {
      console.error(`Error fetching images for SKU ${sku}:`, error.message);
      return null;
    }

    if (!data) {
      console.log(`No images found for SKU ${sku}`);
      return null;
    }

    return {
      name: data.name,
      imageUrls: data.image_urls,
    };
  } catch (error) {
    console.error(`Error fetching reference images for SKU ${sku}:`, error);
    return null;
  }
}
