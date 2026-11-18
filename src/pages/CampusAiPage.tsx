import React, { useEffect, useRef, useState } from 'react';
import { Bot, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: 'live' | 'demo';
  errorNote?: string;
}

const SUGGESTED_BY_ROLE: Record<string, string[]> = {
  student: [
    'What is my attendance percentage?',
    'What are the upcoming college events?',
    'Explain my academic performance.',
    'How do I register for an event?',
    'What courses are available?',
  ],
  faculty: [
    'Which subjects am I currently assigned to teach?',
    'What are the upcoming college events?',
    'How should I follow up with students below 75% attendance?',
    'What courses are available across departments?',
  ],
  admin: [
    'Summarize current institutional metrics and open feedback.',
    'What are the upcoming college events?',
    'What courses are available at GM University?',
    'How do I manage attendance threshold settings?',
  ],
};

export function CampusAiPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [aiStatus, setAiStatus] = useState<{ liveAvailable: boolean; model: string; provider: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${user?.full_name}. I am Campus AI Assistant inside GMU ERP Management, grounded in your ${user?.role} workspace context. Ask about courses, attendance, performance, exams, or campus events.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<{ liveAvailable: boolean; model: string; provider: string }>('/ai/status')
      .then(setAiStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || sending) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setSending(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const res = await apiFetch<{ reply: string; mode: 'live' | 'demo'; errorNote?: string }>('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: query, history: historyPayload }),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          mode: res.mode,
          errorNote: res.errorNote,
        },
      ]);
    } catch (err: any) {
      showToast(err?.message || 'Unable to reach Campus AI Assistant', 'error');
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `Conversation cleared. How can I assist you with your ${user?.role} tasks today?`,
      },
    ]);
  };

  const prompts = SUGGESTED_BY_ROLE[user?.role || 'student'] || SUGGESTED_BY_ROLE.student;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#202B38]">Campus AI Assistant</h1>
          <p className="text-xs text-[#738091] mt-1">
            Role-aware conversational assistant ·{' '}
            <span className="font-medium text-[#202B38]">
              {aiStatus ? (aiStatus.liveAvailable ? `Connected (${aiStatus.model})` : aiStatus.provider) : 'Checking provider...'}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-white border border-[#E5E9EF] hover:bg-[#F5F6F8] text-[#202B38] rounded-md whitespace-nowrap self-start"
        >
          <Trash2 className="w-3.5 h-3.5 text-[#738091]" />
          <span>Clear Conversation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Suggested Prompts Sidebar */}
        <div className="bg-white border border-[#E5E9EF] rounded-lg p-4 space-y-3 h-fit">
          <h2 className="text-xs font-semibold text-[#202B38]">Suggested Questions</h2>
          <div className="space-y-2">
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => sendMessage(p)}
                disabled={sending}
                className="w-full text-left px-3 py-2 text-xs text-[#202B38] bg-[#F5F6F8] hover:bg-[#E5E9EF]/70 rounded-md transition-colors leading-snug"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Main Chat Thread */}
        <div className="lg:col-span-3 bg-white border border-[#E5E9EF] rounded-lg flex flex-col h-[580px]">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#172332] text-white'
                      : 'bg-[#F5F6F8] border border-[#E5E9EF] text-[#202B38]'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1.5 text-[11px] text-[#738091]">
                      <Bot className="w-3.5 h-3.5 text-[#D99A32]" />
                      <span className="font-medium text-[#202B38]">Campus AI Assistant</span>
                      {m.mode && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{m.mode === 'live' ? 'Live Gemini AI' : 'Demo Mode'}</span>
                        </>
                      )}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-xs sm:text-sm">{m.content}</div>
                  {m.errorNote && <p className="mt-2 text-[11px] text-[#BD8123]">{m.errorNote}</p>}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-[#F5F6F8] border border-[#E5E9EF] rounded-lg px-4 py-3 text-xs text-[#738091]">
                  Campus AI Assistant is thinking...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="p-3.5 border-t border-[#E5E9EF] flex items-center gap-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about attendance, marks, exams, courses, or campus events..."
              className="flex-1 px-3.5 py-2 text-sm bg-[#F5F6F8] border border-[#E5E9EF] rounded-md text-[#202B38] focus:outline-none focus:bg-white focus:border-[#D99A32]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#D99A32] hover:bg-[#BD8123] text-white rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
