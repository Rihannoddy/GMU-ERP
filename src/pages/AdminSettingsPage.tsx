import React, { useEffect, useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Modal } from '../components/ui/Modal';
import { StatusText } from '../components/ui/StatusText';

export function AdminSettingsPage({ mode }: { mode: 'users' | 'settings' }) {
  const { showToast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    institution_name: 'GM University',
    attendance_threshold: '75',
    current_academic_year: '2026-27',
    current_semester: '5',
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'faculty' });

  const loadAll = async () => {
    setLoading(true);
    try {
      if (mode === 'users') {
        const res = await apiFetch<{ users: any[] }>('/admin/users');
        setUsers(res.users);
      } else {
        const [setRes, logRes] = await Promise.all([
          apiFetch<{ settings: any }>('/admin/settings'),
          apiFetch<{ logs: any[] }>('/admin/audit-logs'),
        ]);
        setSettings((prev) => ({ ...prev, ...setRes.settings }));
        setAuditLogs(logRes.logs);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load administration data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [mode]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(newUser) });
      showToast('User account created', 'success');
      setUserModalOpen(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'faculty' });
      loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Failed to create user', 'error');
    }
  };

  const toggleUserStatus = async (u: any) => {
    try {
      const next = u.status === 'active' ? 'inactive' : 'active';
      await apiFetch(`/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      showToast(`User marked ${next}`, 'success');
      loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Action blocked', 'error');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
      showToast('System settings updated', 'success');
      loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save settings', 'error');
    }
  };

  if (mode === 'users') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#202B38]">User &amp; Role Management</h1>
            <p className="text-xs text-[#738091] mt-1">
              Provision institutional user accounts and manage active role-based access status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUserModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add User Account</span>
          </button>
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-[#F5F6F8] rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF] text-xs font-semibold text-[#738091]">
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9EF] text-sm">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-medium text-[#202B38]">{u.full_name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#738091]">{u.email}</td>
                      <td className="px-4 py-3 text-xs capitalize font-medium text-[#202B38]">{u.role}</td>
                      <td className="px-4 py-3">
                        <StatusText label={u.status} tone={u.status === 'active' ? 'success' : 'danger'} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleUserStatus(u)}
                          className="text-xs font-medium text-[#477BAA] hover:underline"
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Modal open={userModalOpen} onClose={() => setUserModalOpen(false)} title="Provision User Account">
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">University Email *</label>
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
                >
                  <option value="admin">Administrator</option>
                  <option value="faculty">Faculty</option>
                  <option value="student">Student</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9EF]">
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="px-4 py-2 text-xs font-medium border border-[#E5E9EF] rounded-md"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-xs font-medium bg-[#D99A32] text-white rounded-md">
                Create Account
              </button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#202B38]">System Settings &amp; Audit Log</h1>
        <p className="text-xs text-[#738091] mt-1">
          Configure institutional parameters (including the configurable attendance threshold) and review administrative activity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={saveSettings} className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-[#202B38]">Institutional Parameters</h2>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">University / Institution Name</label>
            <input
              type="text"
              value={settings.institution_name}
              onChange={(e) => setSettings({ ...settings, institution_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Attendance Threshold (%)</label>
              <input
                type="number"
                min={50}
                max={95}
                value={settings.attendance_threshold}
                onChange={(e) => setSettings({ ...settings, attendance_threshold: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Academic Year</label>
              <input
                type="text"
                value={settings.current_academic_year}
                onChange={(e) => setSettings({ ...settings, current_academic_year: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Active Semester</label>
              <input
                type="number"
                min={1}
                max={8}
                value={settings.current_semester}
                onChange={(e) => setSettings({ ...settings, current_semester: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save System Configuration</span>
          </button>
        </form>

        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#202B38] mb-3">Security &amp; Operations Audit Log</h2>
          <div className="divide-y divide-[#E5E9EF] max-h-96 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-[#202B38]">{log.action}</span>
                  <span className="font-mono text-[11px] text-[#738091]">{log.created_at}</span>
                </div>
                <p className="text-[#738091] mt-0.5">
                  {log.actor_name} ({log.actor_role}) — {log.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
