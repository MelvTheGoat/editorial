import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="text-3xl font-bold text-editorial-text mb-3">Page not found</h1>
      <p className="text-editorial-muted mb-6">That page doesn&apos;t exist.</p>
      <Link href="/" className="text-brand-600 hover:text-brand-800 font-medium">
        Back to the workspace
      </Link>
    </div>
  );
}
