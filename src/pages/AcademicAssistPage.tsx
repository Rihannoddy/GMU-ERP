import React, { useEffect, useState } from 'react';
import { Bookmark, Copy, Printer, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';
import { Subject } from '../types/erp';

export function AcademicAssistPage() {
  const { showToast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState('Database Management Systems');
  const [topic, setTopic] = useState('B+ Tree Indexing & Query Optimization');
  const [semester, setSemester] = useState('5');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [questionCount, setQuestionCount] = useState('5');
  const [contentType, setContentType] = useState('Study Notes');

  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'live' | 'demo' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);

  const [savedItems, setSavedItems] = useState<any[]>([]);

  const loadSaved = async () => {
    try {
      const [acad, saved] = await Promise.all([
        apiFetch<{ subjects: Subject[] }>('/academics/overview'),
        apiFetch<{ items: any[] }>('/ai/saved'),
      ]);
      setSubjects(acad.subjects);
      setSavedItems(saved.items.filter((x) => x.tool_type === 'academic'));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!subject.trim() || !topic.trim()) {
      showToast('Please enter both subject and topic.', 'warning');
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch<{ content: string; mode: 'live' | 'demo'; errorNote?: string }>('/ai/academic-assist', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          topic,
          semester,
          difficulty,
          questionCount: Number(questionCount),
          contentType,
        }),
      });
      setOutput(res.content);
      setMode(res.mode);
      setEditing(false);
      if (res.errorNote) showToast('Generated in Demo Mode', 'warning', res.errorNote);
    } catch (err: any) {
      showToast(err?.message || 'Failed to generate academic material', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    showToast('Copied to clipboard', 'success');
  };

  const handleSave = async () => {
    if (!output) return;
    try {
      await apiFetch('/ai/saved', {
        method: 'POST',
        body: JSON.stringify({
          tool_type: 'academic',
          title: `${contentType}: ${topic}`,
          subject,
          topic,
          content: output,
          model_mode: mode || 'demo',
        }),
      });
      showToast('Saved to your Study Library', 'success');
      loadSaved();
    } catch (err: any) {
      showToast(err?.message || 'Unable to save content', 'error');
    }
  };

  const handleDeleteSaved = async (id: number) => {
    await apiFetch(`/ai/saved/${id}`, { method: 'DELETE' });
    loadSaved();
    showToast('Removed saved item', 'info');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#202B38]">AI Academic Assistance Workspace</h1>
        <p className="text-xs text-[#738091] mt-1">
          Generate structured study notes, summaries, multiple-choice quizzes, practice questions, and topic explanations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Configurator */}
        <div className="space-y-5">
          <form onSubmit={handleGenerate} className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#202B38]">Material Parameters</h2>

            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md bg-white"
              >
                <option value="Study Notes">Study Notes</option>
                <option value="Topic Summary">Topic Summary</option>
                <option value="Multiple-Choice Quiz">Multiple-Choice Quiz</option>
                <option value="Practice Questions">Practice Questions</option>
                <option value="Descriptive Questions">Descriptive Questions</option>
                <option value="Topic Explanation">Detailed Topic Explanation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Subject *</label>
              <input
                list="academic-subjects-list"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
              <datalist id="academic-subjects-list">
                {subjects.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#202B38] mb-1">Topic *</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Dynamic Programming, AVL Trees"
                className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-[#E5E9EF] rounded-md bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      Sem {n}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-[#E5E9EF] rounded-md bg-white"
                >
                  <option value="Foundational">Foundational</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#202B38] mb-1">Questions</label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-[#E5E9EF] rounded-md font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? 'Generating...' : 'Generate Study Material'}</span>
            </button>
          </form>

          {/* Saved Library */}
          <div className="bg-white border border-[#E5E9EF] rounded-lg p-5">
            <h3 className="text-sm font-semibold text-[#202B38] mb-3">Saved Study Library</h3>
            {savedItems.length === 0 ? (
              <p className="text-xs text-[#738091]">No saved study documents yet.</p>
            ) : (
              <div className="divide-y divide-[#E5E9EF]">
                {savedItems.map((it) => (
                  <div key={it.id} className="py-2.5 flex items-center justify-between gap-2">
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
                      aria-label="Delete saved document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Document Preview & Editor */}
        <div className="lg:col-span-2 bg-white border border-[#E5E9EF] rounded-lg flex flex-col min-h-[520px]">
          <div className="px-5 py-3.5 border-b border-[#E5E9EF] flex flex-wrap items-center justify-between gap-2 no-print">
            <div>
              <h2 className="text-sm font-semibold text-[#202B38]">Document Preview</h2>
              {mode && (
                <p className="text-[11px] text-[#738091]">
                  Generated via {mode === 'live' ? 'Live Gemini AI' : 'Demo Mode'} · Verify against course syllabus
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
                onClick={handleCopy}
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
                <span>Print / PDF</span>
              </button>
            </div>
          </div>

          <div className="flex-1 p-6">
            {!output ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <Sparkles className="w-8 h-8 text-[#D99A32] mb-3" />
                <p className="text-sm font-medium text-[#202B38]">Ready to prepare academic study content</p>
                <p className="text-xs text-[#738091] mt-1 max-w-sm">
                  Configure your subject, topic, difficulty, and output format on the left, then click Generate.
                </p>
              </div>
            ) : editing ? (
              <textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                className="w-full h-[440px] p-4 text-sm font-mono bg-[#F5F6F8] border border-[#E5E9EF] rounded-md focus:outline-none focus:border-[#D99A32]"
              />
            ) : (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-[#202B38] leading-relaxed">
                {output}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
