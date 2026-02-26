/**
 * Register Page
 * Owner: AUTH-01
 * 
 * User registration form with validation and error handling
 */

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
    defaultValues: {
      role: 'OWNER',
    },
  })

  const watchRole = watch('role')
  const password = watch('password')

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setErrorMessage(null)

    // Remove confirmPassword before sending to API
    const { confirmPassword, ...registerData } = data

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle specific error codes
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

      // Store access token in memory (not localStorage)
      if (typeof window !== 'undefined') {
        ;(window as any).accessToken = result.accessToken
      }

      // Refresh token is already stored in httpOnly cookie by the server

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Registration error:', error)
      setErrorMessage('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold text-gray-900">
            FleetCommand
          </h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {errorMessage && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {errorMessage}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="John Doe"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                })}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Phone (Optional) */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
                {...register('phone')}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="••••••••"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="••••••••"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) => value === password || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="role"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                {...register('role', { required: 'Role is required' })}
              >
                <option value="OWNER">Owner</option>
                <option value="MANAGER">Manager</option>
                <option value="DRIVER">Driver</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
              )}
            </div>

            {/* Organization Name (for OWNER) */}
            {watchRole === 'OWNER' && (
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  id="organizationName"
                  type="text"
                  className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                    errors.organizationName ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Acme Trucking Co."
                  {...register('organizationName', {
                    required: watchRole === 'OWNER' ? 'Organization name is required' : false,
                    minLength: { value: 2, message: 'Organization name must be at least 2 characters' },
                  })}
                />
                {errors.organizationName && (
                  <p className="mt-1 text-sm text-red-600">{errors.organizationName.message}</p>
                )}
              </div>
            )}

            {/* Organization ID (for MANAGER/DRIVER) */}
            {watchRole !== 'OWNER' && (
              <div>
                <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700">
                  Organization ID
                </label>
                <input
                  id="organizationId"
                  type="text"
                  className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                    errors.organizationId ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Get this from your administrator"
                  {...register('organizationId', {
                    required: watchRole !== 'OWNER' ? 'Organization ID is required' : false,
                  })}
                />
                {errors.organizationId && (
                  <p className="mt-1 text-sm text-red-600">{errors.organizationId.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Ask your administrator for the organization ID
                </p>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
