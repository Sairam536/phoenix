import { Request, Response, NextFunction } from 'express';
import { getSupabaseAnonClient } from '../config/supabase.js';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // 1. Check if token exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If demo mode is enabled and request is from localhost or demo token, provide default owner user
    if (env.ENABLE_DEMO_MODE || env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@apexlogistics.demo',
        name: 'Alex Rivera (Apex Owner)',
      };
      return next();
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Missing Bearer token.',
        requestId: req.id,
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  // 2. Demo token check
  if (token === 'demo-token' || token === 'demo-owner-token') {
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@apexlogistics.demo',
      name: 'Alex Rivera (Apex Owner)',
    };
    return next();
  }

  if (token === 'demo-reviewer-token') {
    req.user = {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'reviewer@apexlogistics.demo',
      name: 'Taylor Chen (Senior Reviewer)',
    };
    return next();
  }

  // 3. Supabase verification
  const supabase = getSupabaseAnonClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication session.',
            requestId: req.id,
          },
        });
        return;
      }

      req.user = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || data.user.email,
      };
      return next();
    } catch {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_VERIFICATION_FAILED',
          message: 'Failed to verify authentication token.',
          requestId: req.id,
        },
      });
      return;
    }
  }

  // Fallback for local testing
  req.user = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@apexlogistics.demo',
    name: 'Alex Rivera (Apex Owner)',
  };
  next();
}
