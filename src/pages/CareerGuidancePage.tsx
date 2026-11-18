import React, { useState } from 'react';
import { Award, Briefcase, Compass, Sparkles } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';

interface CareerPath {
  title: string;
  fitSummary: string;
  roles: string[];
  skillGaps: string[];
  certifications: string[];
  roadmap: string[];
}

export function CareerGuidancePage() {
  const { showToast } = useToast();

  const [skills, setSkills] = useState('TypeScript, SQL, Python, Data Structures');
  const [interests, setInterests] = useState('Distributed backend systems, Applied Machine Learning');
  const [preferredSubjects, setPreferredSubjects] = useState('Database Management Systems, Algorithms');
  const [strengths, setStrengths] = useState('Analytical debugging, technical documentation, team leadership');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    advisoryNotice: string;
    careerPaths: CareerPath[];
    mode: 'live' | 'demo';
  } | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skills.trim() && !interests.trim()) {
      showToast('Please enter at least your skills or career interests.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/ai/career-guidance', {
        method: 'POST',
        body: JSON.stringify({ skills, interests, preferredSubjects, strengths }),
      });
      setResult(res);
    } catch (err: any) {
      showToast(err?.message || 'Unable to generate career guidance', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#202B38]">AI Career Guidance Studio</h1>
        <p className="text-xs text-[#738091] mt-1">
          Receive advisory career path suggestions, role alignments, skill gap analyses, and certification roadmaps.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleGenerate} className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-4 h-fit">
          <h2 className="text-sm font-semibold text-[#202B38]">Student Profile Inputs</h2>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Technical &amp; Core Skills *</label>
            <textarea
              rows={2}
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Java, Python, SQL, CAD, Financial Modeling"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Career Interests *</label>
            <textarea
              rows={2}
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g. Cloud Engineering, Product Management, AI Systems"
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Preferred Subjects</label>
            <input
              type="text"
              value={preferredSubjects}
              onChange={(e) => setPreferredSubjects(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#202B38] mb-1">Personal Strengths</label>
            <input
              type="text"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#E5E9EF] rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Analyzing Profile...' : 'Generate Career Roadmap'}</span>
          </button>
        </form>

        <div className="lg:col-span-2 space-y-4">
          {!result ? (
            <div className="bg-white border border-[#E5E9EF] rounded-lg p-12 text-center">
              <Compass className="w-8 h-8 text-[#D99A32] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#202B38]">Explore personalized career trajectories</p>
              <p className="text-xs text-[#738091] mt-1 max-w-md mx-auto">
                Enter your skills, coursework preferences, and strengths to generate structured advisory career paths and skill-gap action plans.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-[#E5E9EF] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#738091]">{result.advisoryNotice}</span>
                <span className="font-medium text-[#202B38]">
                  {result.mode === 'live' ? 'Live Gemini AI' : 'Demo Mode Guidance'}
                </span>
              </div>

              {result.careerPaths.map((cp, idx) => (
                <div key={idx} className="bg-white border border-[#E5E9EF] rounded-lg p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-mono font-semibold text-[#D99A32]">PATH 0{idx + 1}</span>
                      <h3 className="text-base font-semibold text-[#202B38] mt-0.5">{cp.title}</h3>
                      <p className="text-xs text-[#738091] mt-1 leading-relaxed">{cp.fitSummary}</p>
                    </div>
                    <Briefcase className="w-5 h-5 text-[#172332] shrink-0" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E5E9EF] text-xs">
                    <div>
                      <p className="font-semibold text-[#202B38] mb-1.5">Recommended Job Roles</p>
                      <ul className="space-y-1 text-[#738091]">
                        {cp.roles.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-[#202B38] mb-1.5">Skill Gap Focus Areas</p>
                      <ul className="space-y-1 text-[#738091]">
                        {cp.skillGaps.map((g, i) => (
                          <li key={i}>• {g}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-[#202B38] mb-1.5 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#D99A32]" />
                        <span>Suggested Certifications</span>
                      </p>
                      <ul className="space-y-1 text-[#738091]">
                        {cp.certifications.map((c, i) => (
                          <li key={i}>• {c}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-[#202B38] mb-1.5">Improvement Roadmap</p>
                      <ol className="space-y-1 text-[#738091]">
                        {cp.roadmap.map((step, i) => (
                          <li key={i}>
                            <span className="font-mono text-[#202B38] mr-1">{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
