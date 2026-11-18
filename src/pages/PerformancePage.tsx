import React, { useEffect, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { StudentRecord, Subject } from '../types/erp';
import { BarChart } from '../components/ui/Charts';
import { Modal } from '../components/ui/Modal';

export function PerformancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canEdit = user?.role === 'admin' || user?.role === 'faculty';

  const [marks, setMarks] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    student_id: '',
    subject_id: '',
    internal_1: '16',
    internal_2: '16',
    assignment_score: '17',
    external_score: '32',
  });
  const [saving, setSaving] = useState(false);

  const [aiInsights, setAiInsights] = useState<{ summary: string; recommendations: string[]; mode: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadMarks = async () => {
    setLoading(true);
    try {
      const qs = subjectFilter ? `?subjectId=${subjectFilter}` : '';
      const [marksRes, acadRes] = await Promise.all([
        apiFetch<{ marks: any[] }>(`/marks${qs}`),
        apiFetch<{ subjects: Subject[] }>('/academics/overview'),
      ]);
      setMarks(marksRes.marks);
      setSubjects(acadRes.subjects);

      if (canEdit) {
        const stuRes = await apiFetch<{ students: StudentRecord[] }>('/students');
        setStudents(stuRes.students);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load performance records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarks();
  }, [subjectFilter]);

  const openEntryModal = (row?: any) => {
    if (row) {
      setForm({
        student_id: String(row.student_id),
        subject_id: String(row.subject_id),
        internal_1: String(row.internal_1),
        internal_2: String(row.internal_2),
        assignment_score: String(row.assignment_score),
        external_score: String(row.external_score),
      });
    } else {
      setForm({
        student_id: String(students[0]?.id || ''),
        subject_id: String(subjectFilter || subjects[0]?.id || ''),
        internal_1: '17',
        internal_2: '17',
        assignment_score: '18',
        external_score: '33',
      });
    }
    setModalOpen(true);
  };

  const handleSaveMarks = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ total_marks: number; grade: string }>('/marks', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      showToast('Marks saved', 'success', `Calculated Total: ${res.total_marks}/100 (Grade ${res.grade})`);
      setModalOpen(false);
      loadMarks();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAiPerformance = async () => {
    setAiLoading(true);
    try {
      const res = await apiFetch('/ai/insights/performance', { method: 'POST' });
      setAiInsights(res);
    } catch (err: any) {
      showToast(err?.message || 'Unable to generate AI performance insights', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Aggregate subject averages for chart
  const subjectAverages: Record<string, { sum: number; count: number }> = {};
  marks.forEach((m) => {
    const key = m.subject_code;
    if (!subjectAverages[key]) subjectAverages[key] = { sum: 0, count: 0 };
    subjectAverages[key].sum += Number(m.total_marks || 0);
    subjectAverages[key].count += 1;
  });
  const chartData = Object.entries(subjectAverages).map(([label, v]) => ({
    label,
    value: Math.round((v.sum / v.count) * 10) / 10,
  }));

  const topPerformers = marks.filter((m) => m.total_marks >= 85).slice(0, 4);
  const needsSupport = marks.filter((m) => m.total_marks < 60).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Student Performance &amp; Marks Analysis</h1>
          <p className="text-xs text-[#738091] mt-1">
            Official recorded assessment scores separated clearly from AI-generated advisory recommendations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runAiPerformance}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D99A32]" />
            <span>{aiLoading ? 'Analyzing...' : 'AI Performance Insights'}</span>
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => openEntryModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Enter Marks</span>
            </button>
          )}
        </div>
      </div>

      {/* Charts & AI Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#202B38]">Subject-Wise Mean Performance (Verified Marks)</h2>
          <p className="text-xs text-[#738091] mb-4">Calculated directly from recorded assessment scores</p>
          <BarChart data={chartData} barColor="#172332" unit="%" />
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D99A32]" />
              <h2 className="text-sm font-semibold text-[#202B38]">AI Performance Recommendations (Advisory)</h2>
            </div>
            {aiInsights && (
              <span className="text-[11px] text-[#738091]">
                {aiInsights.mode === 'live' ? 'Live Gemini AI' : 'Demo Mode'}
              </span>
            )}
          </div>

          {aiInsights ? (
            <div className="space-y-3 text-xs">
              <p className="text-[#202B38] leading-relaxed">{aiInsights.summary}</p>
              <ul className="space-y-1.5 pt-2 border-t border-[#E5E9EF]">
                {aiInsights.recommendations.map((r, i) => (
                  <li key={i} className="text-[#202B38]">
                    <span className="font-mono text-[#D99A32] mr-1.5">0{i + 1}.</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
              <div>
                <p className="font-semibold text-[#26865B] mb-2">High Performers (≥85%)</p>
                {topPerformers.length === 0 ? (
                  <p className="text-[#738091]">No records ≥85% in view.</p>
                ) : (
                  topPerformers.map((t, i) => (
                    <p key={i} className="py-1 text-[#202B38] truncate">
                      {t.student_name || 'You'} ({t.subject_code}: {t.total_marks}%)
                    </p>
                  ))
                )}
              </div>
              <div>
                <p className="font-semibold text-[#D9534F] mb-2">Support Recommended (&lt;60%)</p>
                {needsSupport.length === 0 ? (
                  <p className="text-[#738091]">No records below 60%.</p>
                ) : (
                  needsSupport.map((t, i) => (
                    <p key={i} className="py-1 text-[#202B38] truncate">
                      {t.student_name || 'You'} ({t.subject_code}: {t.total_marks}%)
                    </p>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marks Table */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E9EF] flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#202B38]">Official Assessment Ledger</h2>
          {canEdit && (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          )}
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
                  {canEdit && <th className="px-4 py-2.5">Student</th>}
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5 text-right">IA 1 (20)</th>
                  <th className="px-4 py-2.5 text-right">IA 2 (20)</th>
                  <th className="px-4 py-2.5 text-right">Asg (20)</th>
                  <th className="px-4 py-2.5 text-right">Ext (40)</th>
                  <th className="px-4 py-2.5 text-right">Total (100)</th>
                  <th className="px-4 py-2.5 text-right">Grade</th>
                  {canEdit && <th className="px-4 py-2.5 text-right">Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9EF] text-sm">
                {marks.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F5F6F8]/60">
                    {canEdit && (
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#202B38]">{m.student_name}</p>
                        <p className="text-xs font-mono text-[#738091]">
                          {m.usn} · {m.dept_code}
                        </p>
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono font-semibold text-[#202B38]">{m.subject_code}</span>
                      <span className="text-[#738091] ml-1.5">{m.subject_name}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.internal_1}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.internal_2}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.assignment_score}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{m.external_score}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{m.total_marks}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-[#26865B]">{m.grade}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEntryModal(m)}
                          className="text-xs font-medium text-[#477BAA] hover:underline"
                        >
                          Update
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Enter / Update Student Marks">
        <form onSubmit={handleSaveMarks} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Student</label>
              <select
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.usn} — {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Subject</label>
              <select
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.code} — {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Internal 1 (0–20)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={form.internal_1}
                onChange={(e) => setForm({ ...form, internal_1: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Internal 2 (0–20)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={form.internal_2}
                onChange={(e) => setForm({ ...form, internal_2: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Assignment (0–20)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={form.assignment_score}
                onChange={(e) => setForm({ ...form, assignment_score: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">External (0–40)</label>
              <input
                type="number"
                min={0}
                max={40}
                value={form.external_score}
                onChange={(e) => setForm({ ...form, external_score: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9EF]">
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
              {saving ? 'Calculating...' : 'Save Marks'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
