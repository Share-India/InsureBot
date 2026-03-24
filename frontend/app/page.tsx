'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { toast } from 'sonner'
import { Shield, Sparkles, Brain, CheckCircle2, Mail, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function RegisterPage() {
  const [isRegistered, setIsRegistered] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      const isAdmin = user.email?.toLowerCase().includes('admin') || user.email?.toLowerCase() === 'abc12051004@gmail.com';
      router.push(isAdmin ? '/admin' : '/home')
    }
  }, [user, authLoading, router])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('') // Clear previous errors

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    // Immediately create the profile in public.profiles table so it shows up in the database!
    if (authData?.user) {
      const isAdmin = email.toLowerCase().includes('admin') || email.toLowerCase() === 'abc12051004@gmail.com';
      
      await supabase.from('profiles').insert({
        id: authData.user.id,
        email: email,
        role: isAdmin ? 'admin' : 'user',
        username: name || email.split('@')[0]
      }).select().single() // Fire and forget, or wait for it
    }

    toast.success('Successfully registered! Please check your email to verify your account.')
    setIsRegistered(true)
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Form */}
      <div className="flex w-full flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:w-1/2 xl:w-[45%] z-10 relative bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 mb-12">
               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                 <Shield className="h-6 w-6 text-primary" />
               </div>
               <span className="text-2xl font-bold tracking-tight text-slate-900">InsureBot</span>
            </div>

            <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-slate-900">
              Create an account
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </p>
          </motion.div>

          {isRegistered ? (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }} 
               transition={{ duration: 0.5, delay: 0.1 }}
               className="mt-10"
            >
              <div className="bg-white rounded-2xl border border-blue-100 p-8 shadow-xl shadow-blue-900/5 text-center flex flex-col items-center">
                <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50">
                   <Mail className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Check your inbox</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                  We've sent a verification link to <span className="font-semibold text-slate-700">{email}</span>. Please click the link to activate your account and start securing your future.
                </p>
                <Link href="/login" className="w-full">
                  <Button className="w-full py-6 rounded-xl text-base font-semibold group flex items-center justify-center gap-2 shadow-md">
                    Return to Login
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ duration: 0.5, delay: 0.1 }}
               className="mt-10"
            >
              <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm"
                />
                <p className="text-[11.5px] text-amber-600/90 font-medium leading-tight">
                  Please enter your email carefully. This cannot be changed later. To use a different email, you'll need to create a new account.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Must be at least 6 characters long.</p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full flex justify-center py-6 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/25 text-base font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 hover:-translate-y-0.5" 
                  disabled={loading}
                >
                  {loading ? 'Setting up your account...' : 'Create account'}
                </Button>
              </div>
            </form>
          </motion.div>
          )}
        </div>
      </div>

      {/* Right Panel - Branding/Visuals */}
      <div className="relative hidden w-0 flex-1 lg:block overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-primary to-slate-900 opacity-90" />
        
        {/* Dynamic Abstract Shapes */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl animate-blob" />
        <div className="absolute top-1/2 right-[-10%] w-[30rem] h-[30rem] rounded-full bg-purple-500/20 blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute -bottom-24 left-1/4 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl animate-blob animation-delay-4000" />

        <div className="relative h-full flex flex-col justify-center px-16 xl:px-24 max-w-4xl">
           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium border border-white/20 backdrop-blur-md mb-8">
                 <Sparkles className="h-4 w-4 text-blue-300" />
                 Smarter Insurance Decisions
              </div>
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.2] mb-6">
                Protect what matters most,<br /> powered by AI.
              </h1>
              <p className="text-lg text-blue-100/80 mb-12 max-w-xl leading-relaxed">
                Join thousands of users who trust InsureBot to analyze, compare, and recommend the best term life insurance plans tailored specifically to their lives.
              </p>

              <div className="space-y-5">
                 {[
                   "Hyper-Personalized Term Plan Recommendations",
                   "Unbiased Comparison from Top Indian Insurers",
                   "Real-time Data on Claim Settlement Ratios"
                 ].map((feature, idx) => (
                   <div key={idx} className="flex items-center gap-4 text-blue-50">
                     <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                        <CheckCircle2 className="h-4 w-4 text-blue-300" />
                     </div>
                     <span className="font-medium">{feature}</span>
                   </div>
                 ))}
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  )
}
