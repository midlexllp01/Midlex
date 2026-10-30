'use client';
import { useEffect, useState } from 'react';
import WorkspaceChat from '../../components/WorkspaceChat';

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => { fetch('/api/me', { cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => setUser(data?.user || null)).catch(() => setUser(null)); }, []);
  if (!user) return <main className="loading">Sign in to open your workspace inbox.</main>;
  return <main style={{ minHeight: '100vh', background: '#f5f8f3' }}><WorkspaceChat canManage={user.role === 'ADMIN' || user.role === 'DEVELOPER'} currentUserId={user.id} autoOpen /></main>;
}
