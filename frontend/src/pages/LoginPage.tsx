import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BrainCircuit, ArrowRight, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchDemoRole } = useAuth();
  const [email, setEmail] = useState('admin@apexlogistics.demo');
  const [password, setPassword] = useState('Password123!');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await login(email, 'owner');
    setIsLoading(false);
    navigate('/app');
  };

  const handleQuickDemoLogin = (role: 'owner' | 'reviewer' | 'member') => {
    switchDemoRole(role);
    navigate('/app');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-8">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 mb-3">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to DocuMind AI</h1>
          <p className="text-xs text-slate-500 mt-1">Enterprise Intelligent Document Operations</p>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="mb-6 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
          <span className="text-[11px] font-bold text-indigo-900 block mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            Quick Evaluator One-Click Sign In:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('owner')}
              className="text-[11px] font-semibold py-1.5 px-2 bg-indigo-600 text-white rounded-lg shadow-xs hover:bg-indigo-700 transition"
            >
              👑 Owner
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('reviewer')}
              className="text-[11px] font-semibold py-1.5 px-2 bg-white text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition"
            >
              🔍 Reviewer
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('member')}
              className="text-[11px] font-semibold py-1.5 px-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              👤 Member
            </button>
          </div>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-[11px] font-medium text-indigo-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition"
          >
            {isLoading ? 'Signing in...' : 'Sign In to Workspace'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Don't have an organization account?{' '}
          <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
            Register now
          </Link>
        </div>
      </div>
    </div>
  );
};
