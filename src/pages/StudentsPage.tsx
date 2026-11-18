import React, { useEffect, useState } from 'react';
import { ArrowLeft, Edit2, Eye, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Course, Department, StudentRecord } from '../types/erp';
import { Column, DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { StatusText } from '../components/ui/StatusText';
import { ProgressBar } from '../components/ui/Charts';

const EMPTY_FORM = {
  usn: '',
  full_name: '',
  email: '',
  phone: '',
  department_id: '',
  course_id: '',
  semester: '5',
  academic_year: '2026-27',
  status: 'active',
  address: '',
  guardian_name: '',
  guardian_phone: '',
};

export function StudentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [deptFilter, setDeptFilter] = useState('');
  const [semFilter, setSemFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detailed Student Profile Drawer/View
  const [profileId, setProfileId] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'academics' | 'attendance' | 'activities'>('overview');

  const loadData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (deptFilter) qs.set('departmentId', deptFilter);
      if (semFilter) qs.set('semester', semFilter);

      const [stuRes, acadRes] = await Promise.all([
        apiFetch<{ students: StudentRecord[] }>(`/students?${qs.toString()}`),
        apiFetch<{ departments: Department[]; courses: Course[] }>('/academics/overview'),
      ]);
      setStudents(stuRes.students);
      setDepartments(acadRes.departments);
      setCourses(acadRes.courses);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deptFilter, semFilter]);

  const openProfile = async (id: number) => {
    try {
      const data = await apiFetch(`/students/${id}`);
      setProfileData(data);
      setProfileId(id);
      setProfileTab('overview');
    } catch (err: any) {
      showToast(err?.message || 'Unable to load student profile', 'error');
    }
  };

  const openCreate = () => {
    const defaultDept = departments[0]?.id ? String(departments[0].id) : '';
    const defaultCourse = courses.find((c) => String(c.department_id) === defaultDept)?.id || courses[0]?.id || '';
    setEditingId(null);
    setForm({ ...EMPTY_FORM, department_id: defaultDept, course_id: String(defaultCourse) });
    setModalOpen(true);
  };

  const openEdit = (s: StudentRecord) => {
    setEditingId(s.id);
    setForm({
      usn: s.usn,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      department_id: String(s.department_id),
      course_id: String(s.course_id),
      semester: String(s.semester),
      academic_year: s.academic_year,
      status: s.status,
      address: s.address || '',
      guardian_name: s.guardian_name || '',
      guardian_phone: s.guardian_phone || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.usn.trim() || !form.full_name.trim() || !form.email.trim()) {
      showToast('USN, full name, and email are required.', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/students/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        showToast('Student record updated', 'success');
      } else {
        await apiFetch('/students', { method: 'POST', body: JSON.stringify(form) });
        showToast('New student enrolled', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save student', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/students/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(`Removed ${deleteTarget.full_name}`, 'success');
      setDeleteTarget(null);
      if (profileId === deleteTarget.id) setProfileId(null);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Unable to delete student', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Detailed Student Profile View
  if (profileId && profileData) {
    const st: StudentRecord = profileData.student;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setProfileId(null)}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#738091] hover:text-[#202B38]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Student Directory</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => openEdit(st)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E5E9EF] rounded-md hover:bg-[#F5F6F8] text-[#202B38]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {st.avatar_url ? (
              <img
                src={st.avatar_url}
                alt={st.full_name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border border-[#E5E9EF]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#172332] text-white flex items-center justify-center text-lg font-semibold">
                {st.full_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="font-display text-xl font-semibold text-[#202B38]">{st.full_name}</h1>
              <p className="text-xs text-[#738091] mt-0.5">
                <span className="font-mono font-medium text-[#202B38]">{st.usn}</span> · {st.department_name} ·{' '}
                {st.course_name} · Semester {st.semester}
              </p>
              <p className="text-xs text-[#738091] mt-1">
                {st.email} · {st.phone}
              </p>
            </div>
          </div>
          <StatusText
            label={st.status === 'active' ? 'Active Enrolment' : st.status}
            tone={st.status === 'active' ? 'success' : 'warning'}
          />
        </div>

        {/* Profile Tabs */}
        <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E9EF] rounded-lg w-fit">
          {(['overview', 'academics', 'attendance', 'activities'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setProfileTab(tab)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                profileTab === tab ? 'bg-[#172332] text-white' : 'text-[#738091] hover:text-[#202B38]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {profileTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-[#202B38]">Personal &amp; Guardian Details</h3>
              <div className="grid grid-cols-2 gap-y-2.5">
                <span className="text-[#738091]">Academic Year</span>
                <span className="font-mono text-[#202B38]">{st.academic_year}</span>
                <span className="text-[#738091]">Enrolled Date</span>
                <span className="font-mono text-[#202B38]">{st.enrolled_date}</span>
                <span className="text-[#738091]">Residential Address</span>
                <span className="text-[#202B38]">{st.address || 'On-campus residence'}</span>
                <span className="text-[#738091]">Guardian Name</span>
                <span className="text-[#202B38]">{st.guardian_name || 'Not recorded'}</span>
                <span className="text-[#738091]">Guardian Contact</span>
                <span className="font-mono text-[#202B38]">{st.guardian_phone || '—'}</span>
              </div>
            </div>
            <div className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-3 text-xs">
              <h3 className="text-sm font-semibold text-[#202B38]">Attendance Summary by Subject</h3>
              {(profileData.attendanceBySubject || []).map((sub: any) => (
                <div key={sub.code} className="space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-[#202B38]">
                      {sub.code} — {sub.name}
                    </span>
                    <span className="font-mono text-[#738091]">
                      {sub.attended}/{sub.total_classes}
                    </span>
                  </div>
                  <ProgressBar value={sub.percentage ?? 0} />
                </div>
              ))}
            </div>
          </div>
        )}

        {profileTab === 'academics' && (
          <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF] text-xs font-semibold text-[#738091]">
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5 text-right">IA 1 (20)</th>
                  <th className="px-4 py-2.5 text-right">IA 2 (20)</th>
                  <th className="px-4 py-2.5 text-right">Assignment (20)</th>
                  <th className="px-4 py-2.5 text-right">External (40)</th>
                  <th className="px-4 py-2.5 text-right">Total (100)</th>
                  <th className="px-4 py-2.5 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9EF] text-sm">
                {(profileData.marks || []).map((m: any) => (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#738091] mr-2">{m.subject_code}</span>
                      <span className="font-medium text-[#202B38]">{m.subject_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.internal_1}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.internal_2}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.assignment_score}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.external_score}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{m.total_marks}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#26865B]">{m.grade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {profileTab === 'attendance' && (
          <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF] text-xs font-semibold text-[#738091]">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9EF] text-xs">
                {(profileData.attendanceHistory || []).map((a: any) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{a.date}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {a.subject_code} — {a.subject_name}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusText
                        label={a.status}
                        tone={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-[#738091]">{a.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {profileTab === 'activities' && (
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[#202B38] mb-3">Event Registrations &amp; Campus Activities</h3>
            {(profileData.registrations || []).length === 0 ? (
              <p className="text-xs text-[#738091]">No campus event registrations recorded for this student yet.</p>
            ) : (
              <div className="divide-y divide-[#E5E9EF]">
                {profileData.registrations.map((reg: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-[#202B38]">{reg.title}</p>
                      <p className="text-[#738091]">{reg.category} · {reg.venue}</p>
                    </div>
                    <span className="font-mono text-[#738091]">{reg.event_date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const columns: Column<StudentRecord>[] = [
    {
      key: 'usn',
      header: 'USN',
      sortable: true,
      sortValue: (s) => s.usn,
      render: (s) => <span className="font-mono text-xs font-medium text-[#202B38]">{s.usn}</span>,
    },
    {
      key: 'full_name',
      header: 'Student Name',
      sortable: true,
      sortValue: (s) => s.full_name,
      render: (s) => (
        <div>
          <p className="text-sm font-medium text-[#202B38]">{s.full_name}</p>
          <p className="text-xs text-[#738091]">{s.email}</p>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department & Course',
      sortable: true,
      sortValue: (s) => s.dept_code || '',
      render: (s) => (
        <div className="text-xs">
          <p className="font-medium text-[#202B38]">{s.dept_code}</p>
          <p className="text-[#738091]">{s.course_code} · Sem {s.semester}</p>
        </div>
      ),
    },
    {
      key: 'attendance_pct',
      header: 'Attendance',
      sortable: true,
      sortValue: (s) => s.attendance_pct || 0,
      render: (s) => (
        <div className="w-32">
          <ProgressBar value={s.attendance_pct || 0} />
        </div>
      ),
    },
    {
      key: 'avg_marks',
      header: 'Mean Score',
      align: 'right',
      sortable: true,
      sortValue: (s) => s.avg_marks || 0,
      render: (s) => <span className="font-mono text-xs font-semibold">{(s.avg_marks || 0).toFixed(1)}%</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => (
        <StatusText
          label={s.status === 'active' ? 'Active' : s.status === 'graduated' ? 'Graduated' : 'Inactive'}
          tone={s.status === 'active' ? 'success' : s.status === 'graduated' ? 'info' : 'danger'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="inline-flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openProfile(s.id)}
            className="p-1.5 rounded text-[#477BAA] hover:bg-[#F5F6F8] transition-colors"
            title="View Student Profile"
          >
            <Eye className="w-4 h-4" />
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => openEdit(s)}
                className="p-1.5 rounded text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8] transition-colors"
                title="Edit Student"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(s)}
                className="p-1.5 rounded text-[#D9534F] hover:bg-[#D9534F]/10 transition-colors"
                title="Delete Student"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Student Directory</h1>
          <p className="text-xs text-[#738091] mt-1">
            Manage enrolled students, department allocations, academic progress, and individual profiles.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        )}
      </div>

      <DataTable
        data={students}
        columns={columns}
        keyField={(s) => s.id}
        loading={loading}
        searchPlaceholder="Search by name, USN, email, or course..."
        searchFilter={(s, q) =>
          s.full_name.toLowerCase().includes(q) ||
          s.usn.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.dept_code || '').toLowerCase().includes(q) ||
          (s.course_name || '').toLowerCase().includes(q)
        }
        toolbarExtra={
          <>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md text-[#202B38]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </select>
            <select
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md text-[#202B38]"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  Sem {n}
                </option>
              ))}
            </select>
          </>
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Student Record' : 'Enroll New Student'}
        subtitle="Enter institutional registration and academic placement details."
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">
              USN (University Seat Number) <span className="text-[#D9534F]">*</span>
            </label>
            <input
              type="text"
              required
              value={form.usn}
              onChange={(e) => setForm({ ...form, usn: e.target.value })}
              placeholder="e.g. 1GM24CS088"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">
              Full Name <span className="text-[#D9534F]">*</span>
            </label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Full legal name"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">
              University Email <span className="text-[#D9534F]">*</span>
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="student@gmu.edu"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Phone Number</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1 (555) 400-1234"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">
              Department <span className="text-[#D9534F]">*</span>
            </label>
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
            <label className="block text-xs font-medium text-[#202B38] mb-1">
              Course Program <span className="text-[#D9534F]">*</span>
            </label>
            <select
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Semester</label>
            <select
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Enrolment Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Guardian Name</label>
            <input
              type="text"
              value={form.guardian_name}
              onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Guardian Phone</label>
            <input
              type="text"
              value={form.guardian_phone}
              onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[#202B38] mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
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
              className="px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Student Record"
        message={`Are you sure you want to permanently remove ${deleteTarget?.full_name} (${deleteTarget?.usn}) and their associated attendance and marks records?`}
        confirmLabel="Delete Student"
      />
    </div>
  );
}
