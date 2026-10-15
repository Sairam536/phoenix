import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  CheckSquare,
  Scale,
  BrainCircuit,
  ListTodo,
  FileSpreadsheet,
  Users,
  History,
  Settings,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useOrg } from '../../context/OrgContext.js';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Document Library', href: '/app/documents', icon: FileText },
  { name: 'Review Workspace', href: '/app/review', icon: CheckSquare },
  { name: 'Upload Files', href: '/app/upload', icon: UploadCloud },
  { name: 'Reconciliation', href: '/app/reconciliation', icon: Scale },
  { name: 'Knowledge AI', href: '/app/knowledge', icon: BrainCircuit },
  { name: 'Processing Jobs', href: '/app/jobs', icon: ListTodo },
  { name: 'Reports & Export', href: '/app/reports', icon: FileSpreadsheet },
  { name: 'Team & Roles', href: '/app/team', icon: Users },
  { name: 'Audit History', href: '/app/audit', icon: History },
  { name: 'Settings', href: '/app/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { user, switchDemoRole } = useAuth();
  const { currentOrg, organizations, switchOrg } = useOrg();

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 border-b border-slate-100 flex items-center px-5 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-100">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 tracking-tight text-base">DocuMind</span>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-indigo-200/50">
              AI
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Enterprise IDP Platform</span>
        </div>
      </div>

      {/* Organization Selector */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1.5 flex items-center gap-1">
          <Layers className="w-3 h-3 text-slate-400" /> Organization
        </label>
        <select
          value={currentOrg?.id || ''}
          onChange={e => switchOrg(e.target.value)}
          className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition"
        >
          {organizations.map(org => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase px-3 py-1.5">
          Workspace
        </div>
        {navItems.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/app'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge && (
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Demo Role Switcher Footer Card */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              Role Test Switcher:
            </span>
            <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
              {user?.role || 'owner'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => switchDemoRole('owner')}
              className={`text-[10px] font-medium py-1 px-1 rounded text-center transition ${
                user?.role === 'owner' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Owner
            </button>
            <button
              type="button"
              onClick={() => switchDemoRole('reviewer')}
              className={`text-[10px] font-medium py-1 px-1 rounded text-center transition ${
                user?.role === 'reviewer' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Reviewer
            </button>
            <button
              type="button"
              onClick={() => switchDemoRole('member')}
              className={`text-[10px] font-medium py-1 px-1 rounded text-center transition ${
                user?.role === 'member' ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Member
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
