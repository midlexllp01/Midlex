'use client';

import { useEffect } from 'react';

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Workspace page error', error);
  }, [error]);

  return (
    <main className="loading" role="alert">
      <div>
        <h1>Workspace could not load</h1>
        <p>{error.message || 'An unexpected error occurred in the workspace.'}</p>
        {error.digest && <p>Reference: {error.digest}</p>}
        <button type="button" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
