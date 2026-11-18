import React, { useEffect, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Department, FeedbackItem } from '../types/erp';
import { BarChart, DonutChart } from '../components/ui/Charts';
import { Modal } from '../components/ui/Modal';
import { StatusText } from '../components/ui/StatusText';

export function FeedbackPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.role === 'admin';

  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [distribution, setDistribution] = useState<Array<{ sentiment: string; count: number }>>([]);
  const [byDept, setByDept] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    department_id: '',
    category: 'Academic Teaching',
    subject_name: '',
    rating: '4',
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [aiSummary, setAiSummary] = useState<{ summary: string; recommendations: string[]; mode: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (deptFilter) qs.set('departmentId', deptFilter);
      if (sentimentFilter) qs.set('sentiment', sentimentFilter);

      const [fbRes, acadRes] = await Promise.all([
        apiFetch<{ feedback: FeedbackItem[]; distribution: any[]; byDept: any[] }>(`/feedback?${qs.toString()}`),
        apiFetch<{ departments: Department[] }>('/academics/overview'),
      ]);
      setFeedback(fbRes.feedback);
      setDistribution(fbRes.distribution);
      setByDept(fbRes.byDept);
      setDepartments(acadRes.departments);
      if (!form.department_id && acadRes.departments.length > 0) {
        setForm((prev) => ({ ...prev, department_id: String(acadRes.departments[0].id) }));
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load feedback', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deptFilter, sentimentFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.comment.trim().length < 10) {
      showToast('Please enter at least 10 characters in your feedback comment.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/feedback', { method: 'POST', body: JSON.stringify(form) });
      showToast('Feedback submitted', 'success', 'Thank you for helping improve campus services.');
      setModalOpen(false);
      setForm({ ...form, subject_name: '', comment: '', rating: '4' });
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Unable to submit feedback', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiFetch(`/feedback/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showToast('Feedback status updated', 'success');
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Unable to update status', 'error');
    }
  };

  const runAiSummary = async () => {
    setAiLoading(true);
    try {
      const res = await apiFetch('/ai/insights/feedback', { method: 'POST' });
      setAiSummary(res);
    } catch (err: any) {
      showToast(err?.message || 'Unable to analyze feedback', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const distMap: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
  distribution.forEach((d) => {
    distMap[d.sentiment] = d.count;
  });

  // Extract topic frequencies
  const topicCounts: Record<string, number> = {};
  feedback.forEach((f) => {
    (f.topics || []).forEach((t) => {
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    });
  });
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Feedback &amp; AI Sentiment Analysis</h1>
          <p className="text-xs text-[#738091] mt-1">
            Collect campus feedback, review sentiment trends, and address recurring infrastructure or academic issues.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role !== 'student' && (
            <button
              type="button"
              onClick={runAiSummary}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D99A32]" />
              <span>{aiLoading ? 'Analyzing...' : 'Generate AI Sentiment Summary'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Feedback</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#202B38]">Sentiment Distribution</h2>
          <p className="text-xs text-[#738091] mb-4">Automated classification (advisory indicator)</p>
          <DonutChart
            segments={[
              { label: 'Positive', value: distMap.positive, color: '#26865B' },
              { label: 'Neutral', value: distMap.neutral, color: '#D99A32' },
              { label: 'Negative', value: distMap.negative, color: '#D9534F' },
            ]}
          />
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#202B38]">Department Feedback Volume</h2>
          <p className="text-xs text-[#738091] mb-4">Total submissions across departments</p>
          <BarChart
            data={byDept.map((d) => ({
              label: d.dept_code,
              value: (d.positive || 0) + (d.neutral || 0) + (d.negative || 0),
            }))}
            barColor="#172332"
          />
        </div>

        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#202B38]">Frequently Mentioned Topics</h2>
          <p className="text-xs text-[#738091] mb-3">Extracted themes across submissions</p>
          <div className="divide-y divide-[#E5E9EF]">
            {topTopics.length === 0 ? (
              <p className="py-6 text-xs text-[#738091]">No topics extracted yet.</p>
            ) : (
              topTopics.map(([topic, count]) => (
                <div key={topic} className="py-2 flex items-center justify-between text-xs">
                  <span className="text-[#202B38] font-medium">{topic}</span>
                  <span className="font-mono tabular-nums text-[#738091]">{count} mentions</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Sentiment Summary Box */}
      {aiSummary && (
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D99A32]" />
              <h2 className="text-sm font-semibold text-[#202B38]">AI-Generated Feedback Synthesis</h2>
            </div>
            <span className="text-[11px] text-[#738091]">
              {aiSummary.mode === 'live' ? 'Live Gemini AI' : 'Demo Mode'} · Classifications are advisory, not definitive facts
            </span>
          </div>
          <p className="text-xs text-[#202B38] leading-relaxed">{aiSummary.summary}</p>
          <ul className="space-y-1 text-xs text-[#738091] pt-2 border-t border-[#E5E9EF]">
            {aiSummary.recommendations.map((r, i) => (
              <li key={i}>
                <span className="font-mono text-[#D99A32] mr-1.5">0{i + 1}.</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback Table */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E9EF] flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#202B38]">
            {user?.role === 'student' ? 'My Submitted Feedback' : 'Institutional Feedback Repository'}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code}
                </option>
              ))}
            </select>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-[#F5F6F8] rounded animate-pulse" />
            ))}
          </div>
        ) : feedback.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#738091]">No feedback records match these filters.</div>
        ) : (
          <div className="divide-y divide-[#E5E9EF]">
            {feedback.map((fb) => (
              <div key={fb.id} className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#202B38]">{fb.category}</span>
                    <span className="text-[#738091]">·</span>
                    <span className="text-[#738091]">{fb.dept_code || 'General'}</span>
                    {fb.subject_name && (
                      <>
                        <span className="text-[#738091]">·</span>
                        <span className="text-[#738091]">{fb.subject_name}</span>
                      </>
                    )}
                    <span className="text-[#738091]">·</span>
                    <span className="font-mono text-[#202B38]">{fb.rating}/5</span>
                    <span className="text-[#738091]">·</span>
                    <StatusText
                      label={`${fb.sentiment} (est.)`}
                      tone={fb.sentiment === 'positive' ? 'success' : fb.sentiment === 'negative' ? 'danger' : 'warning'}
                    />
                  </div>
                  <p className="text-sm text-[#202B38] leading-relaxed">{fb.comment}</p>
                  <p className="text-[11px] text-[#738091]">
                    Topics: {(fb.topics || []).join(', ')} · {fb.created_at.slice(0, 10)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin ? (
                    <select
                      value={fb.status}
                      onChange={(e) => updateStatus(fb.id, e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md capitalize"
                    >
                      <option value="open">Open</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  ) : (
                    <StatusText
                      label={fb.status}
                      tone={fb.status === 'resolved' ? 'success' : fb.status === 'reviewed' ? 'info' : 'warning'}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Campus Feedback">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
              >
                <option value="Academic Teaching">Academic Teaching</option>
                <option value="Laboratory Facilities">Laboratory Facilities</option>
                <option value="Timetable & Scheduling">Timetable &amp; Scheduling</option>
                <option value="Campus Wi-Fi & IT">Campus Wi-Fi &amp; IT</option>
                <option value="Events & Workshops">Events &amp; Workshops</option>
                <option value="Library Services">Library Services</option>
              </select>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Subject / Facility Name</label>
              <input
                type="text"
                value={form.subject_name}
                onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
                placeholder="Optional (e.g. CS501 or Library)"
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Rating (1–5)</label>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
              >
                <option value="5">5 — Excellent</option>
                <option value="4">4 — Good</option>
                <option value="3">3 — Satisfactory</option>
                <option value="2">2 — Needs Improvement</option>
                <option value="1">1 — Critical Issue</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Feedback Details *</label>
            <textarea
              required
              rows={4}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Describe what worked well or what needs attention..."
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
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
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
