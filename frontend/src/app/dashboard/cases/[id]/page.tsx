"use client";
import React, { useEffect, useState, use } from 'react';
import { apiFetch } from '@/lib/api';
import ChatWidget from '@/components/Dashboard/ChatWidget';
import DocumentManager from '@/components/Dashboard/DocumentManager';
import AssignLawyerModal from '@/components/Dashboard/AssignLawyerModal';
import CourtDateModal from '@/components/Dashboard/CourtDateModal';
import EditCaseModal from '@/components/Dashboard/EditCaseModal';
import CaseTimelineWidget from '@/components/Dashboard/CaseTimelineWidget';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

interface Case {
  id: string;
  title: string;
  description: string;
  status: string;
  client: { name: string; email: string };
  lawyer?: { name: string };
  category?: 'LITIGATION' | 'GENERAL';
  createdAt: string;
}

export default function CaseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [courtDates, setCourtDates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchCase = async () => {
    try {
      const data = await apiFetch(`/cases/${id}`);
      setCaseData(data);
      const dates = await apiFetch(`/court-dates/case/${id}`);
      setCourtDates(dates);
    } catch (error) {
      console.error('Error fetching case:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
  }, [id]);

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await apiFetch(`/cases/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchCase();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  if (isLoading) return <div className="animate-pulse space-y-8">
    <div className="h-20 bg-gray-100 rounded-[32px] w-1/3" />
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 h-[600px] bg-gray-100 rounded-[40px]" />
      <div className="h-[600px] bg-gray-100 rounded-[40px]" />
    </div>
  </div>;

  if (!caseData) return <div className="text-center py-20">Case not found.</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
              caseData.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {(!caseData?.status || caseData?.status === 'OPEN' || caseData?.status === 'NEW') ? 'CASE MATTER REGISTERED' : String(caseData.status).replace('_', ' ')}
            </span>
            <span className="text-sm text-gray-400 font-medium">Created on {new Date(caseData.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-primary">{caseData.title}</h2>
            {(user?.role === 'ADMIN' || user?.role === 'LAWYER') && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                title="Edit Case Title"
              >
                ✏️ Edit Title
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              const el = document.getElementById('case-files-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                const link = `${window.location.origin}/share/case/${caseData.id}`;
                navigator.clipboard.writeText(link);
                alert(`Shareable Case Files Link copied!\n\nLink: ${link}`);
              }
            }}
            className="flex items-center gap-2 px-6 py-4 bg-secondary text-white font-bold rounded-2xl shadow-xl shadow-secondary/20 hover:bg-secondary/90 transition-all text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Case Files
          </button>

          {user?.role === 'ADMIN' && (
             <button 
               onClick={() => setIsAssignModalOpen(true)}
               className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all text-sm"
             >
               Assign Litigation Team
             </button>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'LAWYER') && (
             <div className="flex flex-wrap gap-2">
               {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].map((status) => (
                 <button 
                   key={status}
                   onClick={() => handleStatusUpdate(status)}
                   className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                     caseData.status === status 
                       ? 'bg-primary text-white shadow-lg' 
                       : 'bg-white border border-gray-200 text-gray-600 hover:border-secondary/20'
                   }`}
                 >
                   {status.replace('_', ' ')}
                 </button>
               ))}
             </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] border border-gray-100 p-10"
          >
            <h3 className="text-xl font-bold text-primary mb-6">Case Summary</h3>
            <p className="text-gray-600 leading-relaxed">{caseData.description}</p>
            
            <div className="mt-10 grid md:grid-cols-2 gap-8 pt-10 border-t border-gray-50">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Client Information</p>
                  <h4 className="font-bold text-primary">{caseData.client.name}</h4>
                  <p className="text-sm text-gray-500">{caseData.client.email}</p>
                  {(caseData.client as any).phone && <p className="text-sm text-gray-500 mt-1">📞 {(caseData.client as any).phone}</p>}
                </div>
                {((caseData.client as any).nationalId || (caseData.client as any).dateOfBirth) && (
                  <div className="pt-4 border-t border-gray-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Extended Details</p>
                    {(caseData.client as any).nationalId && <p className="text-xs text-gray-500">ID: {(caseData.client as any).nationalId}</p>}
                    {(caseData.client as any).dateOfBirth && <p className="text-xs text-gray-500">DOB: {new Date((caseData.client as any).dateOfBirth).toLocaleDateString()}</p>}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Assigned Litigation Team</p>
                <h4 className="font-bold text-primary">
                  {(caseData as any).litigationTeam || caseData.lawyer?.name || 'Unassigned'}
                </h4>
                <p className="text-sm text-gray-500">
                  {(caseData as any).litigationTeam ? 'Midlex Senior Litigation Panel' : caseData.lawyer ? 'Barrister & Solicitor' : 'Awaiting Team Allocation'}
                </p>
              </div>
            </div>
          </motion.div>

          <CaseTimelineWidget caseId={caseData.id} caseStatus={caseData.status} />

          <DocumentManager caseId={caseData.id} status={caseData.status} />
        </div>

        <div className="space-y-8">
          <ChatWidget caseId={caseData.id} status={caseData.status} groupName={caseData.client?.name || 'Client matter'} matterTitle={caseData.title} />
          
          <div className="bg-primary p-8 rounded-[40px] text-white">
            <h4 className="text-xl font-bold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Court Dates
            </h4>
            <div className="space-y-4">
              {courtDates.length > 0 ? courtDates.map((date) => (
                <div key={date.id} className="p-4 bg-white/10 rounded-2xl border border-white/5">
                  <p className="font-bold text-secondary">{new Date(date.date).toLocaleDateString()} @ {new Date(date.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-sm font-medium mt-1">{date.location}</p>
                  <p className="text-xs text-white/40 mt-2">{date.description}</p>
                </div>
              )) : (
                <p className="text-white/60 text-sm italic">No dates scheduled yet.</p>
              )}
              {user?.role !== 'CLIENT' && (
                <button 
                  onClick={() => setIsCourtModalOpen(true)}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-all border border-white/10"
                >
                  Schedule Date
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <AssignLawyerModal 
        caseId={caseData.id}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onAssigned={fetchCase}
        workspace={caseData.category === 'GENERAL' ? 'GENERAL' : 'LITIGATION'}
      />
      <CourtDateModal 
        caseId={caseData.id}
        isOpen={isCourtModalOpen}
        onClose={() => setIsCourtModalOpen(false)}
        onScheduled={fetchCase}
      />
      <EditCaseModal
        caseItem={caseData}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdated={fetchCase}
      />
    </div>
  );
}
