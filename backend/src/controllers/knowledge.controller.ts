import { Request, Response } from 'express';
import { knowledgeService } from '../services/knowledge.service.js';

export class KnowledgeController {
  async ask(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const userId = req.user!.id;

    const answer = await knowledgeService.askQuestion(orgId, userId, req.body);
    res.json({
      success: true,
      data: answer,
    });
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const history = await knowledgeService.getHistory(orgId, 20);
    res.json({
      success: true,
      data: history,
    });
  }
}

export const knowledgeController = new KnowledgeController();
