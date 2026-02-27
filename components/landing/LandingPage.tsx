'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const features = [
  {
    title: 'Real-time fleet tracking',
    description: 'See every truck on the map. GPS pings every 30 seconds keep you updated on location, speed, and fuel level—so you always know where your fleet is.',
    icon: MapIcon,
    color: 'from-blue-500 to-cyan-500',
    delay: 0,
  },
  {
    title: 'Smart trip scheduling',
    description: 'Plan single or multi-stop trips in seconds. Our route optimizer finds the best order for pickups and drop-offs, saving time and fuel.',
    icon: RouteIcon,
    color: 'from-violet-500 to-purple-500',
    delay: 100,
  },
  {
    title: 'Driver & truck management',
    description: 'Manage your fleet roster and assign drivers to trucks. Track availability, license expiry, and performance—all in one place.',
    icon: FleetIcon,
    color: 'from-amber-500 to-orange-500',
    delay: 200,
  },
  {
    title: 'Fuel & maintenance tracking',
    description: 'Log every fill-up and service. Get fleet-wide fuel costs, per-truck breakdowns, and maintenance reminders before they become problems.',
    icon: FuelIcon,
    color: 'from-emerald-500 to-teal-500',
    delay: 300,
  },
  {
    title: 'Delivery proof capture',
    description: 'Drivers capture signatures, photos, and notes at delivery. Proofs sync automatically—no more lost paperwork or disputed deliveries.',
    icon: ProofIcon,
    color: 'from-rose-500 to-pink-500',
    delay: 400,
  },
  {
    title: 'Alerts & reports',
    description: 'Get notified when trucks idle too long, insurance expires, or maintenance is due. Generate PDF reports for fleet overview, fuel, and compliance.',
    icon: AlertIcon,
    color: 'from-indigo-500 to-blue-500',
    delay: 500,
  },
]

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}

function RouteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  )
}

function FleetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  )
}

function FuelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    </svg>
  )
}

function ProofIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  )
}

function useInView(threshold = 0.1) {
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => setInView(e.isIntersecting),
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, inView }
}

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0]
  index: number
}) {
  const { ref, inView } = useInView(0.15)
  const Icon = feature.icon

  return (
    <div
      ref={ref}
      className={`
        group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm
        transition-all duration-700 ease-out
        ${inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}
      style={{ transitionDelay: `${feature.delay}ms` }}
    >
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${feature.color} opacity-10 blur-2xl transition-transform duration-500 group-hover:scale-150`} />
      <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}>
        <Icon className="h-7 w-7 text-white" />
      </div>
      <h3 className="relative mt-6 text-xl font-semibold text-slate-900">
        {feature.title}
      </h3>
      <p className="relative mt-3 text-slate-600 leading-relaxed">
        {feature.description}
      </p>
    </div>
  )
}

function DashboardMockup() {
  return (
    <div className="relative mx-auto max-w-2xl">
      {/* Browser chrome */}
      <div className="rounded-t-xl border border-slate-600/50 bg-slate-800/80 px-4 py-3">
        <div className="flex gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        </div>
      </div>
      {/* Dashboard content */}
      <div className="rounded-b-xl border border-t-0 border-slate-600/50 bg-slate-900/90 p-6 shadow-2xl">
        {/* Stats row */}
        <div className="flex gap-3 mb-4">
          {[
            { label: 'Trucks', value: '24', color: 'bg-blue-500/20 text-blue-400' },
            { label: 'Active', value: '18', color: 'bg-emerald-500/20 text-emerald-400' },
            { label: 'Trips today', value: '12', color: 'bg-violet-500/20 text-violet-400' },
          ].map((s, i) => (
            <div key={s.label} className="flex-1 rounded-lg bg-slate-800/80 px-4 py-3" style={{ animationDelay: `${i * 100}ms` }}>
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
        {/* Map area */}
        <div className="relative h-40 rounded-lg bg-slate-800/60 overflow-hidden">
          {/* Grid lines */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(8)].map((_, i) => (
              <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-slate-500" style={{ top: `${(i + 1) * 20}%` }} />
            ))}
            {[...Array(6)].map((_, i) => (
              <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-slate-500" style={{ left: `${(i + 1) * 16}%` }} />
            ))}
          </div>
          {/* Truck markers */}
          {[
            { x: '15%', y: '25%', status: 'moving' },
            { x: '45%', y: '60%', status: 'idle' },
            { x: '75%', y: '35%', status: 'moving' },
          ].map((t, i) => (
            <div
              key={i}
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg animate-pulse"
              style={{
                left: t.x,
                top: t.y,
                backgroundColor: t.status === 'moving' ? '#22c55e' : '#f59e0b',
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
          {/* Route line */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path
              d="M 50 80 Q 120 40 180 60"
              fill="none"
              stroke="rgba(99, 102, 241, 0.5)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
          </svg>
        </div>
        <p className="mt-3 text-xs text-slate-500">Live map · 3 trucks on route</p>
      </div>
    </div>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">FleetCommand</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.3),transparent)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Real-time fleet management
            </div>
            <h1 className="animate-fade-in-up text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl" style={{ animationDelay: '0.1s' }}>
              Your fleet,
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-cyan-300 bg-clip-text text-transparent">
                one command center
              </span>
            </h1>
            <p className="animate-fade-in-up mt-6 max-w-2xl text-lg text-slate-300 sm:text-xl" style={{ animationDelay: '0.2s' }}>
              Track trucks in real time, schedule trips, manage drivers, and capture delivery proof—all from a single dashboard built for trucking companies.
            </p>
            <div className="animate-fade-in-up mt-10 flex flex-wrap items-center justify-center gap-4" style={{ animationDelay: '0.3s' }}>
              <Link
                href="/register"
                className="rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-slate-900 shadow-lg hover:bg-slate-100 transition-colors"
              >
                Start free trial
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/30 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>
          <div className="mt-16 sm:mt-24">
            <div className="animate-float-slow">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to run your fleet
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
              From GPS tracking to delivery proof—FleetCommand brings your operations into one place.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works - simple 3 steps */}
      <section className="border-t border-slate-200 bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
              Get started in three simple steps.
            </p>
          </div>
          <div className="mt-16 grid gap-12 sm:grid-cols-3">
            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 text-2xl font-bold">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Add your fleet</h3>
              <p className="mt-2 text-slate-600">
                Register trucks and drivers. Connect GPS trackers or use manual location updates.
              </p>
            </div>
            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 text-2xl font-bold">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Schedule trips</h3>
              <p className="mt-2 text-slate-600">
                Create trips, assign drivers, and let the route optimizer plan multi-stop deliveries.
              </p>
            </div>
            <div className="relative text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 text-2xl font-bold">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">Track & prove</h3>
              <p className="mt-2 text-slate-600">
                Monitor live locations, get alerts, and capture delivery proof with signatures and photos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-16 sm:px-12 sm:py-20 shadow-xl">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Ready to take command?
            </h2>
            <p className="mt-4 text-lg text-brand-100">
              Join trucking companies that run their fleet with FleetCommand.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-brand-600 shadow-lg hover:bg-brand-50 transition-colors"
              >
                Create free account
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/40 px-6 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <span className="font-bold text-slate-900">FleetCommand</span>
            </Link>
            <p className="text-sm text-slate-500">
              Real-time fleet management for trucking companies.
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}
