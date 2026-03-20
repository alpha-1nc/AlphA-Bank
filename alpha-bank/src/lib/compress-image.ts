const MAX_DIM = 800;
const MAX_SIZE_BYTES = 400_000; // ~400KB
const INITIAL_QUALITY = 0.75;

/**
 * Compress image (File or data URL) to reduce base64 size for Server Action payload.
 * Returns data URL or original URL if not compressible.
 */
export async function compressImageForUpload(
  source: File | string
): Promise<string> {
  if (typeof source === "string" && !source.startsWith("data:")) {
    return source;
  }

  const img = await loadImage(source);
  if (!img) return typeof source === "string" ? source : "";

  const [w, h] = img.width > img.height
    ? [MAX_DIM, Math.round((MAX_DIM * img.height) / img.width)]
    : [Math.round((MAX_DIM * img.width) / img.height), MAX_DIM];

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return typeof source === "string" ? source : "";

  ctx.drawImage(img, 0, 0, w, h);

  let quality = INITIAL_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (dataUrl.length > MAX_SIZE_BYTES * 1.37 && quality > 0.2) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
}

function loadImage(source: File | string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}
