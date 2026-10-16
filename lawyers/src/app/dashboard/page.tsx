"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminOverview from '@/components/Dashboard/AdminOverview';
import LawyerOverview from '@/components/Dashboard/LawyerOverview';
import ClientOverview from '@/components/Dashboard/ClientOverview';

const roleCopy: Record<string, { title: string; description: string }> = {
  ADMIN: {
    title: 'Admin workspace',
    description: 'Manage cases, team members, inquiries, and payment approvals from one place.',
  },
  LAWYER: {
    title: 'Lawyer workspace',
    description: 'Track assigned matters, client conversations, and your upcoming schedule.',
  },
  CLIENT: {
    title: 'Client workspace',
    description: 'Follow your case progress, chat with counsel, and handle payments from here.',
  },
  ACCOUNTANT: {
    title: 'Accountant workspace',
    description: 'Manage billing, track client-lawyer directory, and verify payments.',
  },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role === 'ACCOUNTANT') {
      router.replace('/dashboard/accountant');
    }
  }, [user, router]);

  if (!user) return null;

  const copy = roleCopy[user.role] || {
    title: 'Dashboard workspace',
    description: 'Welcome to your workspace.',
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[36px] bg-white border border-gray-100 p-8 sm:p-10 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
          Dashboard
        </p>
        <h2 className="mt-4 text-3xl font-bold text-primary">
          Welcome back, {(user.name || 'Counsel').split(' ')[0]}.
        </h2>
        <p className="mt-3 max-w-2xl text-base text-gray-500">
          {copy.title}. {copy.description}
        </p>
      </section>

      {user.role === 'ADMIN' && <AdminOverview />}
      {user.role === 'LAWYER' && <LawyerOverview />}
      {user.role === 'CLIENT' && <ClientOverview />}
    </div>
  );
}
