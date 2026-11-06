'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowLeft, Megaphone, MessageCircle, Plus, Search, Send } from 'lucide-react';

type Person = { id: string; name: string; email: string; role: string };
type Message = { id: string; senderId: string; content: string; createdAt: string; readAt: string | null; sender: Person };
type Broadcast = { id: string; recipientId: string; subject: string; content: string; createdAt: string; sender: Person; readAt: string | null; repliedConversationId: string | null };
type Conversation = { id: string; type: string; broadcastId: string | null; broadcast: Broadcast | null; otherUser: Person; messages: Message[] };
type Inbox = { unread: number; broadcasts: Broadcast[]; conversations: Conversation[] };
type Active = { kind: 'conversation' | 'broadcast'; id: string } | null;

const emptyInbox: Inbox = { unread: 0, broadcasts: [], conversations: [] };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function person(value: unknown): Person {
  const item = record(value);
  return { id: str(item.id), name: str(item.name) || str(item.email) || 'Workspace user', email: str(item.email), role: str(item.role) };
}

function message(value: unknown): Message {
  const item = record(value);
  return { id: str(item.id), senderId: str(item.senderId), content: str(item.content), createdAt: str(item.createdAt), readAt: str(item.readAt) || null, sender: person(item.sender) };
}

function broadcast(value: unknown): Broadcast {
  const item = record(value);
  return { id: str(item.id), recipientId: str(item.recipientId), subject: str(item.subject), content: str(item.content), createdAt: str(item.createdAt), sender: person(item.sender), readAt: str(item.readAt) || null, repliedConversationId: str(item.repliedConversationId) || null };
}

function normalizeInbox(value: unknown): Inbox {
  const item = record(value);
  if (!Array.isArray(item.broadcasts) || !Array.isArray(item.conversations)) throw new Error('The workspace inbox returned an unexpected response.');
  return {
    unread: Math.max(0, Number(item.unread) || 0),
    broadcasts: item.broadcasts.map(broadcast),
    conversations: item.conversations.map((value: unknown) => {
      const row = record(value);
      return { id: str(row.id), type: str(row.type), broadcastId: str(row.broadcastId) || null, broadcast: row.broadcast ? broadcast(row.broadcast) : null, otherUser: person(row.otherUser), messages: Array.isArray(row.messages) ? row.messages.map(message) : [] };
    }),
  };
}

async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : 'Chat request failed');
  return data;
}

function time(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || '?';
}

