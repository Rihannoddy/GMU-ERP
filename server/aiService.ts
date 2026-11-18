import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export interface AiStatus {
  liveAvailable: boolean;
  model: string;
  provider: string;
}

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function getAiStatus(): AiStatus {
  const client = getClient();
  return {
    liveAvailable: Boolean(client),
    model: 'gemini-4-hydrogen',
    provider: client ? 'Live Gemini AI' : 'Demo Mode (Simulated)',
  };
}

async function runLiveGemini(systemInstruction: string, prompt: string): Promise<{ text: string; mode: 'live'; model: string }> {
  const ai = getClient();
  if (!ai) {
    throw new Error('NO_API_KEY');
  }
  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });
  const text = (response.text ?? '').trim();
  if (!text) {
    throw new Error('EMPTY_AI_RESPONSE');
  }
  return { text, mode: 'live', model: 'gemini-4-hydrogen' };
}

export async function generateCampusChatResponse(params: {
  role: string;
  userName: string;
  contextSummary: string;
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<{ reply: string; mode: 'live' | 'demo'; model: string; errorNote?: string }> {
  const systemInstruction = `You are "Campus AI Assistant", the official intelligent assistant inside GMU ERP Management for GM University (Innovating Minds).
Current User: ${params.userName} (Role: ${params.role.toUpperCase()}).
Verified Institutional Context for this User:
${params.contextSummary}

Guidelines:
- Answer concisely, clearly, and professionally in structured plain text / markdown bullets.
- Ground answers strictly in the verified institutional context above whenever citing personal attendance, marks, events, courses, or campus counts.
- Tailor advice to the user's role (${params.role}). Never reveal private records of other students to a student user.
- Keep responses practical and focused on university academics, administration, examinations, admissions, events, and campus operations.`;

  const historyText = params.history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');
  const fullPrompt = historyText ? `${historyText}\nUser: ${params.message}` : params.message;

  const ai = getClient();
  if (ai) {
    try {
      const res = await runLiveGemini(systemInstruction, fullPrompt);
      return { reply: res.text, mode: 'live', model: res.model };
    } catch (err: any) {
      const msg = err?.message || 'Live AI service temporarily unavailable';
      return {
        reply: buildDemoChatReply(params.role, params.userName, params.contextSummary, params.message),
        mode: 'demo',
        model: 'demo-deterministic',
        errorNote: `Live AI request failed (${msg}). Showing clearly labeled Demo Mode guidance.`,
      };
    }
  }

  return {
    reply: buildDemoChatReply(params.role, params.userName, params.contextSummary, params.message),
    mode: 'demo',
    model: 'demo-deterministic',
  };
}

function buildDemoChatReply(role: string, userName: string, contextSummary: string, message: string): string {
  const q = message.toLowerCase();
  if (q.includes('attendance')) {
    return `[Demo Mode Response — Live AI key not configured]\n\nHello ${userName}, here is your verified attendance summary from the campus database:\n\n${contextSummary}\n\nGuidance:\n- The institutional attendance benchmark is currently 75%.\n- If any subject dips near the threshold, schedule an office-hours check-in with the course coordinator early.`;
  }
  if (q.includes('event') || q.includes('register')) {
    return `[Demo Mode Response — Live AI key not configured]\n\nUpcoming Campus Events & Registration Guide:\n\n${contextSummary}\n\nHow to register:\n1. Open **Campus Operations → Events** from the left sidebar.\n2. Select any upcoming event with open seats.\n3. Click **Register Event** to lock your seat (duplicate or over-capacity registrations are automatically prevented).`;
  }
  if (q.includes('performance') || q.includes('marks') || q.includes('grade') || q.includes('academic')) {
    return `[Demo Mode Response — Live AI key not configured]\n\nAcademic Performance Summary for ${userName} (${role}):\n\n${contextSummary}\n\nRecommended Focus:\n- Review Internal Assessment 1 & 2 gaps against upcoming final exams.\n- Use **AI Intelligence → Academic Assistance** to generate targeted practice quizzes for lower-scoring topics.`;
  }
  if (q.includes('course') || q.includes('subject') || q.includes('department') || q.includes('admission')) {
    return `[Demo Mode Response — Live AI key not configured]\n\nGM University Academic Programs:\n- **B.Tech CSE** (160 Credits, 8 Semesters) — Turing Academic Block\n- **B.Tech Data Science & AI** (160 Credits, 8 Semesters) — Shannon Innovation Wing\n- **B.Tech ECE** (160 Credits, 8 Semesters) — Maxwell Engineering Hall\n- **B.Tech Mechanical Engineering** (160 Credits, 8 Semesters) — Babbage Workshop Complex\n- **MBA Business Analytics** (96 Credits, 4 Semesters) — Keynes Executive Center\n\nLive Snapshot:\n${contextSummary}`;
  }
  return `[Demo Mode Response — Live AI key not configured]\n\nHello ${userName} (${role}). Here is your live campus context:\n\n${contextSummary}\n\nI can help you with:\n- Attendance thresholds & subject breakdown\n- Marks, grades & academic improvement plans\n- Upcoming campus events & registration steps\n- Available courses, departments & classroom resources`;
}

export async function generateAcademicAssistance(params: {
  subject: string;
  topic: string;
  semester: string;
  difficulty: string;
  questionCount: number;
  contentType: string;
}): Promise<{ content: string; mode: 'live' | 'demo'; model: string; errorNote?: string }> {
  const systemInstruction = `You are an expert university professor preparing structured academic study material. Output clean, well-formatted Markdown with clear headings, bullet points, examples, and answer keys where quizzes/questions are requested.`;
  const prompt = `Generate ${params.contentType} for:
- Subject: ${params.subject}
- Topic: ${params.topic}
- Semester: ${params.semester}
- Difficulty: ${params.difficulty}
- Number of Questions (if applicable): ${params.questionCount}

Ensure rigor appropriate for an accredited university engineering/management degree.`;

  const ai = getClient();
  if (ai) {
    try {
      const res = await runLiveGemini(systemInstruction, prompt);
      return { content: res.text, mode: 'live', model: res.model };
    } catch (err: any) {
      return {
        content: buildDemoAcademicMaterial(params),
        mode: 'demo',
        model: 'demo-deterministic',
        errorNote: `Live AI unavailable (${err?.message || 'error'}). Showing Demo Mode study material.`,
      };
    }
  }
  return { content: buildDemoAcademicMaterial(params), mode: 'demo', model: 'demo-deterministic' };
}

function buildDemoAcademicMaterial(p: {
  subject: string;
  topic: string;
  semester: string;
  difficulty: string;
  questionCount: number;
  contentType: string;
}): string {
  const n = Math.min(Math.max(p.questionCount || 5, 1), 10);
  if (p.contentType.toLowerCase().includes('mcq') || p.contentType.toLowerCase().includes('quiz')) {
    const qs = Array.from({ length: n }, (_, i) => {
      return `### Question ${i + 1} (${p.difficulty})\nWhich core principle best governs **${p.topic}** in **${p.subject}** (Scenario ${i + 1})?\n- A) Structural invariant preservation and bounded complexity\n- B) Unbounded sequential polling without indexing\n- C) Static memory duplication across every node\n- D) Bypassing consistency verification checks\n\n**Answer:** A — Preserving structural invariants ensures predictable performance and correctness under ${p.difficulty.toLowerCase()} workloads.`;
    }).join('\n\n');
    return `# ${p.subject}: ${p.topic} — ${p.contentType}\n*Semester ${p.semester} · Difficulty: ${p.difficulty} · [Demo Mode Output]*\n\n${qs}`;
  }

  return `# ${p.subject}: ${p.topic} (${p.contentType})\n*Semester ${p.semester} · Difficulty: ${p.difficulty} · [Demo Mode Output]*\n\n## 1. Core Concepts & Definitions\n**${p.topic}** is a foundational pillar of **${p.subject}**. At the ${p.difficulty.toLowerCase()} level, students should focus on how theoretical guarantees translate into real-world system trade-offs.\n\n- **Primary Mechanism:** Separates logical specification from physical execution for modular optimization.\n- **Complexity & Performance:** Balances time/space overhead against reliability and throughput.\n- **Common Pitfall:** Overlooking edge-case boundary conditions during peak concurrency or scale.\n\n## 2. Worked Example\n1. **Formulate the problem** by identifying inputs, invariants, and target constraints.\n2. **Select the optimal strategy** based on workload frequency (read-heavy vs write-heavy).\n3. **Verify correctness** by tracing state transitions step by step.\n\n## 3. Practice Prompts (${n} Questions)\n${Array.from({ length: n }, (_, i) => `${i + 1}. Explain how **${p.topic}** handles failure or edge scenario #${i + 1} in **${p.subject}**.`).join('\n')}`;
}

export async function generateUnifiedContent(params: {
  contentType: string;
  title: string;
  subject: string;
  audience: string;
  tone: string;
  keyPoints: string;
}): Promise<{ content: string; mode: 'live' | 'demo'; model: string; errorNote?: string }> {
  const systemInstruction = `You are an administrative & academic writer for GM University's GMU ERP Management portal. Draft crisp, publication-ready documents in clean Markdown.`;
  const prompt = `Draft a ${params.contentType}:
- Title/Topic: ${params.title}
- Department/Subject: ${params.subject}
- Target Audience: ${params.audience}
- Tone: ${params.tone}
- Key Details: ${params.keyPoints || 'Standard university academic rigor and clear timelines.'}`;

  const ai = getClient();
  if (ai) {
    try {
      const res = await runLiveGemini(systemInstruction, prompt);
      return { content: res.text, mode: 'live', model: res.model };
    } catch (err: any) {
      return {
        content: buildDemoUnifiedContent(params),
        mode: 'demo',
        model: 'demo-deterministic',
        errorNote: `Live AI unavailable (${err?.message || 'error'}). Showing Demo Mode draft.`,
      };
    }
  }
  return { content: buildDemoUnifiedContent(params), mode: 'demo', model: 'demo-deterministic' };
}

function buildDemoUnifiedContent(p: {
  contentType: string;
  title: string;
  subject: string;
  audience: string;
  tone: string;
  keyPoints: string;
}): string {
  return `# ${p.title || p.contentType}\n**Document Type:** ${p.contentType} · **Unit/Subject:** ${p.subject || 'University Administration'} · **Audience:** ${p.audience} · *[Demo Mode Draft]*\n\n## Overview\nThis ${p.contentType.toLowerCase()} addresses **${p.title}** for **${p.audience}** in a ${p.tone.toLowerCase()} academic register.\n\n## Key Directives & Details\n- **Scope:** ${p.keyPoints || 'Complete coverage of scheduled milestones, assessment rubrics, and compliance guidelines.'}\n- **Timeline & Expectations:** All participants should review requirements ahead of the published milestone date and direct clarifications to the coordinator.\n- **Deliverables / Action Items:**\n  1. Review the attached rubric or event brief.\n  2. Confirm submission or attendance status inside GMU ERP Management.\n  3. Escalate scheduling conflicts at least 48 hours in advance.\n\n*Issued via GMU ERP Management Content Workspace.*`;
}

export async function generateCareerGuidanceAI(params: {
  studentName: string;
  department: string;
  semester: number;
  skills: string;
  interests: string;
  preferredSubjects: string;
  strengths: string;
}): Promise<{
  advisoryNotice: string;
  careerPaths: Array<{
    title: string;
    fitSummary: string;
    roles: string[];
    skillGaps: string[];
    certifications: string[];
    roadmap: string[];
  }>;
  mode: 'live' | 'demo';
  model: string;
}> {
  const advisoryNotice =
    'Advisory Note: These AI-assisted recommendations are guidance based on your stated skills and academic profile, not guaranteed placement outcomes.';
  const ai = getClient();
  if (ai) {
    try {
      const prompt = `Return strictly valid JSON (no markdown fences) with key "careerPaths" containing an array of 3 career recommendation objects for this student:
Student: ${params.studentName}, Dept: ${params.department}, Semester: ${params.semester}
Skills: ${params.skills}
Interests: ${params.interests}
Preferred Subjects: ${params.preferredSubjects}
Strengths: ${params.strengths}

Each object must have keys: "title" (string), "fitSummary" (string), "roles" (string[] of 3 job titles), "skillGaps" (string[] of 3 gaps), "certifications" (string[] of 2 certifications), "roadmap" (string[] of 3 actionable steps).`;
      const res = await runLiveGemini(
        'You are a university career advisor returning concise, realistic career paths as JSON.',
        prompt
      );
      const cleaned = res.text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed.careerPaths) && parsed.careerPaths.length > 0) {
        return { advisoryNotice, careerPaths: parsed.careerPaths, mode: 'live', model: res.model };
      }
    } catch {
      // Fallback to structured demo below
    }
  }

  return {
    advisoryNotice,
    mode: 'demo',
    model: 'demo-deterministic',
    careerPaths: [
      {
        title: 'Distributed Systems & Cloud Backend Engineer',
        fitSummary: `Aligns strongly with ${params.preferredSubjects || 'core systems coursework'} and analytical problem-solving in ${params.department}.`,
        roles: ['Backend Software Engineer', 'Site Reliability Engineer', 'Platform Infrastructure Developer'],
        skillGaps: ['Kubernetes observability & tracing', 'Distributed consensus protocols', 'Production CI/CD security'],
        certifications: ['AWS Certified Solutions Architect – Associate', 'CKAD (Certified Kubernetes Application Developer)'],
        roadmap: [
          'Build a fault-tolerant microservice project with Prometheus metrics over the next 6 weeks.',
          'Complete 2 system design mock interviews focusing on caching and sharding.',
          'Apply to summer engineering internships through the University Placement Cell.',
        ],
      },
      {
        title: 'Applied Machine Learning & Data Engineer',
        fitSummary: `Leverages your foundation in ${params.skills || 'programming and data modeling'} toward production AI pipelines.`,
        roles: ['ML Systems Engineer', 'Data Pipeline Engineer', 'Applied AI Associate'],
        skillGaps: ['Feature store orchestration', 'Model latency benchmarking', 'Evaluation harness design'],
        certifications: ['Google Cloud Associate Data Practitioner', 'DeepLearning.AI Machine Learning Specialization'],
        roadmap: [
          'Publish an end-to-end dataset pipeline + evaluation notebook on GitHub.',
          'Take an elective or workshop on Applied NLP or Vector Search.',
          'Present a capstone poster at the Annual AI & Systems Research Symposium.',
        ],
      },
      {
        title: 'Technical Product & Solutions Architect',
        fitSummary: `Combines technical fluency (${params.strengths || 'structured communication'}) with cross-functional system design.`,
        roles: ['Solutions Engineer', 'Associate Technical Product Manager', 'Enterprise Systems Consultant'],
        skillGaps: ['Enterprise ROI modeling', 'API integration prototyping', 'Stakeholder requirement specs'],
        certifications: ['Pragmatic Institute Product Foundations', 'TOGAF Foundation'],
        roadmap: [
          'Lead requirements scoping for your semester capstone team.',
          'Write 3 technical RFCs translating business needs into architecture diagrams.',
          'Participate in the GMU Winter Hackathon as team lead.',
        ],
      },
    ],
  };
}

