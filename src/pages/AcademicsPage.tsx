import React, { useEffect, useState } from 'react';
import { Edit2, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Course, Department, FacultyRecord, Subject } from '../types/erp';
import { Modal } from '../components/ui/Modal';

export function AcademicsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [tab, setTab] = useState<'departments' | 'courses' | 'subjects'>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<FacultyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalType, setModalType] = useState<'dept' | 'course' | 'subject' | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({});

  const loadAll = async () => {
    setLoading(true);
    try {
      const [acad, fac] = await Promise.all([
        apiFetch<{ departments: Department[]; courses: Course[]; subjects: Subject[] }>('/academics/overview'),
        apiFetch<{ faculty: FacultyRecord[] }>('/faculty'),
      ]);
      setDepartments(acad.departments);
      setCourses(acad.courses);
      setSubjects(acad.subjects);
      setFaculty(fac.faculty);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load academic catalog', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openModal = (type: 'dept' | 'course' | 'subject', item?: any) => {
    setModalType(type);
    setEditingId(item?.id || null);
    if (type === 'dept') {
      setForm(
        item || { code: '', name: '', head_name: '', building: '', description: '', established_year: 2020 }
      );
    } else if (type === 'course') {
      setForm(
        item || {
          code: '',
          name: '',
          department_id: departments[0]?.id || '',
          credits: 160,
          duration_semesters: 8,
          description: '',
        }
      );
    } else {
      setForm(
        item || {
          code: '',
          name: '',
          department_id: departments[0]?.id || '',
          course_id: courses[0]?.id || '',
          semester: 5,
          credits: 4,
          faculty_id: faculty[0]?.id || '',
          schedule_slot: 'Mon/Wed 10:00 AM',
        }
      );
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint =
        modalType === 'dept' ? '/departments' : modalType === 'course' ? '/courses' : '/subjects';
      if (editingId) {
        await apiFetch(`${endpoint}/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        showToast('Record updated', 'success');
      } else {
        await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(form) });
        showToast('Record created', 'success');
      }
      setModalType(null);
      loadAll();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save record', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Departments, Courses &amp; Subjects</h1>
          <p className="text-xs text-[#738091] mt-1">
            Structured institutional hierarchy, degree credits, semester schedules, and faculty allocations.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => openModal(tab === 'departments' ? 'dept' : tab === 'courses' ? 'course' : 'subject')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>
              Add {tab === 'departments' ? 'Department' : tab === 'courses' ? 'Course' : 'Subject'}
            </span>
          </button>
        )}
      </div>

      {/* Segmented Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white border border-[#E5E9EF] rounded-lg w-fit">
        {(['departments', 'courses', 'subjects'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              tab === t ? 'bg-[#172332] text-white' : 'text-[#738091] hover:text-[#202B38]'
            }`}
          >
            {t} ({t === 'departments' ? departments.length : t === 'courses' ? courses.length : subjects.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 bg-white border border-[#E5E9EF] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tab === 'departments' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {departments.map((d) => (
            <div key={d.id} className="bg-white border border-[#E5E9EF] rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-semibold text-[#D99A32]">{d.code}</span>
                    <h2 className="text-base font-semibold text-[#202B38] mt-0.5">{d.name}</h2>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openModal('dept', d)}
                      className="p-1.5 rounded text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8]"
                      aria-label={`Edit ${d.name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#738091] mt-2 leading-relaxed">{d.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E5E9EF] flex flex-wrap items-center justify-between gap-2 text-xs text-[#738091]">
                <span>HOD: <strong className="text-[#202B38] font-medium">{d.head_name}</strong> · {d.building}</span>
                <span className="font-mono tabular-nums">
                  {d.student_count} Students · {d.faculty_count} Faculty
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'courses' ? (
        <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF] text-xs font-semibold text-[#738091]">
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Program Name</th>
                <th className="px-4 py-2.5">Department</th>
                <th className="px-4 py-2.5 text-right">Credits</th>
                <th className="px-4 py-2.5 text-right">Semesters</th>
                <th className="px-4 py-2.5 text-right">Enrolled</th>
                {isAdmin && <th className="px-4 py-2.5 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9EF] text-sm">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-[#F5F6F8]/60">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#202B38]">{c.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#202B38]">{c.name}</p>
                    <p className="text-xs text-[#738091]">{c.description}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{c.dept_code}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{c.credits}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{c.duration_semesters}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{c.enrolled_count}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal('course', c)}
                        className="p-1.5 rounded text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF] text-xs font-semibold text-[#738091]">
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Subject Title</th>
                <th className="px-4 py-2.5">Dept / Program</th>
                <th className="px-4 py-2.5 text-right">Sem</th>
                <th className="px-4 py-2.5 text-right">Credits</th>
                <th className="px-4 py-2.5">Assigned Faculty</th>
                <th className="px-4 py-2.5">Schedule</th>
                {isAdmin && <th className="px-4 py-2.5 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E9EF] text-sm">
              {subjects.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#F5F6F8]/60">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#202B38]">{sub.code}</td>
                  <td className="px-4 py-3 font-medium text-[#202B38]">{sub.name}</td>
                  <td className="px-4 py-3 text-xs text-[#738091]">
                    {sub.dept_code} · {sub.course_code}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{sub.semester}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{sub.credits}</td>
                  <td className="px-4 py-3 text-xs text-[#202B38]">{sub.faculty_name || 'Unassigned'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-[#477BAA]">{sub.schedule_slot}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openModal('subject', sub)}
                        className="p-1.5 rounded text-[#738091] hover:text-[#202B38] hover:bg-[#F5F6F8]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(modalType)}
        onClose={() => setModalType(null)}
        title={`${editingId ? 'Edit' : 'Create'} ${
          modalType === 'dept' ? 'Department' : modalType === 'course' ? 'Course' : 'Subject'
        }`}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Code *</label>
              <input
                type="text"
                required
                value={form.code || ''}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Name *</label>
              <input
                type="text"
                required
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>
          </div>

          {modalType === 'dept' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Head of Department *</label>
                  <input
                    type="text"
                    required
                    value={form.head_name || ''}
                    onChange={(e) => setForm({ ...form, head_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Building *</label>
                  <input
                    type="text"
                    required
                    value={form.building || ''}
                    onChange={(e) => setForm({ ...form, building: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Description</label>
                <textarea
                  rows={3}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                />
              </div>
            </>
          )}

          {modalType === 'course' && (
            <>
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Department</label>
                <select
                  value={form.department_id || ''}
                  onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Total Credits</label>
                  <input
                    type="number"
                    value={form.credits || 160}
                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Duration (Semesters)</label>
                  <input
                    type="number"
                    value={form.duration_semesters || 8}
                    onChange={(e) => setForm({ ...form, duration_semesters: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                />
              </div>
            </>
          )}

          {modalType === 'subject' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Department</label>
                  <select
                    value={form.department_id || ''}
                    onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Course</label>
                  <select
                    value={form.course_id || ''}
                    onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Semester</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={form.semester || 5}
                    onChange={(e) => setForm({ ...form, semester: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={form.credits || 4}
                    onChange={(e) => setForm({ ...form, credits: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Assigned Faculty</label>
                  <select
                    value={form.faculty_id || ''}
                    onChange={(e) => setForm({ ...form, faculty_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
                  >
                    <option value="">Unassigned</option>
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#202B38] mb-1">Schedule Slot</label>
                  <input
                    type="text"
                    value={form.schedule_slot || ''}
                    onChange={(e) => setForm({ ...form, schedule_slot: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9EF]">
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="px-4 py-2 text-xs font-medium border border-[#E5E9EF] rounded-md hover:bg-[#F5F6F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
