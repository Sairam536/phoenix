import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { ExtractionMethod } from '../shared/index.js';
import { ocrService } from './ocr.service.js';
import { logger } from '../utils/logger.js';

export interface ExtractedPageResult {
  page_number: number;
  extracted_text: string;
  extraction_method: ExtractionMethod;
  extraction_metadata: Record<string, unknown>;
}

export interface DocumentExtractionResult {
  pages: ExtractedPageResult[];
  fullText: string;
  totalPages: number;
  warnings: string[];
}

export class ExtractionService {
  async extractContent(buffer: Buffer, mimeType: string, filename: string): Promise<DocumentExtractionResult> {
    const warnings: string[] = [];

    // 1. PDF
    if (mimeType === 'application/pdf') {
      try {
        const pdfData = await pdfParse(buffer);
        const text = (pdfData.text || '').trim();

        if (!text || text.length < 20) {
          warnings.push('PDF contains little or no machine-readable digital text. Scanned document detected.');
        }

        // Split pages by form feed if available, or chunk into reasonable pages
        const rawPages = text.split(/\f|\n\s*---\s*Page \d+\s*---\s*\n/);
        const pages: ExtractedPageResult[] = [];

        if (rawPages.length > 0 && rawPages.some(p => p.trim().length > 0)) {
          rawPages.forEach((pageContent, idx) => {
            const trimmed = pageContent.trim();
            if (trimmed.length > 0 || rawPages.length === 1) {
              pages.push({
                page_number: idx + 1,
                extracted_text: trimmed,
                extraction_method: 'pdf_text',
                extraction_metadata: { numpages: pdfData.numpages },
              });
            }
          });
        }

        if (pages.length === 0) {
          pages.push({
            page_number: 1,
            extracted_text: text,
            extraction_method: 'pdf_text',
            extraction_metadata: { numpages: pdfData.numpages },
          });
        }

        return {
          pages,
          fullText: text,
          totalPages: pdfData.numpages || pages.length,
          warnings,
        };
      } catch (err) {
        logger.error({ err, filename }, 'PDF parsing failed');
        warnings.push(`PDF parsing encountered an issue: ${(err as Error).message}`);
        return {
          pages: [{ page_number: 1, extracted_text: '', extraction_method: 'pdf_text', extraction_metadata: {} }],
          fullText: '',
          totalPages: 1,
          warnings,
        };
      }
    }

    // 2. DOCX
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const result = await mammoth.extractRawText({ buffer });
        const text = (result.value || '').trim();
        if (result.messages && result.messages.length > 0) {
          result.messages.forEach(m => warnings.push(m.message));
        }

        return {
          pages: [
            {
              page_number: 1,
              extracted_text: text,
              extraction_method: 'docx_text',
              extraction_metadata: { warnings: result.messages },
            },
          ],
          fullText: text,
          totalPages: 1,
          warnings,
        };
      } catch (err) {
        logger.error({ err, filename }, 'Mammoth DOCX parsing failed');
        throw new Error(`DOCX text extraction failed: ${(err as Error).message}`);
      }
    }

    // 3. IMAGES (OCR)
    if (mimeType.startsWith('image/')) {
      try {
        const text = await ocrService.recognizeImage(buffer);
        if (!text || text.length < 5) {
          warnings.push('OCR detected no significant text in this image.');
        }

        return {
          pages: [
            {
              page_number: 1,
              extracted_text: text,
              extraction_method: 'ocr',
              extraction_metadata: { engine: 'tesseract.js' },
            },
          ],
          fullText: text,
          totalPages: 1,
          warnings,
        };
      } catch (err) {
        logger.error({ err, filename }, 'OCR extraction failed');
        warnings.push(`OCR failed: ${(err as Error).message}`);
        return {
          pages: [{ page_number: 1, extracted_text: '', extraction_method: 'ocr', extraction_metadata: {} }],
          fullText: '',
          totalPages: 1,
          warnings,
        };
      }
    }

    // 4. PLAIN TEXT / CSV
    const text = buffer.toString('utf-8').trim();
    return {
      pages: [
        {
          page_number: 1,
          extracted_text: text,
          extraction_method: 'plain_text',
          extraction_metadata: {},
        },
      ],
      fullText: text,
      totalPages: 1,
      warnings,
    };
  }
}

export const extractionService = new ExtractionService();
