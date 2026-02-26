/**
 * Auth Layout
 * Owner: AUTH-01
 * 
 * Layout for authentication pages (login, register)
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
