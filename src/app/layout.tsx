import './globals.css';
import type { Metadata } from 'next';
import Nav from '@/components/Nav';

// Set NEXT_PUBLIC_SITE_URL in your host's env vars to your live URL so share previews resolve correctly.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'AI Editorial Workspace', template: '%s | AI Editorial Workspace' },
  description: 'Research assistant and writing assistant for newsletter teams.',
  openGraph: {
    title: 'AI Editorial Workspace',
    description: 'Research assistant and writing assistant for newsletter teams.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-editorial-bg text-editorial-text min-h-screen">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
