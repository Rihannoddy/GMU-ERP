import React, { useEffect, useState } from 'react';
import { Bookmark, Copy, Printer, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';

const CONTENT_TYPES = [
  'Assignment',
  'Announcement',
  'Quiz',
  'Academic Report',
  'Event Description',
  'Department Notice',
  'Administrative Report',
];

export function ContentGeneratorPage() {
  const { showToast } = useToast();

  const [contentType, setContentType] = useState('Assignment');
  const [title, setTitle] = useState('Relational Query Optimization & Indexing Practicum');
  const [subject, setSubject] = useState('CS501 — Database Management Systems');
  const [audience, setAudience] = useState('Semester 5 CSE Students');
  const [tone, setTone] = useState('Formal Academic');
  const [keyPoints, setKeyPoints] = useState(
    'Design B+ tree index simulator, measure query I/O latency, submit Git repository and PDF report by Dec 5.'
  );

  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'live' | 'demo' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savedItems, setSavedItems] = useState<any[]>([]);

  const loadSaved = async () => {
    try {
      const res = await apiFetch<{ items: any[] }>('/ai/saved');
      setSavedItems(res.items.filter((x) => x.tool_type === 'content_gen'));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      showToast('Please provide a document title.', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch<{ content: string; mode: 'live' | 'demo'; errorNote?: string }>('/ai/content-gen', {
        method: 'POST',
        body: JSON.stringify({ contentType, title, subject, audience, tone, keyPoints }),
      });
      setOutput(res.content);
      setMode(res.mode);
      setEditing(false);
      if (res.errorNote) showToast('Generated in Demo Mode', 'warning', res.errorNote);
    } catch (err: any) {
      showToast(err?.message || 'Unable to generate content', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!output) return;
    await apiFetch('/ai/saved', {
      method: 'POST',
      body: JSON.stringify({
        tool_type: 'content_gen',
        title: `[${contentType}] ${title}`,
        subject,
        topic: audience,
        content: output,
        model_mode: mode || 'demo',
      }),
    });
    showToast('Saved to Content Archive', 'success');
    loadSaved();
  };

  const handleDeleteSaved = async (id: number) => {
    await apiFetch(`/ai/saved/${id}`, { method: 'DELETE' });
    loadSaved();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#202B38]">AI Content Generation Workspace</h1>
        <p className="text-xs text-[#738091] mt-1">
          Draft assignments, official notices, quizzes, event briefs, and institutional reports for faculty and administration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-5">
          <form onSubmit={handleGenerate} className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#202B38]">Document Brief</h2>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
              >
                {CONTENT_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Title / Subject Matter *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Course / Department</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Target Audience</label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E9EF] rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Register / Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E9EF] rounded-md bg-white"
                >
                  <option value="Formal Academic">Formal Academic</option>
                  <option value="Executive Administrative">Executive Administrative</option>
                  <option value="Encouraging & Engaging">Encouraging &amp; Engaging</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Key Requirements &amp; Dates</label>
              <textarea
                rows={3}
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? 'Drafting...' : 'Generate Draft'}</span>
            </button>
          </form>

          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[#202B38] mb-3">Saved Content Archive</h3>
            {savedItems.length === 0 ? (
              <p className="text-xs text-[#738091]">No saved drafts yet.</p>
            ) : (
              <div className="divide-y divide-[#E5E9EF]">
                {savedItems.map((it) => (
                  <div key={it.id} className="py-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOutput(it.content);
                        setMode(it.model_mode);
                      }}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-xs font-medium text-[#202B38] truncate hover:text-[#D99A32]">{it.title}</p>
                      <p className="text-[11px] text-[#738091] truncate">{it.subject}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSaved(it.id)}
                      className="p-1 text-[#738091] hover:text-[#D9534F]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-[#E5E9EF] rounded-lg flex flex-col min-h-[520px]">
          <div className="px-5 py-3.5 border-b border-[#E5E9EF] flex flex-wrap items-center justify-between gap-2 no-print">
            <div>
              <h2 className="text-sm font-semibold text-[#202B38]">Generated Document Workspace</h2>
              {mode && (
                <p className="text-[11px] text-[#738091]">
                  Source: {mode === 'live' ? 'Live Gemini AI' : 'Demo Mode'} · Review before publishing
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={!output}
                onClick={() => setEditing((v) => !v)}
                className="px-2.5 py-1.5 text-xs font-medium border border-[#E5E9EF] rounded hover:bg-[#F5F6F8] disabled:opacity-40"
              >
                {editing ? 'Preview' : 'Edit'}
              </button>
              <button
                type="button"
                disabled={!output}
                onClick={async () => {
                  await navigator.clipboard.writeText(output);
                  showToast('Copied to clipboard', 'success');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[#E5E9EF] rounded hover:bg-[#F5F6F8] disabled:opacity-40"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
              <button
                type="button"
                disabled={!output || generating}
                onClick={() => handleGenerate()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[#E5E9EF] rounded hover:bg-[#F5F6F8] disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
              <button
                type="button"
                disabled={!output}
                onClick={handleSave}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[#E5E9EF] rounded hover:bg-[#F5F6F8] disabled:opacity-40"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                type="button"
                disabled={!output}
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#172332] text-white rounded hover:bg-[#202B38] disabled:opacity-40"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export / Print</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-6">
            {!output ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <Sparkles className="w-8 h-8 text-[#D99A32] mb-3" />
                <p className="text-sm font-medium text-[#202B38]">Configure a document brief to start drafting</p>
              </div>
            ) : editing ? (
              <textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                className="w-full h-[440px] p-4 text-sm font-mono bg-[#F5F6F8] border border-[#E5E9EF] rounded-md"
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm text-[#202B38] leading-relaxed">{output}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
