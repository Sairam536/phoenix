import { describe, it, expect } from 'vitest';
import { formatBytes, formatDate } from '../lib/utils.js';

describe('Frontend UI Formatting Utilities', () => {
  it('formats byte sizes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(2500000)).toBe('2.4 MB');
  });

  it('formats date timestamps correctly', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    const formatted = formatDate('2026-09-15T10:00:00.000Z');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('Sep');
  });
});
