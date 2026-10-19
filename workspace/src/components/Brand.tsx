'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Brand({ role, caption }: { role?: string; caption?: string }) {
  const [displayCaption, setDisplayCaption] = useState(caption || 'ONE WORKSPACE');

  useEffect(() => {
    if (caption) {
      setDisplayCaption(caption);
      return;
    }
    let r = role?.toLowerCase();
    if (!r && typeof window !== 'undefined') {
      const host = window.location.hostname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const qRole = params.get('role') || params.get('workspace');
      if (qRole) r = qRole.toLowerCase();
      else if (host.includes('admin')) r = 'admin';
      else if (host.includes('staff')) r = 'staff';
      else if (host.includes('developer') || host.includes('dev')) r = 'developer';
    }
    if (r === 'admin') setDisplayCaption('ADMIN WORKSPACE');
    else if (r === 'staff') setDisplayCaption('STAFF WORKSPACE');
    else if (r === 'developer') setDisplayCaption('DEVELOPER WORKSPACE');
    else setDisplayCaption('ONE WORKSPACE');
  }, [role, caption]);

  return (
    <a className="brand workspace-brand" href="/" aria-label={`Midlex ${displayCaption} home`}>
      <Image src="/midlex-logo.png" alt="Midlex — Litigation, Mediation, Consultation" width={1536} height={1024} priority className="workspace-logo" />
      <span className="workspace-brand-caption">{displayCaption}</span>
    </a>
  );
}
