export interface PhotoUpload { mime_type: 'image/jpeg' | 'image/png'; data: string }
// Re-encode to remove metadata and bound photo dimensions before upload. Server independently validates.
export const readGymPhoto = async (file: File): Promise<PhotoUpload> => {
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('Chọn ảnh JPEG hoặc PNG.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Ảnh tối đa 5 MB.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Không thể đọc ảnh. Hãy chọn ảnh JPEG/PNG hợp lệ.'); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20000000) throw new Error('Ảnh quá lớn; hãy chọn ảnh nhỏ hơn.');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Không thể đọc ảnh trên trình duyệt này.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { mime_type: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1] };
  } finally { bitmap.close(); }
};