export default function WorkspaceChat({ canManage, currentUserId, onUnreadChange }: { canManage: boolean; currentUserId: string; onUnreadChange?: (count: number) => void }) {
  const [inbox, setInbox] = useState<Inbox>(emptyInbox);
  const [recipients, setRecipients] = useState<Person[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [active, setActive] = useState<Active>(null);
  const activeRef = useRef<Active>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<'inbox' | 'new' | 'broadcast'>('inbox');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function chooseActive(next: Active) {
    activeRef.current = next;
    setActive(next);
  }

  async function refresh(): Promise<Inbox | undefined> {
    try {
      let next = normalizeInbox(await request('chat/inbox'));
      const open = activeRef.current;
      if (open?.kind === 'conversation') {
        const thread = next.conversations.find(item => item.id === open.id);
        if (thread?.messages.some(item => item.senderId !== currentUserId && !item.readAt)) {
          await request(`chat/${open.id}/read`, 'POST');
          next = normalizeInbox(await request('chat/inbox'));
        }
      }
      setInbox(next);
      onUnreadChange?.(next.unread);
      setError('');
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load messages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    void request('chat/recipients')
      .then(value => setRecipients(Array.isArray(value) ? value.map(person) : []))
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Unable to load people'))
      .finally(() => setRecipientsLoading(false));
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  async function openConversation(item: Conversation) {
    chooseActive({ kind: 'conversation', id: item.id });
    setMode('inbox');
    setContent('');
    setNotice('');
    try {
      if (item.messages.some(row => row.senderId !== currentUserId && !row.readAt)) await request(`chat/${item.id}/read`, 'POST');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open chat'); }
  }

  async function openBroadcast(item: Broadcast) {
    chooseActive({ kind: 'broadcast', id: item.recipientId });
    setMode('inbox');
    setContent('');
    setNotice('');
    try {
      if (!item.readAt) await request(`chat/broadcast-recipients/${item.recipientId}/read`, 'POST');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open message'); }
  }

  function startNew() {
    chooseActive(null);
    setMode('new');
    setSelectedPerson(null);
    setSearch('');
    setContent('');
    setError('');
    setNotice('');
  }

  function startBroadcast() {
    chooseActive(null);
    setMode('broadcast');
    setSubject('');
    setContent('');
    setError('');
    setNotice('');
  }

  function choosePerson(target: Person) {
    const existing = inbox.conversations.find(item => item.type === 'DIRECT' && item.otherUser.id === target.id);
    if (existing) { void openConversation(existing); return; }
    chooseActive(null);
    setMode('new');
    setSelectedPerson(target);
    setContent('');
    setError('');
    setNotice('');
  }

  async function send() {
    if (!content.trim() || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'broadcast') {
        if (!subject.trim()) { setError('Add a subject for the broadcast.'); return; }
        const result = await request('chat/broadcasts', 'POST', { subject: subject.trim(), content: content.trim(), userIds: [] });
        setNotice(`Broadcast sent privately to ${Number(result.recipientCount) || 0} people.`);
        setMode('inbox');
        setSubject('');
      } else if (mode === 'new') {
        if (!selectedPerson) { setError('Choose a person to message.'); return; }
        const result = await request('chat/conversations', 'POST', { userId: selectedPerson.id, content: content.trim() });
        chooseActive({ kind: 'conversation', id: str(result.id) });
        setMode('inbox');
        setSelectedPerson(null);
      } else if (active?.kind === 'conversation') {
        await request(`chat/${active.id}/messages`, 'POST', { content: content.trim() });
      } else if (active?.kind === 'broadcast') {
        const item = inbox.broadcasts.find(row => row.recipientId === active.id);
        if (!item) throw new Error('This broadcast is no longer available.');
        await request(`chat/broadcasts/${item.id}/reply`, 'POST', { content: content.trim() });
        const next = await refresh();
        const reply = next?.broadcasts.find(row => row.recipientId === item.recipientId)?.repliedConversationId;
        if (reply) chooseActive({ kind: 'conversation', id: reply });
      }
      setContent('');
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send message'); }
    finally { setBusy(false); }
  }

  const threads = [
    ...inbox.conversations.map(item => ({ kind: 'conversation' as const, id: item.id, person: item.otherUser, preview: item.messages.at(-1)?.content || 'Start the conversation', date: item.messages.at(-1)?.createdAt || '', unread: item.messages.filter(row => row.senderId !== currentUserId && !row.readAt).length, item })),
    ...inbox.broadcasts.filter(item => !item.repliedConversationId).map(item => ({ kind: 'broadcast' as const, id: item.recipientId, person: item.sender, preview: `${item.subject}: ${item.content}`, date: item.createdAt, unread: item.readAt ? 0 : 1, item })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const currentConversation = active?.kind === 'conversation' ? inbox.conversations.find(item => item.id === active.id) : undefined;
  const currentBroadcast = active?.kind === 'broadcast' ? inbox.broadcasts.find(item => item.recipientId === active.id) : undefined;
  const threadBroadcast = currentConversation?.broadcast || inbox.broadcasts.find(item => item.repliedConversationId === currentConversation?.id);
  const counterpart = currentConversation?.otherUser || currentBroadcast?.sender;
  const showThread = mode !== 'inbox' || Boolean(active);
  const matches = recipients.filter(item => `${item.name} ${item.email}`.toLowerCase().includes(search.trim().toLowerCase()));
  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [active?.id, currentConversation?.messages.length, currentBroadcast?.id]);

  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <section className={`workspace-chat chat-layout ${showThread ? 'chat-has-thread' : ''}`} aria-label="Workspace chat">
      <div className="chat-inbox">
        <header className="chat-inbox-header">
          <div><span className="eyebrow">WORKSPACE CHAT</span><h2>Inbox</h2></div>
          <div className="chat-header-actions">
            {canManage && <button type="button" className="chat-icon-button" title="Broadcast to everyone" aria-label="Broadcast to everyone" onClick={startBroadcast}><Megaphone size={19} /></button>}
            <button type="button" className="chat-new-button" title="New chat" aria-label="New chat" onClick={startNew}><Plus size={20} /></button>
          </div>
        </header>
        {notice && <p className="chat-notice" role="status">{notice}</p>}
        {loading ? <p className="chat-empty">Loading chats…</p> : (
          <div className="chat-inbox-content">
            {threads.length > 0 && <>
              <h3 className="chat-section-title">Recent chats</h3>
              <div className="chat-list">
                {threads.map(thread => <button type="button" key={`${thread.kind}-${thread.id}`} className={`chat-list-item ${active?.kind === thread.kind && active.id === thread.id ? 'active' : ''}`} onClick={() => thread.kind === 'conversation' ? void openConversation(thread.item as Conversation) : void openBroadcast(thread.item as Broadcast)}>
                  <span className="chat-avatar">{initials(thread.person.name)}</span>
                  <span className="chat-list-copy"><strong>{thread.person.name}</strong><small>{thread.preview}</small></span>
                  <span className="chat-list-meta"><small>{time(thread.date)}</small>{thread.unread > 0 && <span className="chat-unread">{thread.unread > 99 ? '99+' : thread.unread}</span>}</span>
                </button>)}
              </div>
            </>}
            <h3 className="chat-section-title">People <span>{recipients.length}</span></h3>
            <label className="chat-search chat-inbox-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people" aria-label="Search people in workspace" /></label>
            <div className="chat-people chat-inbox-people">
              {recipientsLoading ? <p>Loading workspace users…</p> : matches.length ? matches.map(target => <button key={target.id} type="button" onClick={() => choosePerson(target)}>
                <span className="chat-avatar">{initials(target.name)}</span>
                <span><strong>{target.name}</strong><small>{target.email} · {target.role.toLowerCase()}</small></span>
              </button>) : <p>{recipients.length ? 'No people match your search.' : 'No other active workspace users found.'}</p>}
            </div>
          </div>
        )}
      </div>

      <div className="chat-thread">
        {error && <div className="notice error" role="alert">{error}</div>}
        {mode === 'new' && !selectedPerson ? <>
          <header className="chat-thread-header"><button type="button" className="chat-back" aria-label="Back to inbox" onClick={() => setMode('inbox')}><ArrowLeft size={18} /></button><div><strong>New chat</strong><small>Choose someone in your workspace</small></div></header>
          <label className="chat-search"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search people" aria-label="Search people" /></label>
          <div className="chat-people">{matches.length ? matches.map(target => <button key={target.id} type="button" onClick={() => choosePerson(target)}><span className="chat-avatar">{initials(target.name)}</span><span><strong>{target.name}</strong><small>{target.email}</small></span></button>) : <p>No other active workspace users found.</p>}</div>
        </> : mode === 'broadcast' ? <>
          <header className="chat-thread-header"><button type="button" className="chat-back" aria-label="Back to inbox" onClick={() => setMode('inbox')}><ArrowLeft size={18} /></button><span className="chat-avatar"><Megaphone size={20} /></span><div><strong>New broadcast</strong><small>Each active user receives a private message</small></div></header>
          <div className="chat-compose-broadcast"><label htmlFor="chat-subject">Subject</label><input id="chat-subject" value={subject} onChange={event => setSubject(event.target.value)} maxLength={160} placeholder="Broadcast subject" /><p>Only admins and developers can send broadcasts. Replies are private.</p></div>
          <div className="chat-composer"><textarea value={content} onChange={event => setContent(event.target.value)} onKeyDown={composerKeyDown} maxLength={4000} placeholder="Write your broadcast…" rows={3} aria-label="Broadcast message" /><button type="button" disabled={busy || !subject.trim() || !content.trim()} onClick={() => void send()} aria-label="Send broadcast"><Send size={19} /></button></div>
        </> : mode === 'new' && selectedPerson ? <>
          <header className="chat-thread-header"><button type="button" className="chat-back" aria-label="Choose another person" onClick={() => setSelectedPerson(null)}><ArrowLeft size={18} /></button><span className="chat-avatar">{initials(selectedPerson.name)}</span><div><strong>{selectedPerson.name}</strong><small>{selectedPerson.email}</small></div></header>
          <div className="chat-messages chat-messages-empty">Write your first message to {selectedPerson.name}.</div>
          <div className="chat-composer"><textarea value={content} onChange={event => setContent(event.target.value)} onKeyDown={composerKeyDown} maxLength={4000} placeholder="Write a message…" rows={2} aria-label="New message" /><button type="button" disabled={busy || !content.trim()} onClick={() => void send()} aria-label="Send message"><Send size={19} /></button></div>
        </> : counterpart ? <>
          <header className="chat-thread-header"><button type="button" className="chat-back" aria-label="Back to inbox" onClick={() => chooseActive(null)}><ArrowLeft size={18} /></button><span className="chat-avatar">{initials(counterpart.name)}</span><div><strong>{counterpart.name}</strong><small>{counterpart.email || 'Workspace member'}</small></div></header>
          <div className="chat-messages" ref={messagesRef}>
            {threadBroadcast && <div className="chat-bubble chat-bubble-received"><span className="chat-broadcast-label"><Megaphone size={13} /> Broadcast · {threadBroadcast.subject}</span><p>{threadBroadcast.content}</p><small>{time(threadBroadcast.createdAt)}</small></div>}
            {currentConversation?.messages.map(item => <div key={item.id} className={`chat-bubble ${item.senderId === currentUserId ? 'chat-bubble-sent' : 'chat-bubble-received'}`}><p>{item.content}</p><small>{time(item.createdAt)}</small></div>)}
            {currentBroadcast && <div className="chat-bubble chat-bubble-received"><span className="chat-broadcast-label"><Megaphone size={13} /> Broadcast · {currentBroadcast.subject}</span><p>{currentBroadcast.content}</p><small>{time(currentBroadcast.createdAt)}</small></div>}
          </div>
          <div className="chat-composer"><textarea value={content} onChange={event => setContent(event.target.value)} onKeyDown={composerKeyDown} maxLength={4000} placeholder="Write a message…" rows={2} aria-label="Reply" /><button type="button" disabled={busy || !content.trim()} onClick={() => void send()} aria-label="Send message"><Send size={19} /></button></div>
        </> : <div className="chat-thread-placeholder"><MessageCircle size={34} /><h3>Your messages</h3><p>Select a chat or press + to start one.</p></div>}
      </div>
    </section>
  );
}
