'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { handleAuthResponse } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  phone: string | null
  organizationId: string
  organization: { id: string; name: string }
}

const getHeaders = () => {
  const token = localStorage.getItem('accessToken')
  return { Authorization: `Bearer ${token}` }
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security'>('profile')

  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
    if (hash === 'notifications') setActiveSection('notifications')
    else if (hash === 'security') setActiveSection('security')
  }, [])

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getHeaders() })
      if (!handleAuthResponse(res)) return
      if (!res.ok) throw new Error('Failed to fetch user')
      const data = await res.json()
      setUser(data)
    } catch {
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)
    setProfileSaving(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })
      if (!handleAuthResponse(res)) return
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')
      setUser(data)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    setPasswordSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      })
      if (!handleAuthResponse(res)) return
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      setPasswordSuccess(true)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <span className="text-sm text-slate-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  const navItems = [
    { id: 'profile' as const, label: 'Profile', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
    { id: 'notifications' as const, label: 'Notification settings', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
    { id: 'security' as const, label: 'Security', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.649-.6-3.849a11.96 11.96 0 01-2.4 2.4' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar nav */}
        <nav className="lg:w-56 shrink-0">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </button>
            ))}
            <div className="border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Log out
              </button>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
            {activeSection === 'profile' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Profile</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
                  {profileError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {profileError}
                    </div>
                  )}
                  {profileSuccess && (
                    <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                      Profile updated successfully.
                    </div>
                  )}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input
                      id="name"
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      id="phone"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="pt-2 text-sm text-slate-500">
                    <span className="font-medium">Role:</span> {user.role.toLowerCase()}
                    <span className="mx-2">·</span>
                    <span className="font-medium">Organization:</span> {user.organization.name}
                  </div>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {profileSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </form>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Notification settings</h2>
                <p className="text-sm text-slate-500">Configure how you receive alerts and notifications.</p>
                <div className="mt-6 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Email alerts for critical fleet events</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Push notifications for maintenance due</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">Weekly summary report</span>
                  </label>
                </div>
                <p className="mt-4 text-xs text-slate-400">Changes are saved automatically.</p>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Security</h2>
                <p className="text-sm text-slate-500 mb-6">Change your password. Use at least 8 characters.</p>
                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                  {passwordError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {passwordError}
                    </div>
                  )}
                  {passwordSuccess && (
                    <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                      Password updated successfully.
                    </div>
                  )}
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 mb-1">Current password</label>
                    <input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">New password</label>
                    <input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <p className="mt-1 text-xs text-slate-500">At least 8 characters</p>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">Confirm new password</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                      className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {passwordSaving ? 'Updating...' : 'Change password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
