/** @param {File} file @returns {Promise<ImageBitmap>} */
export async function fileToImageBitmap(file) {
  if (!(file instanceof File)) {
    throw new Error("Esperado File para conversão em ImageBitmap.");
  }
  return await createImageBitmap(file);
}

