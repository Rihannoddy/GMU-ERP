import React, { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Department, FacultyRecord } from '../types/erp';
import { Column, DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusText } from '../components/ui/StatusText';
import { ProgressBar } from '../components/ui/Charts';

const EMPTY_FACULTY = {
  employee_id: '',
  full_name: '',
  email: '',
  phone: '',
  department_id: '',
  designation: 'Assistant Professor',
  specialization: '',
  office_room: '',
  weekly_hours: '16',
  status: 'active',
};

export function FacultyPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FACULTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FacultyRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [facRes, acadRes] = await Promise.all([
        apiFetch<{ faculty: FacultyRecord[] }>('/faculty'),
        apiFetch<{ departments: Department[] }>('/academics/overview'),
      ]);
      setFaculty(facRes.faculty);
      setDepartments(acadRes.departments);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load faculty directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFaculty = deptFilter
    ? faculty.filter((f) => String(f.department_id) === deptFilter)
    : faculty;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FACULTY, department_id: String(departments[0]?.id || '') });
    setModalOpen(true);
  };

  const openEdit = (f: FacultyRecord) => {
    setEditingId(f.id);
    setForm({
      employee_id: f.employee_id,
      full_name: f.full_name,
      email: f.email,
      phone: f.phone,
      department_id: String(f.department_id),
      designation: f.designation,
      specialization: f.specialization,
      office_room: f.office_room,
      weekly_hours: String(f.weekly_hours),
      status: f.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employee_id.trim() || !form.full_name.trim() || !form.email.trim()) {
      showToast('Employee ID, name, and email are required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/faculty/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        showToast('Faculty profile updated', 'success');
      } else {
        await apiFetch('/faculty', { method: 'POST', body: JSON.stringify(form) });
        showToast('Faculty member added', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save faculty record', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/faculty/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(`Removed ${deleteTarget.full_name}`, 'success');
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Unable to delete faculty', 'error');
    }
  };

  const columns: Column<FacultyRecord>[] = [
    {
      key: 'employee_id',
      header: 'ID',
      sortable: true,
      sortValue: (f) => f.employee_id,
      render: (f) => <span className="font-mono text-xs font-medium text-[#202B38]">{f.employee_id}</span>,
    },
    {
      key: 'full_name',
      header: 'Faculty Member',
      sortable: true,
      sortValue: (f) => f.full_name,
      render: (f) => (
        <div>
          <p className="text-sm font-medium text-[#202B38]">{f.full_name}</p>
          <p className="text-xs text-[#738091]">
            {f.designation} · {f.email}
          </p>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department & Office',
      render: (f) => (
        <div className="text-xs">
          <p className="font-medium text-[#202B38]">{f.dept_code}</p>
          <p className="text-[#738091]">Room {f.office_room}</p>
        </div>
      ),
    },
    {
      key: 'specialization',
      header: 'Assigned Subjects & Specialization',
      render: (f) => (
        <div className="text-xs max-w-xs">
          <p className="text-[#202B38] truncate">{f.specialization}</p>
          <p className="text-[#738091] truncate">{f.assigned_subjects_text || 'Unassigned'}</p>
        </div>
      ),
    },
    {
      key: 'weekly_hours',
      header: 'Weekly Workload',
      sortable: true,
      sortValue: (f) => f.weekly_hours,
      render: (f) => (
        <div className="w-32 space-y-1">
          <span className="text-xs font-mono tabular-nums text-[#202B38]">
            {f.weekly_hours} hrs/wk ({f.subject_count || 0} subj)
          </span>
          <ProgressBar value={(f.weekly_hours / 24) * 100} threshold={40} showValue={false} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (f) => (
        <StatusText
          label={f.status === 'active' ? 'Active' : f.status === 'on_leave' ? 'On Leave' : 'Inactive'}
          tone={f.status === 'active' ? 'success' : f.status === 'on_leave' ? 'warning' : 'danger'}
        />
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: 'Actions',
            align: 'right' as const,
            render: (f: FacultyRecord) => (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(f)}
                  className="p-1.5 rounded text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8]"
                  title="Edit Faculty"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(f)}
                  className="p-1.5 rounded text-[#D9534F] hover:bg-[#D9534F]/10"
                  title="Delete Faculty"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Faculty &amp; Teaching Workload</h1>
          <p className="text-xs text-[#738091] mt-1">
            Academic staff directory, department appointments, subject allocations, and weekly teaching load.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        )}
      </div>

      <DataTable
        data={filteredFaculty}
        columns={columns}
        keyField={(f) => f.id}
        loading={loading}
        searchPlaceholder="Search faculty by name, ID, or specialization..."
        searchFilter={(f, q) =>
          f.full_name.toLowerCase().includes(q) ||
          f.employee_id.toLowerCase().includes(q) ||
          f.specialization.toLowerCase().includes(q)
        }
        toolbarExtra={
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md text-[#202B38]"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Faculty Profile' : 'Add Faculty Member'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Employee ID *</label>
            <input
              type="text"
              required
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              placeholder="FAC-1201"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Phone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Department</label>
            <select
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Designation *</label>
            <select
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
            >
              <option value="Professor & HOD">Professor &amp; HOD</option>
              <option value="Professor">Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Assistant Professor">Assistant Professor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Office Room</label>
            <input
              type="text"
              value={form.office_room}
              onChange={(e) => setForm({ ...form, office_room: e.target.value })}
              placeholder="TB-304"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Weekly Hours</label>
            <input
              type="number"
              min={4}
              max={40}
              value={form.weekly_hours}
              onChange={(e) => setForm({ ...form, weekly_hours: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202B38] mb-1">Specialization</label>
            <input
              type="text"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
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
              {saving ? 'Saving...' : 'Save Faculty'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Faculty Record"
        message={`Remove ${deleteTarget?.full_name} from the faculty directory? Subjects assigned to them will become unassigned.`}
        confirmLabel="Remove Faculty"
      />
    </div>
  );
}
