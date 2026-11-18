import React, { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Department, Subject } from '../types/erp';
import { ProgressBar } from '../components/ui/Charts';
import { StatusText } from '../components/ui/StatusText';

export function AttendancePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const canMark = user?.role === 'admin' || user?.role === 'faculty';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [deptId, setDeptId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('2026-11-13');
  const [search, setSearch] = useState('');

  const [threshold, setThreshold] = useState(75);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [studentSummary, setStudentSummary] = useState<any[]>([]);
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [dayMarks, setDayMarks] = useState<Record<number, 'present' | 'absent' | 'late'>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [aiAnalysis, setAiAnalysis] = useState<{ summary: string; recommendations: string[]; mode: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ departments: Department[]; subjects: Subject[] }>('/academics/overview').then((res) => {
      setDepartments(res.departments);
      setSubjects(res.subjects);
      if (res.subjects.length > 0) {
        const own =
          user?.role === 'faculty'
            ? res.subjects.find((s) => s.faculty_id === user.faculty_id) || res.subjects[0]
            : res.subjects[0];
        setSubjectId(String(own.id));
        setDeptId(String(own.department_id));
      }
    });
  }, [user]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (subjectId) qs.set('subjectId', subjectId);
      if (deptId) qs.set('departmentId', deptId);
      if (date) qs.set('date', date);
      const data = await apiFetch(`/attendance?${qs.toString()}`);
      setThreshold(data.threshold || 75);
      if (user?.role === 'student') {
        setStudentSummary(data.summary || []);
        setStudentRecords(data.records || []);
      } else {
        const list = data.studentList || [];
        setStudentList(list);
        const init: Record<number, 'present' | 'absent' | 'late'> = {};
        list.forEach((row: any) => {
          init[row.student_id] = row.day_status || 'present';
        });
        setDayMarks(init);
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [subjectId, deptId, date]);

  const handleSaveAttendance = async () => {
    if (!subjectId) {
      showToast('Select a subject first.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const entries = Object.entries(dayMarks).map(([sid, status]) => ({
        student_id: Number(sid),
        status,
      }));
      await apiFetch('/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ subject_id: Number(subjectId), date, entries }),
      });
      showToast('Attendance saved successfully', 'success', `${entries.length} student records updated for ${date}`);
      loadAttendance();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save attendance', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runAiAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await apiFetch('/ai/insights/attendance', { method: 'POST' });
      setAiAnalysis(res);
    } catch (err: any) {
      showToast(err?.message || 'Unable to generate AI attendance analysis', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  if (user?.role === 'student') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">My Attendance Overview</h1>
          <p className="text-xs text-[#738091] mt-1">
            Subject-wise attendance percentages against the configurable {threshold}% institutional benchmark.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {studentSummary.map((sub) => (
            <div key={sub.subject_id} className="bg-white border border-[#E5E9EF] rounded-lg p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs text-[#738091]">{sub.code}</span>
                  <h3 className="text-sm font-semibold text-[#202B38]">{sub.name}</h3>
                </div>
                <StatusText
                  label={(sub.percentage ?? 0) >= threshold ? 'On Track' : 'Below Benchmark'}
                  tone={(sub.percentage ?? 0) >= threshold ? 'success' : 'danger'}
                />
              </div>
              <ProgressBar value={sub.percentage ?? 0} threshold={threshold} />
              <p className="text-xs text-[#738091] font-mono tabular-nums">
                Attended {sub.attended} of {sub.total_classes} sessions
              </p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E5E9EF]">
            <h2 className="text-sm font-semibold text-[#202B38]">Recent Session History</h2>
          </div>
          <div className="overflow-x-auto">
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
                {studentRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 font-mono tabular-nums">{r.date}</td>
                    <td className="px-4 py-2.5 font-medium">
                      {r.subject_code} — {r.subject_name}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusText
                        label={r.status}
                        tone={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : 'danger'}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-[#738091]">{r.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const filteredList = studentList.filter(
    (s) =>
      !search.trim() ||
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.usn.toLowerCase().includes(search.toLowerCase())
  );

  const visibleSubjects = deptId
    ? subjects.filter((s) => String(s.department_id) === String(deptId))
    : subjects;

  const flaggedStudents = studentList.filter((s) => (s.percentage ?? 0) < threshold);

  const sessionCounts = filteredList.reduce(
    (acc, st) => {
      const val = dayMarks[st.student_id] || 'present';
      acc[val] += 1;
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );

  const markAllAs = (status: 'present' | 'absent') => {
    setDayMarks((prev) => {
      const next = { ...prev };
      filteredList.forEach((st) => {
        next[st.student_id] = status;
      });
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Attendance Management &amp; AI Analysis</h1>
          <p className="text-xs text-[#738091] mt-1">
            Mark daily session attendance, monitor cumulative thresholds ({threshold}% configurable default), and review AI pattern insights.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runAiAnalysis}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D99A32]" />
            <span>{aiLoading ? 'Analyzing...' : 'Run AI Attendance Analysis'}</span>
          </button>
          {canMark && (
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md whitespace-nowrap disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Session Attendance'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-[#738091] mb-1">Department</label>
          <select
            value={deptId}
            onChange={(e) => {
              const nextDept = e.target.value;
              setDeptId(nextDept);
              if (nextDept) {
                const match = subjects.find((s) => String(s.department_id) === nextDept);
                if (match) setSubjectId(String(match.id));
              }
            }}
            className="w-full px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#738091] mb-1">Subject</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
          >
            {(visibleSubjects.length > 0 ? visibleSubjects : subjects).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#738091] mb-1">Session Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md font-mono"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-[#738091] mb-1">Search Student</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or USN..."
            className="w-full px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
          />
        </div>
      </div>

      {/* AI Analysis Panel */}
      {(aiAnalysis || flaggedStudents.length > 0) && (
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D99A32]" />
              <h2 className="text-sm font-semibold text-[#202B38]">
                Attendance Pattern &amp; Threshold Advisory ({flaggedStudents.length} below {threshold}%)
              </h2>
            </div>
            {aiAnalysis && (
              <span className="text-[11px] text-[#738091]">
                Source: {aiAnalysis.mode === 'live' ? 'Live Gemini AI' : 'Demo Mode'} (Advisory)
              </span>
            )}
          </div>
          {aiAnalysis ? (
            <>
              <p className="text-xs text-[#202B38] leading-relaxed">{aiAnalysis.summary}</p>
              <ul className="space-y-1 text-xs text-[#738091]">
                {aiAnalysis.recommendations.map((rec, i) => (
                  <li key={i}>
                    <span className="font-mono text-[#D99A32] mr-1.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-[#738091]">
              {flaggedStudents.length} student(s) currently fall below the configurable {threshold}% benchmark in this filter. Click &ldquo;Run AI Attendance Analysis&rdquo; for tailored follow-up recommendations.
            </p>
          )}
        </div>
      )}

      {/* Attendance Roster Table */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
        {!loading && canMark && filteredList.length > 0 && (
          <div className="px-4 py-2.5 border-b border-[#E5E9EF] flex flex-wrap items-center justify-between gap-3 bg-[#F5F6F8]/50">
            <div className="flex items-center gap-3 text-xs text-[#738091] font-mono tabular-nums">
              <span>Showing {filteredList.length} students</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#26865B] font-medium">Present: {sessionCounts.present}</span>
              <span className="text-[#BD8123] font-medium">Late: {sessionCounts.late}</span>
              <span className="text-[#D9534F] font-medium">Absent: {sessionCounts.absent}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => markAllAs('present')}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-[#E5E9EF] hover:border-[#26865B] text-[#26865B] rounded transition-colors"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAllAs('absent')}
                className="px-2.5 py-1 text-xs font-medium bg-white border border-[#E5E9EF] hover:border-[#D9534F] text-[#D9534F] rounded transition-colors"
              >
                Mark All Absent
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-[#F5F6F8] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF] text-xs font-semibold text-[#738091]">
                  <th className="px-4 py-2.5">USN</th>
                  <th className="px-4 py-2.5">Student</th>
                  <th className="px-4 py-2.5">Cumulative Progress</th>
                  <th className="px-4 py-2.5">Threshold Status</th>
                  <th className="px-4 py-2.5 text-right">Session ({date})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9EF] text-sm">
                {filteredList.map((st) => {
                  const status = dayMarks[st.student_id] || 'present';
                  return (
                    <tr key={st.student_id} className="hover:bg-[#F5F6F8]/60">
                      <td className="px-4 py-3 font-mono text-xs">{st.usn}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#202B38]">{st.full_name}</p>
                        <p className="text-xs text-[#738091]">
                          {st.dept_code} · Sem {st.semester}
                        </p>
                      </td>
                      <td className="px-4 py-3 w-48">
                        <ProgressBar value={st.percentage || 0} threshold={threshold} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusText
                          label={(st.percentage || 0) >= threshold ? 'Compliant' : 'Attention Required'}
                          tone={(st.percentage || 0) >= threshold ? 'success' : 'danger'}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1 p-0.5 bg-[#F5F6F8] border border-[#E5E9EF] rounded-md">
                          {(['present', 'late', 'absent'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setDayMarks((prev) => ({ ...prev, [st.student_id]: opt }))}
                              className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${
                                status === opt
                                  ? opt === 'present'
                                    ? 'bg-[#26865B] text-white'
                                    : opt === 'late'
                                    ? 'bg-[#D99A32] text-white'
                                    : 'bg-[#D9534F] text-white'
                                  : 'text-[#738091] hover:text-[#202B38]'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
