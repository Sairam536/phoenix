import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb } from '../repositories/db.js';

export class OrganizationController {
  async listUserOrganizations(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const userMembers = inMemoryDb.members.filter(m => m.user_id === userId);
    const orgIds = new Set(userMembers.map(m => m.organization_id));
    const orgs = inMemoryDb.organizations.filter(o => orgIds.has(o.id));

    res.json({
      success: true,
      data: orgs.map(org => {
        const member = userMembers.find(m => m.organization_id === org.id);
        return {
          ...org,
          user_role: member?.role || 'member',
        };
      }),
    });
  }

  async createOrganization(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { name, slug, settings } = req.body;

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = inMemoryDb.organizations.find(o => o.slug === generatedSlug);
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_SLUG', message: 'An organization with this slug already exists.' },
      });
      return;
    }

    const orgId = uuidv4();
    const newOrg = {
      id: orgId,
      name,
      slug: generatedSlug,
      created_by: userId,
      settings: settings || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryDb.organizations.push(newOrg);

    // Add creator as owner
    inMemoryDb.members.push({
      id: uuidv4(),
      organization_id: orgId,
      user_id: userId,
      role: 'owner',
      user_email: req.user!.email,
      user_name: req.user!.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    inMemoryDb.auditEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      actor_id: userId,
      action: 'organization_created',
      entity_type: 'organization',
      entity_id: orgId,
      metadata: { name, slug: generatedSlug },
      request_id: req.id ? String(req.id) : null,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: newOrg,
    });
  }

  async getOrganization(req: Request, res: Response): Promise<void> {
    const orgId = req.params.organizationId || req.organizationId;
    const org = inMemoryDb.organizations.find(o => o.id === orgId);

    if (!org) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found.' },
      });
      return;
    }

    res.json({ success: true, data: org });
  }

  async updateOrganization(req: Request, res: Response): Promise<void> {
    const orgId = req.params.organizationId || req.organizationId;
    const org = inMemoryDb.organizations.find(o => o.id === orgId);

    if (!org) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found.' },
      });
      return;
    }

    if (req.body.name) org.name = req.body.name;
    if (req.body.settings) org.settings = { ...org.settings, ...req.body.settings };
    org.updated_at = new Date().toISOString();

    res.json({ success: true, data: org });
  }

  async listMembers(req: Request, res: Response): Promise<void> {
    const orgId = req.params.organizationId || req.organizationId;
    const members = inMemoryDb.members.filter(m => m.organization_id === orgId);

    res.json({ success: true, data: members });
  }

  async addMember(req: Request, res: Response): Promise<void> {
    const orgId = req.params.organizationId || req.organizationId!;
    const { email, role } = req.body;

    const existing = inMemoryDb.members.find(
      m => m.organization_id === orgId && m.user_email?.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'MEMBER_EXISTS', message: 'User is already a member of this organization.' },
      });
      return;
    }

    const newMember = {
      id: uuidv4(),
      organization_id: orgId,
      user_id: uuidv4(),
      role: role || 'member',
      user_email: email,
      user_name: email.split('@')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryDb.members.push(newMember);

    inMemoryDb.auditEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      actor_id: req.user!.id,
      action: 'member_added',
      entity_type: 'member',
      entity_id: newMember.id,
      metadata: { email, role: newMember.role },
      request_id: req.id ? String(req.id) : null,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ success: true, data: newMember });
  }

  async updateMemberRole(req: Request, res: Response): Promise<void> {
    const orgId = req.params.organizationId || req.organizationId!;
    const memberId = req.params.memberId;
    const { role } = req.body;

    const member = inMemoryDb.members.find(m => m.id === memberId && m.organization_id === orgId);
    if (!member) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found in organization.' },
      });
      return;
    }

    member.role = role;
    member.updated_at = new Date().toISOString();

    res.json({ success: true, data: member });
  }

  async removeMember(req: Request, res: Response): Promise<void> {
    const orgId = req.params.organizationId || req.organizationId!;
    const memberId = req.params.memberId;

    const index = inMemoryDb.members.findIndex(m => m.id === memberId && m.organization_id === orgId);
    if (index === -1) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found in organization.' },
      });
      return;
    }

    inMemoryDb.members.splice(index, 1);
    res.json({ success: true, data: { removed: true } });
  }
}

export const organizationController = new OrganizationController();
