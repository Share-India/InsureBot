"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Shield, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const cleanEmail = email.trim()
      // Verify that the email is actually a registered user in our database via Server Proxy
      const verifyRes = await fetch('/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      })
      const verifyData = await verifyRes.json()

      if (!verifyRes.ok || !verifyData.exists) {
        setErrorMsg('We could not find an account with that email. Please enter your registered email ID.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      })
      if (error) throw error
      setIsSuccess(true)
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[100px]" />
      </div>

      <div className="flex w-full items-center justify-center p-4 z-10">
        <div className="w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
              <div className="flex flex-col items-center mb-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-2">
                  Reset Password
                </h2>
                <p className="text-slate-500 text-sm md:text-base">
                  Enter your email address to receive a secure password reset link.
                </p>
              </div>

              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6 text-center shadow-inner"
                >
                  <div className="mx-auto h-12 w-12 bg-white text-blue-600 rounded-full flex items-center justify-center mb-4 ring-4 ring-blue-50/50 shadow-sm">
                     <Mail className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Check your email</h3>
                  <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    We've sent a password reset link to <span className="font-semibold text-slate-900">{email}</span>. Let's get you back on track!
                  </p>
                  <Link href="/" className="w-full">
                    <Button variant="outline" className="w-full py-5 rounded-xl text-sm font-semibold border-slate-200">
                      Return to Sign in
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <form onSubmit={handleResetRequest} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 ml-1" htmlFor="email">
                      Registered Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      className="w-full flex justify-center py-6 border border-transparent rounded-xl shadow-lg shadow-primary/25 text-base font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 hover:-translate-y-0.5" 
                      disabled={loading || !email}
                    >
                      {loading ? 'Sending link...' : 'Send Reset Link'}
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div className="mt-8 text-center">
              <Link href="/" className="inline-flex items-center justify-center text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back to Sign in
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
