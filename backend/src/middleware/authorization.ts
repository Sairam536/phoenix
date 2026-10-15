import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../shared/index.js';
import { inMemoryDb } from '../repositories/db.js';

declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      userRole?: UserRole;
    }
  }
}

export function orgContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
    return;
  }

  // Check header, param, query, or user's first org
  const orgIdHeader =
    (req.headers['x-organization-id'] as string) ||
    req.params.organizationId ||
    (req.query.organizationId as string);

  let member = inMemoryDb.members.find(
    m => m.user_id === userId && (!orgIdHeader || m.organization_id === orgIdHeader)
  );

  // If not found with specific org, check if user belongs to any org
  if (!member) {
    member = inMemoryDb.members.find(m => m.user_id === userId);
  }

  // If still not found and demo mode, associate with the demo organization
  if (!member && inMemoryDb.organizations.length > 0) {
    const defaultOrg = inMemoryDb.organizations[0];
    member = {
      id: crypto.randomUUID(),
      organization_id: defaultOrg.id,
      user_id: userId,
      role: 'owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryDb.members.push(member);
  }

  if (member) {
    req.organizationId = member.organization_id;
    req.userRole = member.role;
  }

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied. Required role: [${allowedRoles.join(', ')}], current role: ${req.userRole || 'none'}.`,
          requestId: req.id,
        },
      });
      return;
    }
    next();
  };
}
