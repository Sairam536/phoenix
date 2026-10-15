import crypto from 'crypto';

export interface FileSignatureValidation {
  valid: boolean;
  detectedMimeType?: string;
  error?: string;
}

export function validateFileSignature(buffer: Buffer, declaredMimeType: string): FileSignatureValidation {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'File is empty or too small to inspect' };
  }

  // 1. PDF: %PDF
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return {
      valid: declaredMimeType === 'application/pdf',
      detectedMimeType: 'application/pdf',
      error: declaredMimeType !== 'application/pdf' ? 'File content is PDF but declared MIME type is different' : undefined,
    };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      valid: declaredMimeType === 'image/png',
      detectedMimeType: 'image/png',
      error: declaredMimeType !== 'image/png' ? 'File content is PNG but declared MIME type is different' : undefined,
    };
  }

  // 3. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      valid: declaredMimeType === 'image/jpeg' || declaredMimeType === 'image/jpg',
      detectedMimeType: 'image/jpeg',
      error: declaredMimeType !== 'image/jpeg' && declaredMimeType !== 'image/jpg' ? 'File content is JPEG but declared MIME type is different' : undefined,
    };
  }

  // 4. DOCX (ZIP container): 50 4B 03 04
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const isDocx = declaredMimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return {
      valid: isDocx,
      detectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      error: !isDocx ? 'File content is a ZIP/DOCX package but declared MIME type is different' : undefined,
    };
  }

  // 5. Plain text: no null bytes in the first 1KB
  const inspectLength = Math.min(buffer.length, 1024);
  let isText = true;
  for (let i = 0; i < inspectLength; i++) {
    if (buffer[i] === 0x00) {
      isText = false;
      break;
    }
  }

  if (isText && (declaredMimeType === 'text/plain' || declaredMimeType === 'text/csv')) {
    return {
      valid: true,
      detectedMimeType: declaredMimeType,
    };
  }

  return {
    valid: false,
    error: `Unsupported file signature or mismatch with declared MIME type (${declaredMimeType})`,
  };
}

export function computeSha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
