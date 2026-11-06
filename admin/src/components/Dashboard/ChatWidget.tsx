"use client";
import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import { Paperclip, Send, FileText, Image as ImageIcon, X, XCircle } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '@/lib/api';

interface Message {
  id: string;
  content: string;
  fileUrl?: string;
  senderId: string;
  sender: { name: string; role?: string };
  createdAt: string;
}

export default function ChatWidget({ caseId, status, groupName, matterTitle }: { caseId: string, status: string, groupName?: string, matterTitle?: string }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiMode, setAiMode] = useState<boolean>(true);

  useEffect(() => {
    if (!token) {
      setConnectionStatus('disconnected');
      setConnectionError(null);
      setMessages([]);
      return;
    }

    socketRef.current = io(getApiBaseUrl(), {
      auth: { token },
      transports: ['polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 8000,
    });

    const socket = socketRef.current;
    setConnectionStatus('connecting');
    setConnectionError(null);

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setConnectionError(null);
      socket.emit('joinRoom', { caseId });
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (err: unknown) => {
      setConnectionStatus('disconnected');
      const message = err instanceof Error ? err.message : 'Unable to connect';
      setConnectionError(message);
    });

    socket.on('message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('aiModeChanged', (data: { aiMode: boolean; takenOverBy?: string }) => {
      setAiMode(data.aiMode);
    });

    return () => {
      socket.disconnect();
    };
  }, [caseId, token]);

  const handleTakeover = () => {
    if (!socketRef.current || !user) return;
    socketRef.current.emit('takeoverChat', {
      caseId,
      userRole: user.role,
      userName: user.name,
    });
    setAiMode(false);
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await apiFetch(`/cases/${caseId}`);
        const history = Array.isArray(data?.messages) ? data.messages : [];
        setMessages(history);
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    if (token) fetchHistory();
  }, [caseId, token]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !socketRef.current || !user) return;

    let fileUrl = '';
    if (selectedFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('caseId', caseId);
      formData.append('name', selectedFile.name);

      try {
        const response = await fetch(`${getApiBaseUrl()}/documents/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.message || 'Upload failed');
        fileUrl = data.url;
      } catch (error) {
        console.error('File upload error:', error);
        alert('Failed to upload file to chat');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    socketRef.current.emit('sendMessage', {
      caseId,
      senderId: user.id,
      content: newMessage,
      fileUrl,
    });
    setNewMessage('');
  };

  const renderFile = (url: string) => {
    const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i);
    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="block mt-2 rounded-xl overflow-hidden border border-white/20">
          <img src={url} alt="Shared file" className="max-w-full h-auto" />
        </a>
      );
    }
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 mt-2 p-3 bg-white/10 rounded-xl border border-white/10 hover:bg-white/20 transition-all">
        <FileText size={20} />
        <span className="text-xs font-medium truncate max-w-[150px]">View Document</span>
      </a>
    );
  };

  const isClosed = status === 'CLOSED';
  const isAuthed = Boolean(token && user);
  const connectionLabel = !isAuthed
    ? 'Sign in to chat'
    : connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'connecting'
        ? 'Connecting…'
        : 'Disconnected';

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm relative">
      {isClosed && (
        <div className="absolute inset-0 z-20 bg-gray-50/50 backdrop-blur-[2px] flex items-center justify-center p-10 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 max-w-xs">
            <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-bold text-primary mb-2">Case Closed</h4>
            <p className="text-gray-500 text-xs">This discussion is locked as the case has been completed.</p>
          </div>
        </div>
      )}
      <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="font-bold text-primary flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            {groupName || 'Client matter'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">{matterTitle || 'Case discussion'} · Client + Litigation Team</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              aiMode ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
            }`}>
              {aiMode ? '🤖 AI Assistant Responding' : '👨‍⚖️ Lawyer Active'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {aiMode && (user?.role === 'ADMIN' || user?.role === 'LAWYER') && (
            <button
              onClick={handleTakeover}
              className="px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md"
            >
              👨‍⚖️ Take Over Chat
            </button>
          )}
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
            {connectionLabel}
            {connectionError ? <span className="block normal-case font-medium text-gray-400/80">{connectionError}</span> : null}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          const senderName = msg.sender?.name || 'Unknown';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${isMe ? 'text-right' : 'text-left'}`}>
                {!isMe && (
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-gray-400 ml-2">
                    {senderName}{msg.sender?.role ? ` · ${msg.sender.role.toLowerCase()}` : ''}
                  </p>
                )}
                <div className={`p-4 rounded-3xl inline-block text-left ${
                  isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-primary rounded-tl-none'
                }`}>
                  {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                  {msg.fileUrl && renderFile(msg.fileUrl)}
                  <p className={`text-[10px] mt-2 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="p-6 bg-white border-t border-gray-100">
        {selectedFile && (
          <div className="mb-4 p-3 bg-secondary/5 rounded-2xl border border-secondary/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon size={18} className="text-secondary" />
              <span className="text-xs font-bold text-primary truncate max-w-[200px]">{selectedFile.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex gap-3 items-center">
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-secondary hover:bg-secondary/5 rounded-2xl transition-all"
          >
            <Paperclip size={24} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isUploading || isClosed || !isAuthed || connectionStatus !== 'connected'}
            className="flex-1 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all text-sm disabled:opacity-50"
            placeholder={isClosed ? "Discussion closed" : !isAuthed ? "Sign in to chat on this device" : "Type your message..."}
          />
          <button 
            type="submit"
            disabled={isUploading || isClosed || !isAuthed || connectionStatus !== 'connected'}
            className="w-12 h-12 flex items-center justify-center bg-secondary text-white rounded-2xl shadow-lg shadow-secondary/20 hover:bg-secondary/90 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
