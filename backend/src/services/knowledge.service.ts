import {
  AskQuestionInput,
  KnowledgeAnswerResponse,
  KnowledgeAnswerResponseSchema,
  KnowledgeSourceReference,
} from '../shared/index.js';
import { inMemoryDb } from '../repositories/db.js';
import { geminiService } from '../ai/gemini-client.js';
import { buildKnowledgePrompt } from '../ai/prompts/index.js';
import { logger } from '../utils/logger.js';

export class KnowledgeService {
  /**
   * Grounded Question Answering across authorized organization documents
   */
  async askQuestion(
    orgId: string,
    userId: string,
    input: AskQuestionInput
  ): Promise<KnowledgeAnswerResponse> {
    const { question, document_ids, category } = input;

    // 1. Retrieve authorized documents
    let docs = inMemoryDb.documents.filter(d => d.organization_id === orgId);

    if (document_ids && document_ids.length > 0) {
      const allowedSet = new Set(document_ids);
      docs = docs.filter(d => allowedSet.has(d.id));
    }

    if (category) {
      docs = docs.filter(d => d.category === category);
    }

    const docMap = new Map(docs.map(d => [d.id, d]));

    // 2. Retrieve extracted pages for these documents
    const docIdSet = new Set(docs.map(d => d.id));
    const pages = inMemoryDb.pages.filter(p => docIdSet.has(p.document_id));

    if (pages.length === 0) {
      return {
        answer: 'No relevant processed documents were found in your organization matching the requested scope.',
        supported: false,
        sources: [],
        limitations: ['No authorized document pages available for retrieval.'],
      };
    }

    // 3. Keyword / Relevance Ranking
    const terms = question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2);

    const scoredPages = pages.map(page => {
      const textLower = page.extracted_text.toLowerCase();
      let score = 0;
      terms.forEach(t => {
        const matches = textLower.split(t).length - 1;
        score += matches;
      });
      return { page, score };
    });

    // Sort by relevance score
    scoredPages.sort((a, b) => b.score - a.score);

    // Take top 5 most relevant pages
    const topPages = scoredPages.slice(0, 5).map(sp => ({
      document_id: sp.page.document_id,
      title: docMap.get(sp.page.document_id)?.title || 'Untitled Document',
      page: sp.page.page_number,
      text: sp.page.extracted_text,
    }));

    // 4. Build bounded Gemini prompt
    const prompt = buildKnowledgePrompt(question, topPages);

    // 5. Invoke Gemini with Zod validation
    const response = await geminiService.generateStructured(
      prompt,
      KnowledgeAnswerResponseSchema,
      'knowledge'
    );

    // 6. Verify citations: ensure returned document_ids belong to the retrieved set
    const validSources: KnowledgeSourceReference[] = (response.sources || []).filter(source => {
      const isRetrieved = topPages.some(tp => tp.document_id === source.document_id);
      return isRetrieved;
    });

    // Populate titles if missing
    validSources.forEach(s => {
      if (!s.document_title) {
        s.document_title = docMap.get(s.document_id)?.title || 'Document';
      }
    });

    // Record in database query history
    inMemoryDb.knowledgeQueries.push({
      id: crypto.randomUUID(),
      organization_id: orgId,
      user_id: userId,
      question,
      answer: response.answer,
      source_references: validSources,
      status: 'completed',
      model_name: 'gemini',
      prompt_version: 'v1.0',
      error_code: null,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    return {
      answer: response.answer,
      supported: response.supported && validSources.length > 0,
      sources: validSources,
      limitations: response.limitations || [],
    };
  }

  /**
   * Get query history for the user and organization
   */
  async getHistory(orgId: string, limit = 20) {
    return inMemoryDb.knowledgeQueries
      .filter(q => q.organization_id === orgId)
      .slice(-limit)
      .reverse();
  }
}

export const knowledgeService = new KnowledgeService();
