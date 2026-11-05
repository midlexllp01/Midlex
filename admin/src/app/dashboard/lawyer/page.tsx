"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Briefcase, 
  Clock, 
  MessageSquare,
  Calendar,
  ExternalLink,
  Plus,
  ArrowRight
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function LawyerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [hearings, setHearings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLawyerData = async () => {
      try {
        const statsData = await apiFetch('/lawyer/stats');
        const casesData = await apiFetch('/lawyer/cases');
        const hearingsData = await apiFetch('/lawyer/hearings');
        setStats(statsData);
        setCases(casesData);
        setHearings(hearingsData);
      } catch (error) {
        console.error("Error fetching lawyer data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLawyerData();
  }, []);

  if (isLoading) return <div className="p-10 animate-pulse space-y-8">
    <div className="h-10 bg-gray-100 rounded-xl w-64" />
    <div className="grid grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-3xl" />)}
    </div>
    <div className="grid grid-cols-3 gap-8">
       <div className="col-span-2 h-96 bg-gray-100 rounded-[32px]" />
       <div className="h-96 bg-gray-100 rounded-[32px]" />
    </div>
  </div>;

  const statCards = [
    { label: "My Clients", value: stats?.totalClients || 0, icon: <Users />, color: "bg-blue-500" },
    { label: "Active Cases", value: stats?.activeCases || 0, icon: <Briefcase />, color: "bg-primary" },
    { label: "Upcoming Courts", value: stats?.upcomingCourts || 0, icon: <Calendar />, color: "bg-amber-500" },
    { label: "New Messages", value: stats?.newMessages || 0, icon: <MessageSquare />, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Lawyer Portal</h1>
          <p className="text-gray-500">Welcome back, {user?.name}. You have {stats?.upcomingCourts} court hearings scheduled.</p>
        </div>
        <Link href="/dashboard/schedule" className="bg-secondary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-secondary/20 hover:bg-secondary/90 transition-all">
          <Plus size={20} /> View Schedule
        </Link>
      </div>
      {/* Assigned Litigation Team Directory Banner */}
      <div className="bg-slate-900 border-2 border-amber-400/40 rounded-3xl p-6 shadow-xl text-white space-y-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary text-white flex items-center justify-center font-black text-2xl shadow-lg">
            🛡️
          </div>
          <div>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full font-black uppercase tracking-widest">
              Allocated Litigation Team
            </span>
            <h2 className="text-xl font-black tracking-wide uppercase text-white mt-1">
              {user?.litigationTeam ? `${user.litigationTeam}'S CASE DIRECTORY` : 'YOUR ASSIGNED CASE DIRECTORY'}
            </h2>
            <p className="text-xs text-gray-300">
              Official litigation team directory allocated to you by Super Admin.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/cases"
          className="px-6 py-3.5 bg-secondary text-white font-black rounded-2xl shadow-xl hover:bg-secondary/90 hover:scale-[1.02] transition-all text-xs tracking-wider uppercase border border-amber-300/50 flex items-center gap-2 shrink-0 self-start md:self-auto"
        >
          <span>📂 OPEN {(user?.litigationTeam || 'ASSIGNED').toUpperCase()} CASE DIRECTORY</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-current/20`}>
              {stat.icon}
            </div>
            <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-primary mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Active Cases */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-primary">My Case Load</h3>
            <Link href="/dashboard/cases" className="text-secondary font-bold text-sm">View All Cases</Link>
          </div>
          <div className="p-6 space-y-4">
            {cases.slice(0, 3).map((c, i) => (
              <div key={c.id} className="p-6 bg-gray-50 rounded-3xl flex flex-col md:flex-row md:items-center gap-6 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold text-secondary uppercase tracking-widest">{c.client.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                      c.status === 'OPEN' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                    }`}>{c.status}</span>
                  </div>
                  <h4 className="font-bold text-primary text-lg">{c.title}</h4>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{c.description}</p>
                </div>
                <Link 
                  href={`/dashboard/cases/${c.id}`}
                  className="p-4 bg-white rounded-2xl text-primary border border-gray-100 hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  <ArrowRight size={20} />
                </Link>
              </div>
            ))}
            {cases.length === 0 && (
              <div className="text-center py-10 text-gray-400 italic">No cases assigned to you yet.</div>
            )}
          </div>
        </div>

        {/* Calendar Sidebar */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-primary mb-8">Upcoming Courts</h3>
          <div className="space-y-6">
            {hearings.map((d, i) => {
              const date = new Date(d.date);
              const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
              const day = date.getDate();
              return (
                <div key={d.id} className="flex gap-4">
                  <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary text-white rounded-2xl shadow-lg shadow-primary/10">
                    <span className="text-[10px] font-bold opacity-60 uppercase">{month}</span>
                    <span className="text-xl font-bold leading-none">{day}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary leading-tight mb-1 line-clamp-1">{d.case.title}</h4>
                    <p className="text-xs text-gray-500 mb-1">{d.location}</p>
                    <div className="flex items-center gap-1 text-secondary text-xs font-bold">
                      <Clock size={12} /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            {hearings.length === 0 && (
              <div className="text-center py-10 text-gray-400 italic">No upcoming hearings.</div>
            )}
          </div>
          <Link 
            href="/dashboard/schedule"
            className="w-full mt-10 py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold text-sm hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
          >
            + Manage Hearings
          </Link>
        </div>
      </div>
    </div>
  );
}
