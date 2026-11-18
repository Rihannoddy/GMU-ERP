import React, { useState } from 'react';
import { Building2, Check, Copy, Eye, EyeOff, Lock, Mail, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Modal } from '../components/ui/Modal';

const DEMO_ACCOUNTS = [
  {
    role: 'Administrator',
    email: 'admin@smartcampus.edu',
    pass: 'Admin@123',
    scope: 'Students, faculty, reports & settings',
  },
  {
    role: 'Faculty',
    email: 'faculty@smartcampus.edu',
    pass: 'Faculty@123',
    scope: 'Attendance, marks & AI teaching tools',
  },
  {
    role: 'Student',
    email: 'student@smartcampus.edu',
    pass: 'Student@123',
    scope: 'Grades, attendance, events & study AI',
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quickSigningRole, setQuickSigningRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid university email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login(email.trim(), password, rememberMe);
      showToast(`Signed in as ${user.full_name}`, 'success', `Role: ${user.role.toUpperCase()}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredential = async (role: string, em: string, pw: string) => {
    try {
      await navigator.clipboard.writeText(`${em} / ${pw}`);
      setCopiedKey(role);
      showToast(`${role} credentials filled & copied`, 'info', `${em}`);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      showToast(`${role} credentials filled`, 'info');
    }
    setEmail(em);
    setPassword(pw);
    setErrorMsg('');
  };

  const quickDemoLogin = async (role: string, em: string, pw: string) => {
    setErrorMsg('');
    setEmail(em);
    setPassword(pw);
    setQuickSigningRole(role);
    try {
      const user = await login(em, pw, rememberMe);
      showToast(`Signed in as ${user.full_name}`, 'success', `Welcome to GMU ERP Management (${user.role})`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setQuickSigningRole(null);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await apiFetch<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail }),
      });
      showToast('Recovery request submitted', 'success', res.message);
      setForgotOpen(false);
      setForgotEmail('');
    } catch (err: any) {
      showToast(err?.message || 'Unable to process request', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex flex-col lg:flex-row">
      {/* Left Campus Architecture Showcase */}
      <div className="relative lg:w-[52%] min-h-[260px] lg:min-h-screen bg-[#172332] overflow-hidden flex flex-col justify-between p-8 lg:p-12 text-white">
        <img
          src="/src/assets/images/login_campus_architecture_1795016755847.jpg"
          alt="GM University academic atrium"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#172332]/95 via-[#172332]/60 to-[#172332]/40" />

        <div className="relative z-10 flex items-center gap-4">
          <img
            src="/assets/aistudio/gmu-logo_77c534fb.png"
            alt="GM University Crest"
            className="w-16 h-16 rounded-lg object-cover border border-[#D4A545]/50 shadow-lg bg-[#541B1E] shrink-0"
          />
          <div>
            <span className="font-display text-xl font-bold tracking-tight block leading-tight text-white">
              GMU ERP Management
            </span>
            <span className="text-xs text-[#E8C574] mt-1 block font-medium">
              GM University · Innovating Minds
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-lg mt-12 lg:mt-0">
          <p className="text-xs font-medium tracking-wide text-[#D99A32] mb-2">
            GM University · Innovating Minds
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight text-white [text-wrap:balance]">
            Unified academic operations, institutional analytics, and AI-guided learning.
          </h1>
          <p className="text-sm text-white/80 mt-3 leading-relaxed">
            Built for GM University administrators, faculty coordinators, and students across departments, attendance,
            assessments, campus resources, and career planning.
          </p>

          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/15">
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums text-white">5</p>
              <p className="text-xs text-white/70">Academic Departments</p>
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums text-white">14</p>
              <p className="text-xs text-white/70">Integrated Modules</p>
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums text-white">3</p>
              <p className="text-xs text-white/70">Role Workspaces</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Authentication Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-7">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3 lg:hidden">
                <img
                  src="/assets/aistudio/gmu-logo_77c534fb.png"
                  alt="GM University Crest"
                  className="w-11 h-11 rounded-md object-cover border border-[#D4A545]/50 bg-[#541B1E] shrink-0"
                />
                <div>
                  <p className="font-display text-sm font-bold text-[#202B38]">GMU ERP Management</p>
                  <p className="text-[11px] text-[#738091]">GM University · Innovating Minds</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#738091] mb-1">
                <Building2 className="w-3.5 h-3.5 text-[#D99A32]" />
                <span>GMU Institutional Sign In</span>
              </div>
              <h2 className="font-display text-xl font-semibold text-[#202B38]">Access Your Campus Portal</h2>
              <p className="text-xs text-[#738091] mt-1">
                Sign in with your university email or use one-click demo access below.
              </p>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mb-4 px-3.5 py-2.5 rounded-md bg-[#D9534F]/8 border border-[#D9534F]/30 text-xs text-[#D9534F] font-medium"
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-[#202B38] mb-1.5">
                  University Email <span className="text-[#D9534F]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#738091] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@smartcampus.edu"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E5E9EF] rounded-md text-[#202B38] placeholder:text-[#738091]/70 focus:outline-none focus:border-[#D99A32] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-[#202B38] mb-1.5">
                  Password <span className="text-[#D9534F]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#738091] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-[#E5E9EF] rounded-md text-[#202B38] placeholder:text-[#738091]/70 focus:outline-none focus:border-[#D99A32] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#738091] hover:text-[#202B38] p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 text-xs text-[#202B38] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#E5E9EF] text-[#D99A32] focus:ring-[#D99A32]"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs font-medium text-[#477BAA] hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#D99A32] hover:bg-[#BD8123] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-60"
              >
                <span>{submitting ? 'Signing in...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Demo Credentials Card */}
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#202B38]">Quick Demo Access</h3>
              <span className="text-[11px] text-[#738091]">Fill credentials or sign in with 1 click</span>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {DEMO_ACCOUNTS.map((acc) => {
                const isCopied = copiedKey === acc.role;
                const isSigning = quickSigningRole === acc.role;
                return (
                  <div key={acc.role} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-[#202B38]">{acc.role}</span>
                        <span className="text-[#738091]" aria-hidden="true">·</span>
                        <span className="text-[#738091] truncate">{acc.scope}</span>
                      </div>
                      <p className="text-xs font-mono text-[#738091] mt-0.5 truncate">
                        {acc.email} / {acc.pass}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyCredential(acc.role, acc.email, acc.pass)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#202B38] bg-[#F5F6F8] hover:bg-[#E5E9EF] border border-[#E5E9EF] rounded-md transition-colors whitespace-nowrap"
                        title="Fill email and password into the form"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-[#26865B]" /> : <Copy className="w-3.5 h-3.5 text-[#738091]" />}
                        <span>{isCopied ? 'Filled' : 'Fill'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={submitting || quickSigningRole !== null}
                        onClick={() => quickDemoLogin(acc.role, acc.email, acc.pass)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#172332] hover:bg-[#243447] rounded-md transition-colors whitespace-nowrap disabled:opacity-60"
                      >
                        <LogIn className="w-3.5 h-3.5 text-[#D99A32]" />
                        <span>{isSigning ? 'Signing in...' : 'Sign In'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset University Password"
        subtitle="Enter your institutional email to notify Campus IT Support."
        maxWidth="sm"
      >
        <form onSubmit={handleForgotSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-xs font-medium text-[#202B38] mb-1.5">
              University Email <span className="text-[#D9534F]">*</span>
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@smartcampus.edu"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md focus:outline-none focus:border-[#D99A32]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#202B38] border border-[#E5E9EF] rounded-md hover:bg-[#F5F6F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={forgotLoading}
              className="px-4 py-2 text-xs font-medium text-white bg-[#D99A32] hover:bg-[#BD8123] rounded-md disabled:opacity-60"
            >
              {forgotLoading ? 'Sending...' : 'Request Reset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
