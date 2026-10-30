'use client';
import { useEffect, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

type Person = { id: string; name: string; email: string; role: string };
type Message = { id: string; senderId: string; content: string; createdAt: string; sender?: Person };
type Conversation = { id: string; otherUser: Person; messages: Message[] };
type Broadcast = { id: string; recipientId: string; subject: string; content: string; createdAt: string; sender: Person; readAt?: string | null; repliedConversationId?: string | null };

async function request(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/api/${path}`, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Chat request failed'); return data;
}

export default function WorkspaceChat({ canManage, currentUserId, autoOpen = false }: { canManage: boolean; currentUserId: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(false); const [inbox, setInbox] = useState<any>({ broadcasts: [], conversations: [], unread: 0 });
  const [recipients, setRecipients] = useState<Person[]>([]); const [selected, setSelected] = useState(''); const [conversation, setConversation] = useState<Conversation | null>(null); const [replyBroadcastId, setReplyBroadcastId] = useState('');
  const [subject, setSubject] = useState(''); const [content, setContent] = useState(''); const [broadcast, setBroadcast] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function refresh() { try { setInbox(await request('chat/inbox')); setRecipients(await request('chat/recipients')); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load messages'); } }
  useEffect(() => { if (autoOpen) setOpen(true); void refresh(); const timer = window.setInterval(() => void refresh(), 30000); return () => window.clearInterval(timer); }, [canManage, autoOpen]);
  async function submit() {
    setBusy(true); setError('');
    try {
      if (broadcast) await request('chat/broadcasts', 'POST', { subject, content, userIds: selected === 'all' ? [] : [selected] });
      else if (!conversation) await request('chat/conversations', 'POST', { userId: selected, content });
      else if (replyBroadcastId) await request(`chat/broadcasts/${replyBroadcastId}/reply`, 'POST', { content });
      else await request(`chat/${conversation.id}/messages`, 'POST', { content });
      setSubject(''); setContent(''); setSelected(''); setConversation(null); setReplyBroadcastId(''); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to send message'); } finally { setBusy(false); }
  }
  const unread = inbox.unread || 0;
  return <>
    <button type="button" className="secondary compact" onClick={() => { setOpen(true); setError(''); void refresh(); }} aria-label={unread > 0 ? `${unread} unread messages` : 'Open messages'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}><MessageCircle size={15}/> Messages{unread > 0 && <span aria-label={`${unread} unread messages`} style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 999, background: '#dc2626', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, lineHeight: 1 }}>{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="chat-title" style={{ maxWidth: 720 }}><header><div><span className="eyebrow">WORKSPACE INBOX</span><h2 id="chat-title">Messages</h2></div><button aria-label="Close messages" onClick={() => setOpen(false)}><X size={20}/></button></header>
      {error && <div className="notice error" role="alert">{error}</div>}
      {!conversation && <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
        {inbox.broadcasts.map((item: Broadcast) => <button key={item.recipientId} type="button" className="grant-row" onClick={async () => { void request(`chat/broadcast-recipients/${item.recipientId}/read`, 'POST'); setSubject(`Re: ${item.subject}`); setContent(''); setSelected(''); setBroadcast(false); setReplyBroadcastId(item.repliedConversationId ? '' : item.id); const messages = item.repliedConversationId ? await request(`chat/${item.repliedConversationId}/messages`) : [{ id: item.id, senderId: item.sender.id, content: item.content, createdAt: item.createdAt, sender: item.sender }]; setConversation({ id: item.repliedConversationId || '', otherUser: item.sender, messages }); }}><span><strong>{item.subject}</strong><small>{item.sender.name} · {item.content}</small></span></button>)}
        {inbox.conversations.map((item: Conversation) => <button key={item.id} type="button" className="grant-row" onClick={() => { setConversation(item); setBroadcast(false); setContent(''); }}><span><strong>{item.otherUser.name}</strong><small>{item.messages.at(-1)?.content || 'No messages yet'}</small></span></button>)}
        {!inbox.broadcasts.length && !inbox.conversations.length && <p className="muted">No messages yet.</p>}
      </div>}
      {!conversation && <div style={{ display: 'flex', gap: 8, marginTop: 14 }}><button type="button" className="secondary-button" onClick={() => { setBroadcast(false); setConversation(null); setSelected(''); }}>New private message</button>{canManage && <button type="button" className="secondary-button" onClick={() => { setBroadcast(true); setConversation(null); setSelected('all'); }}>Broadcast</button>}</div>}
      {(canManage && !conversation || conversation) && <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
        {!conversation && <select value={selected} onChange={e => setSelected(e.target.value)} aria-label="Recipient"><option value="">Choose recipient</option>{broadcast && <option value="all">All active users</option>}{recipients.map(person => <option key={person.id} value={person.id}>{person.name} ({person.email})</option>)}</select>}
        {conversation && <><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{conversation.otherUser.name}</strong><button type="button" className="text-button" onClick={() => { setConversation(null); setReplyBroadcastId(''); }}>Back</button></div><div style={{ maxHeight: 200, overflowY: 'auto' }}>{conversation.messages.map(message => <p key={message.id}><strong>{message.sender?.name || (message.senderId === currentUserId ? 'You' : 'User')}:</strong> {message.content}</p>)}</div></>}
        <textarea value={content} onChange={e => setContent(e.target.value)} maxLength={4000} required placeholder={broadcast ? 'Broadcast message' : 'Write a message…'} rows={3}/><button type="button" className="primary compact" disabled={busy || !content.trim() || (!conversation && !selected)} onClick={() => void submit()}>{busy ? 'Sending…' : 'Send'}<Send size={15}/></button>
      </div>}
    </section></div>}
  </>;
}
