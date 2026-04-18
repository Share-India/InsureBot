'use client';

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Shield, KeyRound, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleManualSession = async () => {
      // Handle the Implicit Grant Flow (old standard or PKCE disabled)
      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const access_token = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
          setTimeout(() => {
            router.replace(window.location.pathname) // Clean url via Next.js router instead of raw window
          }, 100)
          return
        }
      }

      // Handle the PKCE Flow (new standard for Supabase)
      if (typeof window !== 'undefined' && window.location.search) {
        const queryParams = new URLSearchParams(window.location.search)
        const code = queryParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
          setTimeout(() => {
            router.replace(window.location.pathname)
          }, 100)
          return
        }
      }
    }

    handleManualSession()
  }, [router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    try {
      // Proactively check session to provide a better error experience if they reload or lose it.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setErrorMsg('Security token expired or missing. Please request a new password reset email.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      })
      
      if (error) throw error
      
      setIsSuccess(true)
      // Soft redirect after a few seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
      
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to update password. Your reset link might have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/20 blur-[120px]" />
        <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/20 blur-[100px]" />
      </div>

      <div className="flex w-full items-center justify-center p-4 z-10">
        <div className="w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
              <div className="flex flex-col items-center mb-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                  <KeyRound className="h-7 w-7 text-emerald-600" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Create New Password
                </h2>
                <p className="text-slate-500 text-sm md:text-base">
                  Your identity has been verified. Please enter a strong new password below.
                </p>
              </div>

              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="bg-emerald-50/50 rounded-2xl border border-emerald-100 p-6 text-center shadow-inner"
                >
                  <div className="mx-auto h-12 w-12 bg-white text-emerald-600 rounded-full flex items-center justify-center mb-4 ring-4 ring-emerald-50/50 shadow-sm">
                     <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Password Updated!</h3>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    Your password has been successfully changed. Redirecting you to the login screen...
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleUpdate} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="password">
                      New Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full appearance-none bg-white rounded-xl border border-slate-200 px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="confirm">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full appearance-none bg-white rounded-xl border border-slate-200 px-4 py-3.5 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm shadow-sm"
                    />
                  </div>

                  {errorMsg && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3.5 rounded-xl bg-red-50/80 border border-red-200/50 text-sm text-red-600 font-medium text-center">
                      {errorMsg}
                    </motion.div>
                  )}

                  <div className="pt-2">
                    <Button 
                      type="submit" 
                      className="w-full flex justify-center py-6 border border-transparent rounded-xl shadow-lg shadow-emerald-500/25 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300 hover:-translate-y-0.5" 
                      disabled={loading || !password || !confirmPassword}
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
