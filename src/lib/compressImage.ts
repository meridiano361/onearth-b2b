// Compress an image File to a base64 JPEG data URL under maxBytes.
// Resizes to maxDim on the longest side, then iterates quality downward.
export async function compressImageToBase64(
  file: File,
  maxBytes = 20_000,
  maxDim = 300,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Try decreasing quality until under maxBytes
        let quality = 0.7;
        const tryEncode = () => {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          // data URL base64 length → bytes: (len - prefix) * 0.75
          const prefix = 'data:image/jpeg;base64,';
          const bytes = ((dataUrl.length - prefix.length) * 3) / 4;
          if (bytes <= maxBytes || quality <= 0.1) {
            resolve(dataUrl);
          } else {
            quality = Math.max(0.1, quality - 0.1);
            tryEncode();
          }
        };
        tryEncode();
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
