'use client';

import Link from 'next/link';
import Icon, { type IconName } from '@/components/Icon';

const features: { href: string; icon: IconName; title: string; description: string; color: string; borderColor: string; hoverBorder: string; iconBg: string }[] = [
  {
    href: '/research',
    icon: 'search',
    title: 'Research Assistant',
    description:
      'Gather and analyze multiple sources to generate comprehensive research briefs. Extract facts, identify trends, and discover compelling newsletter angles — all powered by AI.',
    color: 'from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400',
    iconBg: 'bg-blue-100',
  },
  {
    href: '/writing',
    icon: 'pencil',
    title: 'Writing Assistant',
    description:
      'Paste your draft and get instant feedback on readability, style, and clarity. Identify long sentences, passive voice, filler phrases, and more — with actionable rewrite suggestions.',
    color: 'from-purple-50 to-pink-50',
    borderColor: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400',
    iconBg: 'bg-purple-100',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-transparent to-purple-50/30" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            AI-Powered Editorial Tools
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-editorial-text mb-6">
            AI Editorial
            <br />
            <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
              Workspace
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-editorial-muted max-w-2xl mx-auto leading-relaxed">
            Go from raw information to polished drafts. Research, analyze, and
            refine your newsletter content with AI-powered tools built for
            editorial teams.
          </p>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className={`
                group relative block rounded-2xl border-2 ${feature.borderColor} ${feature.hoverBorder}
                bg-gradient-to-br ${feature.color} p-8
                transition-all duration-300 hover:shadow-lg hover:-translate-y-1
              `}
            >
              <div
                className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${feature.iconBg} mb-5`}
              >
                <Icon name={feature.icon} className="w-7 h-7 text-brand-700" />
              </div>
              <h2 className="text-xl font-semibold text-editorial-text mb-3 group-hover:text-brand-700 transition-colors">
                {feature.title}
              </h2>
              <p className="text-editorial-muted leading-relaxed text-sm">
                {feature.description}
              </p>
              <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 group-hover:text-brand-700 transition-colors">
                Get started
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer Note */}
      <footer className="text-center py-10 border-t border-editorial-border">
        <p className="text-sm text-editorial-muted">
          Built for{' '}
          <span className="font-medium text-editorial-text">
            This Week in AI
          </span>{' '}
          editorial team
        </p>
      </footer>
    </div>
  );
}
