'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import Link from 'next/link'

interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: 'OWNER' | 'MANAGER' | 'DRIVER'
  organizationName?: string
  organizationId?: string
  phone?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: { role: 'OWNER' },
  })

  const watchRole = watch('role')
  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setErrorMessage(null)

    const { confirmPassword, ...registerData } = data

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      })

      const result = await response.json()

      if (!response.ok) {
        switch (result.code) {
          case 'EMAIL_EXISTS':
            setErrorMessage('This email is already registered. Please login instead.')
            break
          case 'ORG_NOT_FOUND':
            setErrorMessage('Organization not found. Please check the organization ID.')
            break
          case 'ORG_REQUIRED':
            setErrorMessage('Organization name is required for owner accounts.')
            break
          default:
            setErrorMessage(result.error || 'Registration failed. Please try again.')
        }
        return
      }

      if (typeof window !== 'undefined') {
        ;(window as any).accessToken = result.accessToken
      }

      router.push('/trucks')
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (hasError: boolean) =>
    `block w-full rounded-xl border px-4 py-2.5 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 ${
      hasError ? 'border-red-300 bg-danger-50' : 'border-slate-300 bg-white'
    }`

  return (
    <>
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-600">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </div>
        <span className="text-xl font-bold text-slate-900">FleetCommand</span>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
        <p className="mt-2 text-sm text-slate-500">
          Get started with FleetCommand in minutes.
        </p>
      </div>

      {errorMessage && (
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-danger-50 border border-red-200 px-4 py-3">
          <svg className="w-5 h-5 text-danger-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-danger-700">{errorMessage}</p>
        </div>
      )}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        {/* Role selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">I am a</label>
          <div className="grid grid-cols-3 gap-2">
            {(['OWNER', 'MANAGER', 'DRIVER'] as const).map((role) => (
              <label
                key={role}
                className={`flex items-center justify-center rounded-xl border-2 py-2 text-sm font-medium cursor-pointer transition-all ${
                  watchRole === role
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <input type="radio" value={role} className="sr-only" {...register('role')} />
                {role.charAt(0) + role.slice(1).toLowerCase()}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            className={inputClass(!!errors.name)}
            {...register('name', {
              required: 'Name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          {errors.name && <p className="mt-1.5 text-xs text-danger-500">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className={inputClass(!!errors.email)}
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />
          {errors.email && <p className="mt-1.5 text-xs text-danger-500">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
            Phone <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            className={inputClass(false)}
            {...register('phone')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="8+ characters"
              className={inputClass(!!errors.password)}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Min 8 characters' },
              })}
            />
            {errors.password && <p className="mt-1.5 text-xs text-danger-500">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">Confirm</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              className={inputClass(!!errors.confirmPassword)}
              {...register('confirmPassword', {
                required: 'Please confirm',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && <p className="mt-1.5 text-xs text-danger-500">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        {watchRole === 'OWNER' && (
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium text-slate-700 mb-1.5">
              Organization name
            </label>
            <input
              id="organizationName"
              type="text"
              placeholder="Acme Trucking Co."
              className={inputClass(!!errors.organizationName)}
              {...register('organizationName', {
                required: watchRole === 'OWNER' ? 'Organization name is required' : false,
                minLength: { value: 2, message: 'At least 2 characters' },
              })}
            />
            {errors.organizationName && <p className="mt-1.5 text-xs text-danger-500">{errors.organizationName.message}</p>}
          </div>
        )}

        {watchRole !== 'OWNER' && (
          <div>
            <label htmlFor="organizationId" className="block text-sm font-medium text-slate-700 mb-1.5">
              Organization ID
            </label>
            <input
              id="organizationId"
              type="text"
              placeholder="Ask your administrator"
              className={inputClass(!!errors.organizationId)}
              {...register('organizationId', {
                required: 'Organization ID is required',
              })}
            />
            {errors.organizationId && <p className="mt-1.5 text-xs text-danger-500">{errors.organizationId.message}</p>}
            <p className="mt-1 text-xs text-slate-400">Get this from your fleet owner or manager</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-500 transition-colors">
          Sign in
        </Link>
      </p>
    </>
  )
}
