import { createWorker } from 'tesseract.js';
import { logger } from '../utils/logger.js';

export class OcrService {
  /**
   * Run OCR on image buffer using Tesseract.js
   */
  async recognizeImage(buffer: Buffer): Promise<string> {
    try {
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();
      return (data.text || '').trim();
    } catch (err) {
      logger.error({ err }, 'Tesseract OCR recognition failed');
      throw new Error(`OCR processing failed: ${(err as Error).message}`);
    }
  }
}

export const ocrService = new OcrService();
