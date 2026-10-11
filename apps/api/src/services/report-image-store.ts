import { mkdir, writeFile, unlink, readFile, chmod } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../utils/errors.js';
import { config } from '../config/index.js';
const jpegPixels = (bytes: Buffer) => {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 255) return 0;
    while (bytes[offset] === 255) offset++;
    if (offset + 3 > bytes.length) return 0;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) return 0;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return 0;
    if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
      if (length < 8) return 0;
      return bytes.readUInt16BE(offset + 3) * bytes.readUInt16BE(offset + 5);
    }
    offset += length;
  }
  return 0;
};
export const createReportImageStore = (directory = process.env.REPORT_UPLOAD_DIR || path.resolve('data/report-images'), enabled = !config.isProduction) => ({
  save: async (id: string, input: { mime_type: string; data: string }) => {
    if (!enabled) throw new AppError(503, 'REPORT_UPLOAD_DISABLED', 'Lưu ảnh báo cáo chưa được cấu hình cho môi trường này.');
    const bytes = Buffer.from(input.data, 'base64');
    if (bytes.length > 5 * 1024 * 1024 || bytes.toString('base64') !== input.data) throw new AppError(400, 'INVALID_IMAGE', 'Ảnh phải nhỏ hơn hoặc bằng 5 MB.');
    const png = bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16) === 'IHDR' && bytes.readUInt32BE(8) === 13 && bytes.subarray(-12).equals(Buffer.from([0,0,0,0,73,69,78,68,174,66,96,130]));
    const jpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217;
    if ((input.mime_type === 'image/png' && !png) || (input.mime_type === 'image/jpeg' && !jpeg)) throw new AppError(400, 'INVALID_IMAGE', 'Nội dung ảnh JPEG/PNG không hợp lệ.');
    if (png && (!bytes.readUInt32BE(16) || !bytes.readUInt32BE(20) || bytes.readUInt32BE(16) * bytes.readUInt32BE(20) > 20000000)) throw new AppError(400, 'INVALID_IMAGE', 'Kích thước ảnh quá lớn.');
    if (jpeg && (!jpegPixels(bytes) || jpegPixels(bytes) > 20000000)) throw new AppError(400, 'INVALID_IMAGE', 'Ảnh JPEG không hợp lệ hoặc kích thước quá lớn.');
    const name = `${id}.${png ? 'png' : 'jpg'}`;
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    await writeFile(path.join(directory, name), bytes, { flag: 'wx', mode: 0o600 });
    return name;
  },
  remove: async (name: string) => { await unlink(path.join(directory, name)).catch(() => {}); },
  read: async (name: string) => {
    if (!/^[0-9a-f-]{36}\.(png|jpg)$/.test(name)) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh báo cáo.');
    try { return { bytes: await readFile(path.join(directory, name)), mime: name.endsWith('.png') ? 'image/png' : 'image/jpeg' }; }
    catch { throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy ảnh báo cáo.'); }
  },
});
