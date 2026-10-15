import { describe, it, expect } from 'vitest';
import { exportService } from '../src/services/export.service.js';
import { validateFileSignature } from '../src/utils/file-signature.js';

describe('Security & Data Integrity Protection', () => {
  describe('Spreadsheet Formula Injection Prevention', () => {
    it('sanitizes cells starting with =', () => {
      const malicious = '=cmd|"/C calc"!A0';
      const sanitized = exportService.sanitizeCsvCell(malicious);
      expect(sanitized.includes("'=")).toBe(true);
    });

    it('sanitizes cells starting with +, -, @, \\t, \\r', () => {
      expect(exportService.sanitizeCsvCell('+12345').startsWith("'+")).toBe(true);
      expect(exportService.sanitizeCsvCell('-SUM(A1:A10)').startsWith("'-")).toBe(true);
      expect(exportService.sanitizeCsvCell('@SUM(B1:B10)').startsWith("'@")).toBe(true);
      expect(exportService.sanitizeCsvCell('\tmalicious').startsWith("'\t")).toBe(true);
    });

    it('escapes quotes and handles commas cleanly', () => {
      const cell = 'Hello, "World"';
      const sanitized = exportService.sanitizeCsvCell(cell);
      expect(sanitized).toBe('"Hello, ""World"""');
    });
  });

  describe('Magic Bytes / File Signature Validation', () => {
    it('detects valid PDF magic bytes (%PDF)', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\nSome text content\n%%EOF');
      const result = validateFileSignature(pdfBuffer, 'application/pdf');
      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe('application/pdf');
    });

    it('rejects fake PDF with executable or malicious content', () => {
      const fakeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00'); // DOS/Windows Executable header
      const result = validateFileSignature(fakeBuffer, 'application/pdf');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('detects PNG and JPEG magic bytes', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      expect(validateFileSignature(pngBuffer, 'image/png').valid).toBe(true);

      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(validateFileSignature(jpegBuffer, 'image/jpeg').valid).toBe(true);
    });
  });
});
