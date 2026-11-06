"use client";
import React, { useDeferredValue, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ChatWidget from '@/components/Dashboard/ChatWidget';
import TeamChatWidget from '@/components/Dashboard/TeamChatWidget';
import DashboardSearchBar from '@/components/Dashboard/DashboardSearchBar';

const defaultTeams = [
  'TEAM ANCHOR',
  'TEAM ALPHA',
  'TITAN LITIGATION',
  'MARITIME PRACTICE GROUP',
  'CORPORATE DISPUTE TEAM',
];

import MonthPickerFilter, { getCurrentMonthStr, isItemInMonth } from '@/components/Dashboard/MonthPickerFilter';

function formatChatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState('');

  const isStaff = user?.role === 'ADMIN' || user?.role === 'LAWYER';
  const [activeTab, setActiveTab] = useState<'CASE_CHATS' | 'TEAM_GROUP_CHAT'>('CASE_CHATS');
  const [teams, setTeams] = useState<string[]>(defaultTeams);
  const [selectedTeam, setSelectedTeam] = useState<string>(user?.litigationTeam || 'TEAM ANCHOR');

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const data = await apiFetch('/cases/my-cases');
        setCases(data || []);
        // Note: Do NOT auto-select first case so user must click to open (WhatsApp PC style)
      } catch (error) {
        console.error('Error fetching cases for messages:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCases();

    apiFetch<string[]>('/directory/teams')
      .then((backendTeams) => {
        if (Array.isArray(backendTeams) && backendTeams.length > 0) {
          setTeams(backendTeams);
          if (typeof window !== 'undefined') {
            localStorage.setItem('midlex_teams', JSON.stringify(backendTeams));
          }
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          const savedTeams = localStorage.getItem('midlex_teams');
          if (savedTeams) {
            try { setTeams(JSON.parse(savedTeams)); } catch (e) {}
          }
        }
      });
  }, []);

  useEffect(() => {
    if (user?.litigationTeam) {
      setSelectedTeam(user.litigationTeam);
    }
  }, [user]);

  if (isLoading) return <div className="h-full bg-white rounded-[40px] animate-pulse" />;

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  
  // Sort cases descending by last chatted message timestamp / updatedAt / createdAt (WhatsApp PC style)
  const sortedCases = [...cases].sort((a, b) => {
    const lastTimeA = a.messages && a.messages.length > 0 ? a.messages[0].createdAt : (a.updatedAt || a.createdAt);
    const lastTimeB = b.messages && b.messages.length > 0 ? b.messages[0].createdAt : (b.updatedAt || b.createdAt);
    return new Date(lastTimeB).getTime() - new Date(lastTimeA).getTime();
  });

  const filteredCases = sortedCases.filter((c) => {
    if (!isItemInMonth(c.createdAt, selectedMonth)) {
      return false;
    }
    if (!normalizedQuery) return true;
    const lastMsgContent = c.messages && c.messages.length > 0 ? c.messages[0].content : '';
    return [c.title, c.description, c.status, c.client?.name, lastMsgContent]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery));
  });

  const activeSelectedCase =
    filteredCases.find((c) => c.id === selectedCaseId) ||
    cases.find((c) => c.id === selectedCaseId);

  const sendBroadcast = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!broadcastText.trim() || broadcastBusy) return;
    setBroadcastBusy(true);
    setBroadcastNotice('');
    try {
      const result = await apiFetch<{ recipientCount: number; chatCount: number }>('/chat/broadcast', {
        method: 'POST',
        body: JSON.stringify({ content: broadcastText.trim() }),
      });
      setBroadcastNotice(`Sent to ${result.recipientCount} clients and added to ${result.chatCount} active case chats.`);
      setBroadcastText('');
      setBroadcastOpen(false);
    } catch (error) {
      setBroadcastNotice(error instanceof Error ? error.message : 'The broadcast could not be sent. Please try again.');
    } finally {
      setBroadcastBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Unified Communications</h2>
          <p className="text-xs text-gray-500 mt-1">Client matter discussions & litigation team collaboration</p>
        </div>

        {isStaff && (
          <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => { setBroadcastOpen((open) => !open); setBroadcastNotice(''); }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-primary border border-gray-200 hover:border-primary transition-all"
              >
                📢 Broadcast to clients
              </button>
            )}
            <button
              onClick={() => setActiveTab('CASE_CHATS')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'CASE_CHATS'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-600 hover:text-primary'
              }`}
            >
              💬 Client Case Chats
            </button>
            <button
              onClick={() => setActiveTab('TEAM_GROUP_CHAT')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'TEAM_GROUP_CHAT'
                  ? 'bg-secondary text-white shadow-md'
                  : 'text-gray-600 hover:text-secondary'
              }`}
            >
              <span>🛡️ Litigation Team Group Chat</span>
            </button>
          </div>
        )}
      </div>

      {broadcastOpen && user?.role === 'ADMIN' && (
        <form onSubmit={sendBroadcast} className="rounded-3xl border border-primary/15 bg-white p-5 shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-primary">Broadcast to all clients</h3>
            <p className="text-xs text-gray-500 mt-1">This message will appear in active client case chats. Clients can reply in their own chat.</p>
          </div>
          <textarea
            value={broadcastText}
            onChange={(event) => setBroadcastText(event.target.value)}
            maxLength={4000}
            rows={3}
            required
            placeholder="Write an update for Midlex LLP clients..."
            className="w-full rounded-2xl border border-gray-200 p-4 text-sm text-gray-800 outline-none focus:border-primary resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">{broadcastText.length}/4000 characters</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setBroadcastOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-600">Cancel</button>
              <button type="submit" disabled={broadcastBusy || !broadcastText.trim()} className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-white disabled:opacity-50">
                {broadcastBusy ? 'Sending…' : 'Send broadcast'}
              </button>
            </div>
          </div>
        </form>
      )}
      {broadcastNotice && (
        <p role="status" className="rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm text-primary">{broadcastNotice}</p>
      )}

      <MonthPickerFilter
        selectedMonth={selectedMonth}
        onChange={setSelectedMonth}
        totalCount={filteredCases.length}
        countLabel="active case conversations"
      />

      {activeTab === 'TEAM_GROUP_CHAT' && isStaff ? (
        <div className="space-y-4 flex-1">
          {/* Admin Team Switcher */}
          {user?.role === 'ADMIN' && (
            <div className="flex items-center gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Litigation Team Room:</span>
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTeam(t)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedTeam === t
                        ? 'bg-secondary text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🛡️ {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <TeamChatWidget teamName={selectedTeam} />
        </div>
      ) : (
        <div className="flex-1 grid lg:grid-cols-4 gap-8 min-h-[600px]">
          {/* Sidebar: WhatsApp Desktop Style Conversations List */}
          <div className="lg:col-span-1 bg-white rounded-[40px] border border-gray-100 overflow-hidden flex flex-col shadow-sm">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest">Conversations</p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Sorted by recent chats</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" title="Live Messaging" />
            </div>

            <div className="p-4 border-b border-gray-100">
              <DashboardSearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search conversations..."
                count={filteredCases.length}
                countLabel="chats"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredCases.map((c) => {
                const lastMsg = c.messages && c.messages.length > 0 ? c.messages[0] : null;
                const lastTime = lastMsg ? lastMsg.createdAt : (c.updatedAt || c.createdAt);
                const timeLabel = formatChatTime(lastTime);
                const isSelected = selectedCaseId === c.id;

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCaseId(c.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all border ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.01]'
                        : 'bg-white hover:bg-gray-50 border-gray-100 text-primary'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                        }`}>
                          {((c.category || '').toUpperCase() === 'GENERAL' ? '🏛️' : '⚖️')}
                        </div>
                        <p className="font-bold text-sm truncate">{c.client?.name || c.title}</p>
                      </div>
                      <span className={`text-[10px] font-medium shrink-0 ${
                        isSelected ? 'text-white/80' : 'text-gray-400'
                      }`}>
                        {timeLabel}
                      </span>
                    </div>

                    <div className="mt-2 pl-10">
                      <p className={`text-xs truncate font-medium ${
                        isSelected ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {lastMsg ? lastMsg.content || '📎 Attachment' : c.description || 'No messages yet.'}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-[9px] uppercase tracking-widest font-bold ${
                          isSelected ? 'text-white/60' : 'text-gray-400'
                        }`}>
                          {c.title}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isSelected 
                            ? 'bg-white/20 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {c.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredCases.length === 0 && (
                <div className="p-8 text-center text-gray-400 italic text-sm">
                  {cases.length === 0 ? 'No active conversations.' : 'No conversations match your search.'}
                </div>
              )}
            </div>
          </div>

          {/* Right Main Chat Area: WhatsApp PC Placeholder until clicked */}
          <div className="lg:col-span-3 h-full">
            {selectedCaseId && activeSelectedCase ? (
              <ChatWidget
                caseId={selectedCaseId}
                status={activeSelectedCase.status || "OPEN"}
                groupName={activeSelectedCase.client?.name || 'Client matter'}
                matterTitle={activeSelectedCase.title}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-[40px] border border-gray-100 text-gray-400 p-10 text-center shadow-sm">
                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-2xl font-bold text-primary mb-2">Midlex Web Messenger</h3>
                <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                  Select a conversation from the left sidebar to view legal discussions, messages, and document attachments.
                </p>
                <div className="mt-8 flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                  <span>🔒 End-to-end legal communication portal</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
