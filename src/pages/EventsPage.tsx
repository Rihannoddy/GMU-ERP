import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Edit2, List, MapPin, Plus, Trash2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { CampusEvent } from '../types/erp';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusText } from '../components/ui/StatusText';

const CATEGORIES = ['All', 'Academic', 'Technical', 'Workshops', 'Seminars', 'Cultural', 'Sports'] as const;

const EMPTY_EVENT = {
  title: '',
  category: 'Technical',
  description: '',
  event_date: '2026-12-10',
  start_time: '10:00',
  end_time: '13:00',
  venue: 'Main Auditorium',
  capacity: '100',
  organizer: 'Academic Office',
  status: 'upcoming',
};

export function EventsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canManage = user?.role === 'admin' || user?.role === 'faculty';

  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [category, setCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CampusEvent | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const qs = category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
      const res = await apiFetch<{ events: CampusEvent[] }>(`/events${qs}`);
      setEvents(res.events);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [category]);

  const handleRegister = async (ev: CampusEvent) => {
    try {
      if (ev.is_registered) {
        await apiFetch(`/events/${ev.id}/register`, { method: 'DELETE' });
        showToast('Registration cancelled', 'info', ev.title);
      } else {
        await apiFetch(`/events/${ev.id}/register`, { method: 'POST' });
        showToast('Registered for event', 'success', `${ev.title} on ${ev.event_date}`);
      }
      loadEvents();
    } catch (err: any) {
      showToast(err?.message || 'Registration action failed', 'error');
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_EVENT);
    setModalOpen(true);
  };

  const openEdit = (ev: CampusEvent) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      category: ev.category,
      description: ev.description,
      event_date: ev.event_date,
      start_time: ev.start_time,
      end_time: ev.end_time,
      venue: ev.venue,
      capacity: String(ev.capacity),
      organizer: ev.organizer,
      status: ev.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/events/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        showToast('Event updated', 'success');
      } else {
        await apiFetch('/events', { method: 'POST', body: JSON.stringify(form) });
        showToast('Event published', 'success');
      }
      setModalOpen(false);
      loadEvents();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save event', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/events/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Event deleted', 'success');
      setDeleteTarget(null);
      loadEvents();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete event', 'error');
    }
  };

  // Group events by date for Calendar view (Nov–Dec 2026)
  const eventsByDate: Record<string, CampusEvent[]> = {};
  events.forEach((ev) => {
    if (!eventsByDate[ev.event_date]) eventsByDate[ev.event_date] = [];
    eventsByDate[ev.event_date].push(ev);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Campus Event Management</h1>
          <p className="text-xs text-[#738091] mt-1">
            Browse upcoming symposia, technical workshops, and cultural programs with real-time seat capacity enforcement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-white border border-[#E5E9EF] rounded-md">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded ${
                viewMode === 'list' ? 'bg-[#172332] text-white' : 'text-[#738091]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded ${
                viewMode === 'calendar' ? 'bg-[#172332] text-white' : 'text-[#738091]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-[#E5E9EF] rounded-lg w-fit">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              category === cat ? 'bg-[#172332] text-white' : 'text-[#738091] hover:text-[#202B38]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-white border border-[#E5E9EF] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#202B38]">Chronological Event Schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(eventsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([dateStr, list]) => (
                <div key={dateStr} className="border border-[#E5E9EF] rounded-md p-4 bg-[#F5F6F8]/50 space-y-2.5">
                  <p className="font-mono text-xs font-semibold text-[#D99A32]">{dateStr}</p>
                  {list.map((ev) => (
                    <div key={ev.id} className="bg-white border border-[#E5E9EF] rounded p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-[#202B38]">{ev.title}</p>
                      <p className="text-[11px] text-[#738091]">
                        {ev.start_time}–{ev.end_time} · {ev.venue}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] font-mono text-[#738091] tabular-nums">
                          {ev.registered_count}/{ev.capacity} seats
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRegister(ev)}
                          disabled={!ev.is_registered && ev.registered_count >= ev.capacity}
                          className="text-[11px] font-medium text-[#477BAA] hover:underline disabled:opacity-40"
                        >
                          {ev.is_registered ? 'Cancel Seat' : ev.registered_count >= ev.capacity ? 'Full' : 'Register'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => {
            const isFull = ev.registered_count >= ev.capacity;
            const registered = Boolean(ev.is_registered);
            return (
              <div key={ev.id} className="bg-white border border-[#E5E9EF] rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#738091]">
                    <span className="font-medium text-[#D99A32]">{ev.category}</span>
                    <span className="font-mono tabular-nums">{ev.event_date}</span>
                  </div>
                  <h2 className="text-base font-semibold text-[#202B38] mt-1.5 leading-snug">{ev.title}</h2>
                  <p className="text-xs text-[#738091] mt-2 leading-relaxed">{ev.description}</p>

                  <div className="mt-4 space-y-1.5 text-xs text-[#738091]">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {ev.venue} · {ev.start_time}–{ev.end_time}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5 font-mono tabular-nums">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {ev.registered_count} / {ev.capacity} seats filled
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#E5E9EF] flex items-center justify-between gap-2">
                  <StatusText
                    label={registered ? 'Registered' : isFull ? 'Capacity Reached' : 'Open'}
                    tone={registered ? 'success' : isFull ? 'danger' : 'info'}
                  />
                  <div className="flex items-center gap-1.5">
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => openEdit(ev)}
                        className="p-1.5 rounded text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8]"
                        title="Edit Event"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {user?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(ev)}
                        className="p-1.5 rounded text-[#D9534F] hover:bg-[#D9534F]/10"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!registered && isFull}
                      onClick={() => handleRegister(ev)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        registered
                          ? 'bg-[#F5F6F8] text-[#202B38] border border-[#E5E9EF] hover:bg-[#E5E9EF]'
                          : 'bg-[#D99A32] hover:bg-[#BD8123] text-white disabled:opacity-40'
                      }`}
                    >
                      {registered ? 'Cancel Registration' : isFull ? 'Full' : 'Register Event'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Event' : 'Create Campus Event'} maxWidth="lg">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202B38] mb-1">Event Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
            >
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Venue *</label>
            <input
              type="text"
              required
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Event Date *</label>
            <input
              type="date"
              required
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Start</label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">End</label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Capacity *</label>
            <input
              type="number"
              min={1}
              required
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Organizer</label>
            <input
              type="text"
              value={form.organizer}
              onChange={(e) => setForm({ ...form, organizer: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202B38] mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-[#E5E9EF]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-[#E5E9EF] rounded-md hover:bg-[#F5F6F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md"
            >
              {saving ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Event"
        message={`Delete "${deleteTarget?.title}" and cancel all participant registrations?`}
        confirmLabel="Delete Event"
      />
    </div>
  );
}
