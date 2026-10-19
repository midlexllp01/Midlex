'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    function getLoginTarget() {
      if (typeof window === 'undefined') return '/login';
      const host = window.location.hostname.toLowerCase();
      if (host.includes('admin')) return '/login?role=admin';
      if (host.includes('staff')) return '/login?role=staff';
      if (host.includes('developer') || host.includes('dev')) return '/login?role=developer';
      return '/login';
    }
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) router.replace(`/${d.user.role.toLowerCase()}`);
        else router.replace(getLoginTarget());
      })
      .catch(() => router.replace(getLoginTarget()));
  }, [router]);
  return <div className="loading">Opening your workspace…</div>;
}
