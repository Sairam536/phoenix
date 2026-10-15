import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (geminiClient) return geminiClient;
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === '' || env.GEMINI_API_KEY === 'your-gemini-api-key') {
    logger.warn('GEMINI_API_KEY is not configured. AI requests will use synthetic local processing fallback.');
    return null;
  }

  try {
    geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    logger.info({ model: env.GEMINI_MODEL }, 'Google GenAI SDK initialized successfully.');
    return geminiClient;
  } catch (err) {
    logger.error({ err }, 'Failed to initialize Google GenAI SDK');
    return null;
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '' && env.GEMINI_API_KEY !== 'your-gemini-api-key');
}