export async function analyzeDatasetInsightsAI(params: {
  domain: 'attendance' | 'performance' | 'feedback' | 'institutional';
  summaryPayload: string;
}): Promise<{ summary: string; recommendations: string[]; mode: 'live' | 'demo'; model: string }> {
  const ai = getClient();
  if (ai) {
    try {
      const prompt = `Analyze this university ${params.domain} dataset and return strictly valid JSON (no markdown fences) with keys:
"summary" (2-3 sentence analytical synthesis citing real numbers from the data)
"recommendations" (array of 3-4 concrete, actionable recommendations).
Remember: AI insights are advisory; distinguish observed figures from recommendations.

Dataset:
${params.summaryPayload}`;
      const res = await runLiveGemini('You are a university institutional analytics advisor returning JSON.', prompt);
      const cleaned = res.text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.summary && Array.isArray(parsed.recommendations)) {
        return {
          summary: parsed.summary,
          recommendations: parsed.recommendations,
          mode: 'live',
          model: res.model,
        };
      }
    } catch {
      // Fallback to deterministic analytics
    }
  }

  return {
    summary: `[Demo Mode Analysis] Based on current live campus records for ${params.domain}: ${params.summaryPayload.slice(0, 260)}...`,
    recommendations: [
      'Schedule proactive advisor check-ins for flagged records falling below institutional thresholds.',
      'Cross-reference afternoon lab schedules with attendance dips to identify timetable bottlenecks.',
      'Publish targeted academic support workshops ahead of internal assessment lock dates.',
    ],
    mode: 'demo',
    model: 'demo-deterministic',
  };
}
