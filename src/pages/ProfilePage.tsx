import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ full_name: fullName }),
      });
      await refreshUser();
      showToast('Profile updated', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Unable to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#202B38]">Account Profile &amp; Preferences</h1>
        <p className="text-xs text-[#738091] mt-1">Review your university identity and authorized role privileges.</p>
      </div>

      <div className="bg-white border border-[#E5E9EF] rounded-lg p-6 flex items-center gap-4">
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover border border-[#E5E9EF]"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#172332] text-white flex items-center justify-center text-lg font-semibold">
            {user?.full_name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-[#202B38]">{user?.full_name}</h2>
          <p className="text-xs font-mono text-[#738091] mt-0.5">{user?.email}</p>
          <p className="text-xs font-medium text-[#D99A32] mt-1 capitalize">Role: {user?.role}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-[#E5E9EF] rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#202B38] mb-1">Display Full Name</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#202B38] mb-1">Institutional Email (Read-only)</label>
          <input
            type="email"
            disabled
            value={user?.email || ''}
            className="w-full px-3 py-2 text-sm bg-[#F5F6F8] border border-[#E5E9EF] rounded-md text-[#738091]"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : 'Update Profile'}</span>
        </button>
      </form>
    </div>
  );
}
