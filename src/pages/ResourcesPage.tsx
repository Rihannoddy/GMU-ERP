import React, { useEffect, useState } from 'react';
import { CalendarClock, Edit2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { ResourceBooking, ResourceItem } from '../types/erp';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusText } from '../components/ui/StatusText';

const EMPTY_RESOURCE = {
  name: '',
  code: '',
  type: 'Classroom',
  building: 'Turing Academic Block',
  capacity: '60',
  status: 'available',
  specifications: '',
};

const EMPTY_BOOKING = {
  resource_id: '',
  booking_date: '2026-11-22',
  start_time: '10:00',
  end_time: '12:00',
  purpose: '',
};

export function ResourcesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';
  const canBook = user?.role === 'admin' || user?.role === 'faculty';

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [resModalOpen, setResModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [resForm, setResForm] = useState(EMPTY_RESOURCE);
  const [deleteTarget, setDeleteTarget] = useState<ResourceItem | null>(null);

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState(EMPTY_BOOKING);
  const [bookingError, setBookingError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ resources: ResourceItem[]; bookings: ResourceBooking[] }>('/resources');
      setResources(res.resources);
      setBookings(res.bookings);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredResources = typeFilter ? resources.filter((r) => r.type === typeFilter) : resources;

  const openResCreate = () => {
    setEditingId(null);
    setResForm(EMPTY_RESOURCE);
    setResModalOpen(true);
  };

  const openResEdit = (r: ResourceItem) => {
    setEditingId(r.id);
    setResForm({
      name: r.name,
      code: r.code,
      type: r.type,
      building: r.building,
      capacity: String(r.capacity),
      status: r.status,
      specifications: r.specifications,
    });
    setResModalOpen(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiFetch(`/resources/${editingId}`, { method: 'PUT', body: JSON.stringify(resForm) });
        showToast('Resource updated', 'success');
      } else {
        await apiFetch('/resources', { method: 'POST', body: JSON.stringify(resForm) });
        showToast('Resource added to campus inventory', 'success');
      }
      setResModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save resource', 'error');
    }
  };

  const handleDeleteResource = async () => {
    if (!deleteTarget) return;
    await apiFetch(`/resources/${deleteTarget.id}`, { method: 'DELETE' });
    showToast('Resource deleted', 'success');
    setDeleteTarget(null);
    loadData();
  };

  const openBookModal = (resourceId?: number) => {
    setBookingError('');
    setBookForm({
      ...EMPTY_BOOKING,
      resource_id: String(resourceId || resources.find((r) => r.status === 'available')?.id || ''),
    });
    setBookModalOpen(true);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    try {
      await apiFetch('/resources/bookings', { method: 'POST', body: JSON.stringify(bookForm) });
      showToast('Resource booking confirmed', 'success');
      setBookModalOpen(false);
      loadData();
    } catch (err: any) {
      setBookingError(err?.message || 'Booking conflict detected.');
    }
  };

  const cancelBooking = async (id: number) => {
    try {
      await apiFetch(`/resources/bookings/${id}/cancel`, { method: 'PATCH' });
      showToast('Booking cancelled', 'info');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Unable to cancel booking', 'error');
    }
  };

  const availableCount = resources.filter((r) => r.status === 'available').length;
  const maintenanceCount = resources.filter((r) => r.status === 'maintenance').length;
  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Campus Resource &amp; Facility Booking</h1>
          <p className="text-xs text-[#738091] mt-1">
            Manage classrooms, laboratories, seminar halls, and equipment with automated time-slot conflict prevention.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canBook && (
            <button
              type="button"
              onClick={() => openBookModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md whitespace-nowrap"
            >
              <CalendarClock className="w-3.5 h-3.5 text-[#D99A32]" />
              <span>Book Resource</span>
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={openResCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource</span>
            </button>
          )}
        </div>
      </div>

      {/* Utilization Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-4">
          <span className="text-xs text-[#738091]">Available Facilities &amp; Assets</span>
          <p className="font-display text-2xl font-semibold text-[#26865B] mt-1 tabular-nums">{availableCount}</p>
        </div>
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-4">
          <span className="text-xs text-[#738091]">Under Maintenance</span>
          <p className="font-display text-2xl font-semibold text-[#D99A32] mt-1 tabular-nums">{maintenanceCount}</p>
        </div>
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-4">
          <span className="text-xs text-[#738091]">Active Confirmed Bookings</span>
          <p className="font-display text-2xl font-semibold text-[#202B38] mt-1 tabular-nums">{confirmedBookings}</p>
        </div>
      </div>

      {/* Resource Inventory */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E9EF] flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#202B38]">Campus Inventory</h2>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
          >
            <option value="">All Resource Types</option>
            {['Classroom', 'Laboratory', 'Seminar Hall', 'Projector', 'Computer', 'Library Resource', 'Equipment'].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              )
            )}
          </select>
        </div>
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
                  <th className="px-4 py-2.5">Code</th>
                  <th className="px-4 py-2.5">Resource</th>
                  <th className="px-4 py-2.5">Type &amp; Location</th>
                  <th className="px-4 py-2.5 text-right">Capacity</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9EF] text-sm">
                {filteredResources.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F5F6F8]/60">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{r.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#202B38]">{r.name}</p>
                      <p className="text-xs text-[#738091]">{r.specifications}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-[#202B38]">{r.type}</p>
                      <p className="text-[#738091]">{r.building}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{r.capacity}</td>
                    <td className="px-4 py-3">
                      <StatusText
                        label={r.status === 'available' ? 'Available' : r.status}
                        tone={r.status === 'available' ? 'success' : r.status === 'maintenance' ? 'warning' : 'danger'}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {canBook && r.status === 'available' && (
                          <button
                            type="button"
                            onClick={() => openBookModal(r.id)}
                            className="text-xs font-medium text-[#477BAA] hover:underline mr-1"
                          >
                            Book
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openResEdit(r)}
                              className="p-1.5 rounded text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 rounded text-[#D9534F] hover:bg-[#D9534F]/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bookings Schedule */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E9EF]">
          <h2 className="text-sm font-semibold text-[#202B38]">Reservation Schedule &amp; History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF] text-xs font-semibold text-[#738091]">
                <th className="px-4 py-2.5">Date &amp; Slot</th>
                <th className="px-4 py-2.5">Resource</th>
                <th className="px-4 py-2.5">Purpose</th>
                <th className="px-4 py-2.5">Reserved By</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9EF] text-xs">
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {b.booking_date} · {b.start_time}–{b.end_time}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#202B38]">
                    {b.resource_name} ({b.resource_code})
                  </td>
                  <td className="px-4 py-3 text-[#202B38]">{b.purpose}</td>
                  <td className="px-4 py-3 text-[#738091]">{b.booked_by_name}</td>
                  <td className="px-4 py-3">
                    <StatusText
                      label={b.status}
                      tone={b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'info'}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.status === 'confirmed' && (isAdmin || b.booked_by === user?.id) && (
                      <button
                        type="button"
                        onClick={() => cancelBooking(b.id)}
                        className="text-xs text-[#D9534F] hover:underline"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Resource Modal */}
      <Modal
        open={resModalOpen}
        onClose={() => setResModalOpen(false)}
        title={editingId ? 'Edit Campus Resource' : 'Add Campus Resource'}
      >
        <form onSubmit={handleSaveResource} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Resource Code *</label>
              <input
                type="text"
                required
                value={resForm.code}
                onChange={(e) => setResForm({ ...resForm, code: e.target.value })}
                placeholder="RES-TB202"
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Type *</label>
              <select
                value={resForm.type}
                onChange={(e) => setResForm({ ...resForm, type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
              >
                <option value="Classroom">Classroom</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Seminar Hall">Seminar Hall</option>
                <option value="Projector">Projector</option>
                <option value="Computer">Computer</option>
                <option value="Library Resource">Library Resource</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Resource Name *</label>
            <input
              type="text"
              required
              value={resForm.name}
              onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Building *</label>
              <input
                type="text"
                required
                value={resForm.building}
                onChange={(e) => setResForm({ ...resForm, building: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Capacity</label>
              <input
                type="number"
                min={1}
                value={resForm.capacity}
                onChange={(e) => setResForm({ ...resForm, capacity: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Status</label>
              <select
                value={resForm.status}
                onChange={(e) => setResForm({ ...resForm, status: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Specifications</label>
            <input
              type="text"
              value={resForm.specifications}
              onChange={(e) => setResForm({ ...resForm, specifications: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9EF]">
            <button
              type="button"
              onClick={() => setResModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-[#E5E9EF] rounded-md"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium bg-[#D99A32] text-white rounded-md">
              Save Resource
            </button>
          </div>
        </form>
      </Modal>

      {/* Book Resource Modal */}
      <Modal
        open={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        title="Book Campus Resource"
        subtitle="Overlapping time slots on the same resource are automatically rejected."
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          {bookingError && (
            <div className="p-3 rounded-md bg-[#D9534F]/10 border border-[#D9534F]/30 text-xs text-[#D9534F] font-medium">
              {bookingError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Resource *</label>
            <select
              value={bookForm.resource_id}
              onChange={(e) => setBookForm({ ...bookForm, resource_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
            >
              {resources
                .filter((r) => r.status === 'available')
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code}) — Cap {r.capacity}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Date *</label>
              <input
                type="date"
                required
                value={bookForm.booking_date}
                onChange={(e) => setBookForm({ ...bookForm, booking_date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Start *</label>
              <input
                type="time"
                required
                value={bookForm.start_time}
                onChange={(e) => setBookForm({ ...bookForm, start_time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">End *</label>
              <input
                type="time"
                required
                value={bookForm.end_time}
                onChange={(e) => setBookForm({ ...bookForm, end_time: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Purpose *</label>
            <input
              type="text"
              required
              value={bookForm.purpose}
              onChange={(e) => setBookForm({ ...bookForm, purpose: e.target.value })}
              placeholder="e.g. CS501 Extra Lab Practicum"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9EF]">
            <button
              type="button"
              onClick={() => setBookModalOpen(false)}
              className="px-4 py-2 text-xs font-medium border border-[#E5E9EF] rounded-md"
            >
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-xs font-medium bg-[#D99A32] text-white rounded-md">
              Confirm Booking
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteResource}
        title="Delete Resource"
        message={`Delete "${deleteTarget?.name}" from campus inventory?`}
        confirmLabel="Delete Resource"
      />
    </div>
  );
}
