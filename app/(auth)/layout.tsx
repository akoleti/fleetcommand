'use client'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-500" />
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 800 800" fill="none">
            <circle cx="400" cy="400" r="300" stroke="white" strokeWidth="0.5" />
            <circle cx="400" cy="400" r="200" stroke="white" strokeWidth="0.5" />
            <circle cx="400" cy="400" r="100" stroke="white" strokeWidth="0.5" />
            <line x1="100" y1="400" x2="700" y2="400" stroke="white" strokeWidth="0.5" />
            <line x1="400" y1="100" x2="400" y2="700" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="relative z-10 px-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-8">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">FleetCommand</h1>
          <p className="mt-4 text-lg text-brand-100 max-w-sm mx-auto leading-relaxed">
            Real-time fleet tracking, driver management, and operational intelligence for modern trucking companies.
          </p>
          <div className="mt-10 flex items-center justify-center gap-8 text-brand-200 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Live</div>
              <div>GPS Tracking</div>
            </div>
            <div className="w-px h-8 bg-brand-400" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">12</div>
              <div>Alert Types</div>
            </div>
            <div className="w-px h-8 bg-brand-400" />
            <div className="text-center">
              <div className="text-2xl font-bold text-white">24/7</div>
              <div>Monitoring</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
