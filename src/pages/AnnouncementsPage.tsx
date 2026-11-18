import React, { useEffect, useState } from 'react';
import { Megaphone, Pin, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { AnnouncementItem } from '../types/erp';
import { Modal } from '../components/ui/Modal';
import { StatusText } from '../components/ui/StatusText';

export function AnnouncementsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canCreate = user?.role === 'admin' || user?.role === 'faculty';

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'Academic Policy',
    target_role: 'all',
    priority: 'normal',
    body: '',
    is_pinned: false,
  });

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ announcements: AnnouncementItem[] }>('/announcements');
      setAnnouncements(res.announcements);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/announcements', { method: 'POST', body: JSON.stringify(form) });
      showToast('Announcement published', 'success', `Targeted to ${form.target_role} users`);
      setModalOpen(false);
      setForm({ title: '', category: 'Academic Policy', target_role: 'all', priority: 'normal', body: '', is_pinned: false });
      loadAnnouncements();
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish announcement', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/announcements/${id}`, { method: 'DELETE' });
    showToast('Announcement removed', 'info');
    loadAnnouncements();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Announcements &amp; Notices</h1>
          <p className="text-xs text-[#738091] mt-1">
            Official institutional bulletins, examination advisories, and role-specific notices.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Notice</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-white border border-[#E5E9EF] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-12 text-center text-xs text-[#738091]">
          No announcements published for your role yet.
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white border border-[#E5E9EF] rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#738091]">
                    <Megaphone className="w-3.5 h-3.5 text-[#D99A32]" />
                    <span className="font-medium text-[#202B38]">{a.category}</span>
                    <span>·</span>
                    <span className="capitalize">Audience: {a.target_role}</span>
                    <span>·</span>
                    <StatusText
                      label={a.priority === 'urgent' ? 'Urgent' : a.priority === 'important' ? 'Important' : 'Standard'}
                      tone={a.priority === 'urgent' ? 'danger' : a.priority === 'important' ? 'warning' : 'info'}
                    />
                    {Boolean(a.is_pinned) && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-[#D99A32] font-medium">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-[#202B38]">{a.title}</h2>
                  <p className="text-sm text-[#202B38]/85 leading-relaxed pt-1">{a.body}</p>
                  <p className="text-[11px] text-[#738091] pt-2">
                    Issued by {a.author_name} · {a.created_at.slice(0, 10)}
                  </p>
                </div>
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="p-1.5 rounded text-[#D9534F] hover:bg-[#D9534F]/10"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Publish Campus Announcement">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Notice Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-2.5 py-2 text-xs border border-[#E5E9EF] rounded-md bg-white"
              >
                <option value="Academic Policy">Academic Policy</option>
                <option value="Examinations">Examinations</option>
                <option value="Faculty Notice">Faculty Notice</option>
                <option value="Campus Events">Campus Events</option>
                <option value="IT & Facilities">IT &amp; Facilities</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Target Role</label>
              <select
                value={form.target_role}
                onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                className="w-full px-2.5 py-2 text-xs border border-[#E5E9EF] rounded-md bg-white"
              >
                <option value="all">All Users</option>
                <option value="student">Students Only</option>
                <option value="faculty">Faculty Only</option>
                {user?.role === 'admin' && <option value="admin">Administrators</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-2.5 py-2 text-xs border border-[#E5E9EF] rounded-md bg-white"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Message Body *</label>
            <textarea
              required
              rows={4}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-[#202B38]">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
            />
            <span>Pin announcement to top</span>
          </label>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9EF]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-[#E5E9EF] rounded-md"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium bg-[#D99A32] text-white rounded-md">
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
