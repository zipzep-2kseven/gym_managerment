import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import { createReportImageStore } from './report-image-store.js';
const invalid = (): never => { throw new AppError(400, 'INVALID_IMAGE', 'Nội dung ảnh JPEG/PNG không hợp lệ.'); };
// Preserve compressed image data; strip EXIF/XMP/IPTC/comments and PNG text/EXIF chunks.
export const stripGalleryMetadata = (bytes: Buffer, mime: string): Buffer => {
  const parts: Buffer[] = [];
  if (mime === 'image/png') {
    if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return invalid();
    parts.push(bytes.subarray(0, 8)); let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
      if (end > bytes.length) return invalid();
      const type = bytes.toString('ascii', offset + 4, offset + 8);
      if (['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'sRGB', 'gAMA', 'cHRM'].includes(type)) parts.push(bytes.subarray(offset, end));
      else if (type[0] === type[0].toUpperCase()) return invalid();
      offset = end;
      if (type === 'IEND') { if (offset !== bytes.length) return invalid(); return Buffer.concat(parts); }
    }
    return invalid();
  }
  if (mime !== 'image/jpeg' || bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) return invalid();
  parts.push(bytes.subarray(0, 2)); let offset = 2;
  while (offset < bytes.length) {
    const start = offset;
    if (bytes[offset++] !== 255) return invalid();
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 217) { if (offset !== bytes.length) return invalid(); parts.push(bytes.subarray(start, offset)); return Buffer.concat(parts); }
    if (offset + 2 > bytes.length || marker === 0 || marker === 216) return invalid();
    const length = bytes.readUInt16BE(offset), end = offset + length;
    if (length < 2 || end > bytes.length) return invalid();
    if (marker !== 254 && (!(marker >= 225 && marker <= 239) || [226, 238].includes(marker))) parts.push(bytes.subarray(start, end));
    offset = end;
    if (marker !== 218) continue;
    const scanStart = offset;
    while (offset < bytes.length) {
      if (bytes[offset] !== 255) { offset++; continue; }
      let next = offset + 1; while (bytes[next] === 255) next++;
      if (bytes[next] === 0 || (bytes[next] >= 208 && bytes[next] <= 215)) { offset = next + 1; continue; }
      break;
    }
    parts.push(bytes.subarray(scanStart, offset));
  }
  return invalid();
};
export const createGalleryImageStore = (directory = process.env.GALLERY_UPLOAD_DIR || path.resolve('data/gallery-images'), enabled = !config.isProduction) => {
  const store = createReportImageStore(directory, enabled);
  return { ...store, remove: async (key: string) => {
    if (!/^[0-9a-f-]{36}\.(png|jpg)$/.test(key)) return;
    try { await unlink(path.join(directory, key)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.error('[GALLERY_FILE_CLEANUP_FAILED]'); }
  }, save: async (id: string, input: { mime_type: string; data: string }) => {
    if (!enabled) throw new AppError(503, 'GALLERY_UPLOAD_DISABLED', 'Lưu ảnh gallery chưa được cấu hình cho môi trường này.');
    const bytes = Buffer.from(input.data, 'base64');
    if (bytes.length > 5 * 1024 * 1024 || bytes.toString('base64') !== input.data) return invalid();
    const clean = stripGalleryMetadata(bytes, input.mime_type);
    return store.save(id, { mime_type: input.mime_type, data: clean.toString('base64') });
  } };
};
