import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Building2,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  Megaphone,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Department, ModuleId } from '../types/erp';
import { BarChart, DonutChart, LineTrendChart, ProgressBar } from '../components/ui/Charts';
import { StatusText } from '../components/ui/StatusText';

function getTimeGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage({ onNavigate }: { onNavigate: (m: ModuleId) => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin filters
  const [academicYear, setAcademicYear] = useState('2026-27');
  const [semester, setSemester] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [dateRange, setDateRange] = useState('30d');

  // AI Institutional Insights
  const [aiInsight, setAiInsight] = useState<{ summary: string; recommendations: string[]; mode: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (departmentId) qs.set('departmentId', departmentId);
      if (semester) qs.set('semester', semester);
      if (academicYear) qs.set('academicYear', academicYear);
      if (dateRange) qs.set('dateRange', dateRange);

      const [dash, acad] = await Promise.all([
        apiFetch(`/dashboard?${qs.toString()}`),
        apiFetch<{ departments: Department[] }>('/academics/overview'),
      ]);
      setData(dash);
      setDepartments(acad.departments);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [departmentId, semester, academicYear, dateRange]);

  const fetchAiInsights = async () => {
    setAiLoading(true);
    try {
      const res = await apiFetch('/ai/insights/institutional', { method: 'POST' });
      setAiInsight(res);
    } catch (err: any) {
      showToast(err?.message || 'Unable to generate insights', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-white border border-[#E5E9EF] rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-white border border-[#E5E9EF] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // =====================================
  // ADMINISTRATOR DASHBOARD
  // =====================================
  if (data.role === 'admin') {
    const s = data.stats;
    const sentimentMap: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    (data.charts.sentimentDist || []).forEach((item: any) => {
      sentimentMap[item.label] = item.count;
    });

    const kpis = [
      { label: 'Total Students', value: s.totalStudents, icon: Users, sub: 'Active enrolled', module: 'students' as ModuleId },
      { label: 'Total Faculty', value: s.totalFaculty, icon: GraduationCap, sub: 'Teaching staff', module: 'faculty' as ModuleId },
      { label: 'Departments', value: s.totalDepartments, icon: Building2, sub: 'Academic units', module: 'academics' as ModuleId },
      { label: 'Total Courses', value: s.totalCourses, icon: BookOpen, sub: 'Degree programs', module: 'academics' as ModuleId },
      { label: 'Average Attendance', value: `${s.avgAttendance}%`, icon: ClipboardCheck, sub: `Target ${data.threshold}%`, module: 'attendance' as ModuleId },
      { label: 'Upcoming Events', value: s.upcomingEventsCount, icon: Calendar, sub: 'Scheduled campus', module: 'events' as ModuleId },
      { label: 'Pending Requests', value: s.pendingRequests, icon: AlertTriangle, sub: 'Open feedback queue', module: 'feedback' as ModuleId },
      { label: 'Available Resources', value: s.availableResources, icon: Building2, sub: 'Labs & classrooms', module: 'resources' as ModuleId },
    ];

    const hasCustomFilters = Boolean(departmentId || semester || dateRange !== '30d' || academicYear !== '2026-27');

    return (
      <div className="space-y-6">
        {/* Header & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#202B38]">
              {getTimeGreeting()}, {user?.full_name?.split(' ')[0] || 'Administrator'}
            </h1>
            <p className="text-xs text-[#738091] mt-1">
              GMU ERP Management · Institutional overview across departments, attendance compliance, and campus operations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              aria-label="Academic Year"
              className="px-3 py-1.5 text-xs bg-white border border-[#E5E9EF] rounded-md text-[#202B38] focus:outline-none focus:border-[#D99A32]"
            >
              <option value="2026-27">AY 2026-27</option>
              <option value="2025-26">AY 2025-26</option>
            </select>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              aria-label="Filter by department"
              className="px-3 py-1.5 text-xs bg-white border border-[#E5E9EF] rounded-md text-[#202B38] focus:outline-none focus:border-[#D99A32]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              aria-label="Filter by semester"
              className="px-3 py-1.5 text-xs bg-white border border-[#E5E9EF] rounded-md text-[#202B38] focus:outline-none focus:border-[#D99A32]"
            >
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              aria-label="Date range"
              className="px-3 py-1.5 text-xs bg-white border border-[#E5E9EF] rounded-md text-[#202B38] focus:outline-none focus:border-[#D99A32]"
            >
              <option value="30d">Last 30 Days</option>
              <option value="90d">Current Term</option>
              <option value="1y">Full Academic Year</option>
            </select>
            {hasCustomFilters && (
              <button
                type="button"
                onClick={() => {
                  setAcademicYear('2026-27');
                  setDepartmentId('');
                  setSemester('');
                  setDateRange('30d');
                }}
                className="px-2.5 py-1.5 text-xs font-medium text-[#477BAA] hover:underline whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions Strip */}
        <div className="bg-white border border-[#E5E9EF] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#202B38]">Quick Actions</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('students')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F5F6F8] hover:bg-[#E5E9EF] text-[#202B38] rounded-md transition-colors whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5 text-[#D99A32]" />
              <span>Manage Students</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('announcements')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F5F6F8] hover:bg-[#E5E9EF] text-[#202B38] rounded-md transition-colors whitespace-nowrap"
            >
              <Megaphone className="w-3.5 h-3.5 text-[#D99A32]" />
              <span>Post Notice</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F5F6F8] hover:bg-[#E5E9EF] text-[#202B38] rounded-md transition-colors whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#D99A32]" />
              <span>Export Reports</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('campus-ai')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#172332] hover:bg-[#243447] text-white rounded-md transition-colors whitespace-nowrap"
            >
              <Bot className="w-3.5 h-3.5 text-[#D99A32]" />
              <span>Ask Campus AI</span>
            </button>
          </div>
        </div>

        {/* 8 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <button
                key={k.label}
                type="button"
                onClick={() => onNavigate(k.module)}
                className="group text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#738091]">{k.label}</span>
                  <Icon className="w-4 h-4 text-[#D99A32]" />
                </div>
                <p className="font-display text-2xl font-semibold text-[#202B38] mt-2 tabular-nums">{k.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-[#738091]">{k.sub}</p>
                  <ArrowRight className="w-3.5 h-3.5 text-[#738091] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#202B38]">Student Enrolment Trends</h2>
                <p className="text-xs text-[#738091]">Five-year institutional cohort growth</p>
              </div>
              <span className="text-xs font-mono text-[#26865B] font-medium">+8.4% YoY</span>
            </div>
            <LineTrendChart data={data.charts.enrollmentTrend} strokeColor="#172332" unit="" />
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[#202B38]">Daily Attendance Trajectory</h2>
                <p className="text-xs text-[#738091]">Campus-wide class attendance percentage</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="text-xs font-medium text-[#477BAA] hover:underline"
              >
                View Details
              </button>
            </div>
            <LineTrendChart
              data={(data.charts.attendanceByDate || []).map((d: any) => ({ label: d.date, value: d.rate }))}
              strokeColor="#D99A32"
              unit="%"
            />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <h2 className="text-sm font-semibold text-[#202B38]">Department-Wise Student Distribution</h2>
            <p className="text-xs text-[#738091] mb-4">Active students per department</p>
            <BarChart
              data={(data.charts.deptDistribution || []).map((d: any) => ({ label: d.code, value: d.student_count }))}
              barColor="#172332"
            />
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <h2 className="text-sm font-semibold text-[#202B38]">Academic Performance Overview</h2>
            <p className="text-xs text-[#738091] mb-4">Mean assessment score by department</p>
            <BarChart
              data={(data.charts.performanceByDept || []).map((d: any) => ({ label: d.label, value: d.avg_score }))}
              barColor="#477BAA"
              unit="%"
            />
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <h2 className="text-sm font-semibold text-[#202B38]">Feedback Sentiment Distribution</h2>
            <p className="text-xs text-[#738091] mb-4">Classified campus feedback submissions</p>
            <DonutChart
              segments={[
                { label: 'Positive', value: sentimentMap.positive, color: '#26865B' },
                { label: 'Neutral', value: sentimentMap.neutral, color: '#D99A32' },
                { label: 'Negative', value: sentimentMap.negative, color: '#D9534F' },
              ]}
            />
          </div>
        </div>

        {/* AI Institutional Insights + Students Requiring Attention */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D99A32]" />
                  <h2 className="text-sm font-semibold text-[#202B38]">AI Institutional Insights</h2>
                </div>
                <button
                  type="button"
                  onClick={fetchAiInsights}
                  disabled={aiLoading}
                  className="px-3 py-1.5 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {aiLoading ? 'Analyzing...' : aiInsight ? 'Refresh Analysis' : 'Generate AI Summary'}
                </button>
              </div>
              {aiInsight ? (
                <div className="space-y-3 text-xs">
                  <p className="text-[#738091]">
                    Source: <span className="font-medium text-[#202B38]">{aiInsight.mode === 'live' ? 'Live Gemini AI' : 'Demo Mode Analysis'}</span> (Advisory only)
                  </p>
                  <p className="text-[#202B38] leading-relaxed">{aiInsight.summary}</p>
                  <ul className="space-y-1.5 pt-2 border-t border-[#E5E9EF]">
                    {aiInsight.recommendations.map((rec, i) => (
                      <li key={i} className="text-[#202B38] flex items-start gap-2">
                        <span className="font-mono text-[#D99A32] font-semibold">0{i + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-[#738091] leading-relaxed py-4">
                  Click &ldquo;Generate AI Summary&rdquo; to synthesize live attendance patterns, assessment scores, and
                  unresolved feedback items into actionable administrative priorities.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-[#202B38]">Students Requiring Attention</h2>
                <p className="text-xs text-[#738091]">Below {data.threshold}% attendance or &lt;60% mean score</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('attendance')}
                className="text-xs font-medium text-[#477BAA] hover:underline"
              >
                Review All
              </button>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {(data.studentsAttention || []).length === 0 ? (
                <p className="py-6 text-xs text-[#738091] text-center">All students meet institutional benchmarks.</p>
              ) : (
                data.studentsAttention.map((st: any) => (
                  <div key={st.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#202B38] truncate">{st.full_name}</p>
                      <p className="text-[11px] text-[#738091] font-mono">
                        {st.usn} · {st.dept_code}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs font-mono tabular-nums">
                      <span className={st.attendance_pct < data.threshold ? 'text-[#D9534F] font-semibold' : 'text-[#202B38]'}>
                        Att: {st.attendance_pct ?? 0}%
                      </span>
                      <span className={st.avg_marks < 60 ? 'text-[#BD8123] font-semibold' : 'text-[#202B38]'}>
                        Marks: {st.avg_marks ?? 0}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Operational Sections: Upcoming Events, Pending Approvals, Announcements, Resources & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#202B38]">Upcoming Events Timeline</h2>
              <button type="button" onClick={() => onNavigate('events')} className="text-xs text-[#477BAA] hover:underline">
                Manage
              </button>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {(data.upcomingEvents || []).map((ev: any) => (
                <div key={ev.id} className="py-2.5">
                  <p className="text-xs font-medium text-[#202B38]">{ev.title}</p>
                  <p className="text-[11px] text-[#738091] mt-0.5 font-mono tabular-nums">
                    {ev.event_date} · {ev.venue} · {ev.registered_count}/{ev.capacity}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#202B38]">Pending Requests &amp; Feedback</h2>
              <button type="button" onClick={() => onNavigate('feedback')} className="text-xs text-[#477BAA] hover:underline">
                Open Queue
              </button>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {(data.openFeedbackList || []).length === 0 ? (
                <p className="py-6 text-xs text-[#738091] text-center">No pending open requests.</p>
              ) : (
                data.openFeedbackList.map((fb: any) => (
                  <div key={fb.id} className="py-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#202B38]">{fb.category}</span>
                      <StatusText
                        label={fb.sentiment}
                        tone={fb.sentiment === 'positive' ? 'success' : fb.sentiment === 'negative' ? 'danger' : 'warning'}
                      />
                    </div>
                    <p className="text-[11px] text-[#738091] mt-1 line-clamp-2">{fb.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#202B38]">Resource Availability &amp; Activity</h2>
              <button type="button" onClick={() => onNavigate('resources')} className="text-xs text-[#477BAA] hover:underline">
                Resources
              </button>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {(data.resourcesSummary || []).slice(0, 4).map((r: any) => (
                <div key={r.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-[#202B38] truncate">{r.name}</p>
                    <p className="text-[11px] text-[#738091]">{r.building}</p>
                  </div>
                  <StatusText
                    label={r.status === 'available' ? 'Available' : 'Maintenance'}
                    tone={r.status === 'available' ? 'success' : 'warning'}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#E5E9EF]">
              <p className="text-[11px] font-semibold text-[#738091] mb-2">Recent System Activity</p>
              {(data.recentActivities || []).slice(0, 3).map((act: any) => (
                <p key={act.id} className="text-[11px] text-[#202B38] truncate py-0.5">
                  <span className="font-medium">{act.actor_name}:</span> {act.details}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================
  // FACULTY DASHBOARD
  // =====================================
  if (data.role === 'faculty') {
    const lowAtt = (data.classStudents || []).filter((s: any) => (s.attendance_pct ?? 0) < data.threshold);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#202B38]">
              {getTimeGreeting()}, {user?.full_name}
            </h1>
            <p className="text-xs text-[#738091] mt-1">
              GMU Faculty Workspace · Manage assigned subjects, attendance, internal marks, and instructional materials.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors whitespace-nowrap"
            >
              Mark Attendance
            </button>
            <button
              type="button"
              onClick={() => onNavigate('performance')}
              className="px-4 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md transition-colors whitespace-nowrap"
            >
              Enter Marks
            </button>
            <button
              type="button"
              onClick={() => onNavigate('resources')}
              className="px-4 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md transition-colors whitespace-nowrap"
            >
              Book Lab / Room
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('academics')}
            className="text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
          >
            <span className="text-xs text-[#738091]">Assigned Subjects</span>
            <p className="font-display text-2xl font-semibold text-[#202B38] mt-1 tabular-nums">
              {data.assignedSubjects.length}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
          >
            <span className="text-xs text-[#738091]">Students in Classes</span>
            <p className="font-display text-2xl font-semibold text-[#202B38] mt-1 tabular-nums">
              {data.classStudents.length}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
          >
            <span className="text-xs text-[#738091]">Below {data.threshold}% Attendance</span>
            <p className="font-display text-2xl font-semibold text-[#D9534F] mt-1 tabular-nums">{lowAtt.length}</p>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('content-gen')}
            className="text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
          >
            <span className="text-xs text-[#738091]">Active Assignments</span>
            <p className="font-display text-2xl font-semibold text-[#202B38] mt-1 tabular-nums">
              {data.assignments.length}
            </p>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <h2 className="text-sm font-semibold text-[#202B38] mb-3">Assigned Subjects &amp; Timetable</h2>
            <div className="divide-y divide-[#E5E9EF]">
              {data.assignedSubjects.map((sub: any) => (
                <div key={sub.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#202B38]">
                      {sub.code} — {sub.name}
                    </p>
                    <p className="text-[11px] text-[#738091] mt-0.5">
                      {sub.dept_code} · Semester {sub.semester} · {sub.credits} Credits
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#477BAA] whitespace-nowrap">{sub.schedule_slot}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#202B38]">Class Roster &amp; Attendance Status</h2>
              <button type="button" onClick={() => onNavigate('students')} className="text-xs text-[#477BAA] hover:underline">
                Student Directory
              </button>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {data.classStudents.slice(0, 6).map((st: any) => (
                <div key={st.id} className="py-2.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#202B38] truncate">{st.full_name}</p>
                    <p className="text-[11px] font-mono text-[#738091]">{st.usn}</p>
                  </div>
                  <div className="w-40 shrink-0">
                    <ProgressBar value={st.attendance_pct ?? 0} threshold={data.threshold} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#202B38]">Published Assignments</h2>
              <button type="button" onClick={() => onNavigate('content-gen')} className="text-xs text-[#477BAA] hover:underline">
                AI Draft
              </button>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {data.assignments.map((a: any) => (
                <div key={a.id} className="py-2.5">
                  <p className="text-xs font-medium text-[#202B38]">{a.title}</p>
                  <p className="text-[11px] text-[#738091] font-mono mt-0.5">
                    {a.subject_code} · Due {a.due_date} · {a.max_marks} Marks
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#202B38]">My Room &amp; Lab Bookings</h2>
              <button type="button" onClick={() => onNavigate('resources')} className="text-xs text-[#477BAA] hover:underline">
                Book Room
              </button>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {data.myBookings.length === 0 ? (
                <p className="py-6 text-xs text-[#738091] text-center">No upcoming bookings.</p>
              ) : (
                data.myBookings.map((b: any) => (
                  <div key={b.id} className="py-2.5">
                    <p className="text-xs font-medium text-[#202B38]">{b.resource_name}</p>
                    <p className="text-[11px] text-[#738091] font-mono mt-0.5">
                      {b.booking_date} · {b.start_time}–{b.end_time}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#202B38]">Campus Announcements</h2>
              <button type="button" onClick={() => onNavigate('announcements')} className="text-xs text-[#477BAA] hover:underline">
                All Notices
              </button>
            </div>
            <div className="divide-y divide-[#E5E9EF]">
              {data.announcements.slice(0, 3).map((ann: any) => (
                <div key={ann.id} className="py-2.5">
                  <p className="text-xs font-medium text-[#202B38]">{ann.title}</p>
                  <p className="text-[11px] text-[#738091] mt-0.5 line-clamp-2">{ann.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =====================================
  // STUDENT DASHBOARD
  // =====================================
  const stu = data.student;
  const attList = data.subjectAttendance || [];
  const overallAtt =
    attList.length > 0
      ? (attList.reduce((acc: number, x: any) => acc + Number(x.percentage || 0), 0) / attList.length).toFixed(1)
      : '0.0';
  const marksList = data.marks || [];
  const overallMarks =
    marksList.length > 0
      ? (marksList.reduce((acc: number, x: any) => acc + Number(x.total_marks || 0), 0) / marksList.length).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Personal Academic Banner */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={stu.full_name}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover border border-[#E5E9EF]"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#172332] text-white flex items-center justify-center font-semibold">
              {stu.full_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display text-xl font-semibold text-[#202B38]">Welcome, {stu.full_name}</h1>
            <p className="text-xs text-[#738091] mt-0.5">
              <span className="font-mono font-medium text-[#202B38]">{stu.usn}</span> · {stu.department_name} · Semester{' '}
              {stu.semester} · AY {stu.academic_year}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('campus-ai')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors whitespace-nowrap"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask Campus AI</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('academic-assist')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D99A32]" />
            <span>Generate Study Notes</span>
          </button>
        </div>
      </div>

      {/* Student Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
        >
          <span className="text-xs text-[#738091]">Cumulative Attendance</span>
          <p className="font-display text-2xl font-semibold text-[#202B38] mt-1 tabular-nums">{overallAtt}%</p>
          <p className="text-[11px] text-[#738091] mt-1">Benchmark: {data.threshold}%</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('performance')}
          className="text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
        >
          <span className="text-xs text-[#738091]">Average Assessment Score</span>
          <p className="font-display text-2xl font-semibold text-[#202B38] mt-1 tabular-nums">{overallMarks}%</p>
          <p className="text-[11px] text-[#738091] mt-1">{marksList.length} subjects graded</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('academics')}
          className="text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
        >
          <span className="text-xs text-[#738091]">Enrolled Subjects</span>
          <p className="font-display text-2xl font-semibold text-[#202B38] mt-1 tabular-nums">{attList.length}</p>
          <p className="text-[11px] text-[#738091] mt-1">Semester {stu.semester}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('events')}
          className="text-left bg-white border border-[#E5E9EF] hover:border-[#D99A32]/70 rounded-lg p-4 transition-colors"
        >
          <span className="text-xs text-[#738091]">Registered Events</span>
          <p className="font-display text-2xl font-semibold text-[#202B38] mt-1 tabular-nums">
            {data.myRegistrations.length}
          </p>
          <p className="text-[11px] text-[#738091] mt-1">Upcoming campus schedule</p>
        </button>
      </div>

      {/* Attendance & Marks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#202B38]">Subject-Wise Attendance</h2>
            <button type="button" onClick={() => onNavigate('attendance')} className="text-xs text-[#477BAA] hover:underline">
              Full History
            </button>
          </div>
          <div className="space-y-4">
            {attList.map((sub: any) => (
              <div key={sub.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[#202B38]">
                    {sub.code} — {sub.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#738091] tabular-nums">
                    {sub.attended_classes}/{sub.total_classes} classes
                  </span>
                </div>
                <ProgressBar value={sub.percentage ?? 0} threshold={data.threshold} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#202B38]">Academic Performance</h2>
            <button type="button" onClick={() => onNavigate('performance')} className="text-xs text-[#477BAA] hover:underline">
              Detailed Analysis
            </button>
          </div>
          <BarChart
            data={marksList.map((m: any) => ({ label: m.subject_code, value: m.total_marks }))}
            barColor="#172332"
            unit="%"
          />
        </div>
      </div>

      {/* Assignments, Events, Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#202B38] mb-3">Active Assignments</h2>
          <div className="divide-y divide-[#E5E9EF]">
            {data.assignments.map((a: any) => (
              <div key={a.id} className="py-2.5">
                <p className="text-xs font-medium text-[#202B38]">{a.title}</p>
                <p className="text-[11px] text-[#738091] font-mono mt-0.5">
                  {a.subject_code} · Due {a.due_date}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#202B38]">Upcoming Events</h2>
            <button type="button" onClick={() => onNavigate('events')} className="text-xs text-[#477BAA] hover:underline">
              Explore All
            </button>
          </div>
          <div className="divide-y divide-[#E5E9EF]">
            {data.upcomingEvents.slice(0, 4).map((ev: any) => (
              <div key={ev.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#202B38] truncate">{ev.title}</p>
                  <p className="text-[11px] text-[#738091] font-mono">{ev.event_date} · {ev.venue}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('events')}
                  className="text-xs text-[#D99A32] hover:underline shrink-0 inline-flex items-center gap-0.5"
                >
                  <span>View</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#202B38]">Announcements</h2>
            <button type="button" onClick={() => onNavigate('announcements')} className="text-xs text-[#477BAA] hover:underline">
              View All
            </button>
          </div>
          <div className="divide-y divide-[#E5E9EF]">
            {data.announcements.slice(0, 3).map((ann: any) => (
              <div key={ann.id} className="py-2.5">
                <div className="flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-[#D99A32] shrink-0" />
                  <p className="text-xs font-medium text-[#202B38] truncate">{ann.title}</p>
                </div>
                <p className="text-[11px] text-[#738091] mt-1 line-clamp-2">{ann.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
