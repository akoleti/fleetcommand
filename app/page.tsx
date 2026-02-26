/**
 * Root page — redirects to login
 * Owner: AUTH-01 / ORCH-01
 */

import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/dashboard')
}
