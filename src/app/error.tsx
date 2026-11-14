'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-editorial-text mb-3">Something went wrong</h1>
      <p className="text-editorial-muted mb-6">
        The page hit an unexpected error. Your draft is kept in this browser tab, so trying again is safe.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
      >
        Try again
      </button>
    </div>
  );
}
