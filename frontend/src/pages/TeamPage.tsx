import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Shield, Trash2, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';
import { useOrg } from '../context/OrgContext.js';

export const TeamPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrg();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'reviewer' | 'member'>('member');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['org-members', currentOrg?.id],
    queryFn: () => api.get(`/organizations/${currentOrg?.id}/members`),
    enabled: !!currentOrg?.id,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      api.post(`/organizations/${currentOrg?.id}/members`, {
        email: inviteEmail,
        role: inviteRole,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', currentOrg?.id] });
      setIsInviteModalOpen(false);
      setInviteEmail('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/organizations/${currentOrg?.id}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', currentOrg?.id] });
    },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Team & Role Access Control</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage authorized organization collaborators and role-based operational permissions.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Role Matrix Explanation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs text-xs space-y-1">
          <span className="font-bold text-slate-900 block">👑 Owner</span>
          <p className="text-[11px] text-slate-500 leading-snug">
            Full organization ownership, team management, billing, and document permissions.
          </p>
        </div>
        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs text-xs space-y-1">
          <span className="font-bold text-slate-900 block">⚡ Admin</span>
          <p className="text-[11px] text-slate-500 leading-snug">
            Manage documents, delete files, review pipelines, and invite new members.
          </p>
        </div>
        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs text-xs space-y-1">
          <span className="font-bold text-slate-900 block">🔍 Reviewer</span>
          <p className="text-[11px] text-slate-500 leading-snug">
            Inspect source quotes, edit extracted fields, approve or reject financial documents.
          </p>
        </div>
        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs text-xs space-y-1">
          <span className="font-bold text-slate-900 block">👤 Member</span>
          <p className="text-[11px] text-slate-500 leading-snug">
            Upload files, view authorized documents, and use natural language knowledge discovery.
          </p>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px]">
              <th className="py-3 px-4">Member Name / Email</th>
              <th className="py-3 px-4">Assigned Role</th>
              <th className="py-3 px-4">Added On</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  Loading team members...
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400">
                  No members found.
                </td>
              </tr>
            ) : (
              members.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{m.user_name || m.user_email}</div>
                    <div className="text-[11px] text-slate-400">{m.user_email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        m.role === 'owner'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : m.role === 'reviewer'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    {formatDate(m.created_at)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {m.role !== 'owner' && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${m.user_email} from organization?`)) {
                            removeMutation.mutate(m.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Invite Team Member</h3>
            <p className="text-xs text-slate-500">
              Grant team members role-scoped access to {currentOrg?.name}.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Collaborator Email</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="reviewer">Reviewer (Can edit & approve)</option>
                  <option value="admin">Admin (Manage members & docs)</option>
                  <option value="member">Member (View & upload only)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
