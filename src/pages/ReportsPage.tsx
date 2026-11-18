import React, { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Department } from '../types/erp';

const REPORT_TYPES = [
  { id: 'students', label: 'Student Reports' },
  { id: 'faculty', label: 'Faculty Reports' },
  { id: 'attendance', label: 'Attendance Reports' },
  { id: 'performance', label: 'Academic Performance' },
  { id: 'events', label: 'Event Reports' },
  { id: 'feedback', label: 'Feedback Reports' },
  { id: 'resources', label: 'Resource Utilisation' },
];

export function ReportsPage() {
  const { showToast } = useToast();

  const [reportType, setReportType] = useState('students');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [semester, setSemester] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ departments: Department[] }>('/academics/overview')
      .then((res) => setDepartments(res.departments))
      .catch(() => {});
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (departmentId) qs.set('departmentId', departmentId);
      if (semester) qs.set('semester', semester);
      const res = await apiFetch<{ rows: any[] }>(`/reports/${reportType}?${qs.toString()}`);
      setRows(res.rows);
    } catch (err: any) {
      showToast(err?.message || 'Unable to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, departmentId, semester]);

  const exportCsv = () => {
    if (rows.length === 0) {
      showToast('No rows available to export.', 'warning');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = String(r[h] ?? '').replace(/"/g, '""');
            return `"${val}"`;
          })
          .join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmu_erp_${reportType}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported', 'success', `${rows.length} rows downloaded`);
  };

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="hidden print:flex items-center gap-4 pb-4 mb-4 border-b border-[#E5E9EF]">
        <img
          src="/assets/aistudio/gmu-logo_77c534fb.png"
          alt="GM University Logo"
          className="w-12 h-12 rounded-md object-cover bg-[#541B1E]"
        />
        <div>
          <p className="font-display text-lg font-bold text-[#202B38]">GMU ERP Management</p>
          <p className="text-xs text-[#738091]">
            GM University · Innovating Minds — {REPORT_TYPES.find((r) => r.id === reportType)?.label}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Reports &amp; Institutional Analytics</h1>
          <p className="text-xs text-[#738091] mt-1">
            Generate filtered university datasets, export to CSV, or print formatted administrative summaries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Selector & Filters */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              type="button"
              onClick={() => setReportType(rt.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                reportType === rt.id ? 'bg-[#172332] text-white' : 'bg-[#F5F6F8] text-[#738091] hover:text-[#202B38]'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
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
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="px-3 py-1.5 text-xs bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg px-5 py-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#202B38]">
          {REPORT_TYPES.find((r) => r.id === reportType)?.label}
        </span>
        <span className="font-mono tabular-nums text-[#738091]">{rows.length} total records</span>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-[#E5E9EF] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 bg-[#F5F6F8] rounded animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#738091]">No data matching the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F6F8] border-b border-[#E5E9EF] text-xs font-semibold text-[#738091]">
                  {columns.map((c) => (
                    <th key={c} className="px-4 py-2.5 whitespace-nowrap capitalize">
                      {c.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9EF] text-xs">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-[#F5F6F8]/60">
                    {columns.map((c) => (
                      <td key={c} className="px-4 py-2.5 text-[#202B38] tabular-nums max-w-xs truncate">
                        {String(r[c] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
