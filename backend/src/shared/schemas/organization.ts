import { z } from 'zod';
import { USER_ROLES } from '../constants/index.js';

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase alphanumeric and dashes').optional(),
  settings: z.record(z.unknown()).optional().default({}),
});
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  settings: z.record(z.unknown()).optional(),
});
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const OrganizationMemberSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(USER_ROLES),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().optional(),
  }).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

export const AddMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(USER_ROLES).default('member'),
});
export type AddMemberInput = z.infer<typeof AddMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;
