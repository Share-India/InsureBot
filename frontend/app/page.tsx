'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { toast } from 'sonner'
import { Shield, Sparkles, Brain, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user && user.email) {
      const checkAndCreateRole = async () => {
        // Use maybeSingle to safely check existence without throwing error
        const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        
        let finalRole = currentProfile?.role

        // Lazy creation if profile doesn't exist (e.g. they just finished Email Verification)
        if (!currentProfile) {
          const userEmail = user.email || '';
          const isAdmin = userEmail.toLowerCase().includes('admin') || userEmail.toLowerCase() === 'abc12051004@gmail.com';
          finalRole = isAdmin ? 'admin' : 'user'
          
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            role: finalRole,
            username: user.user_metadata?.username || '',
            fullname: user.user_metadata?.full_name || '',
            phone_no: user.phone || ''
          })
        }

        router.push(finalRole === 'admin' ? '/admin' : '/home')
      }
      checkAndCreateRole()
    }
  }, [user, authLoading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('') // Clear previous errors

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    if (authData?.user) {
      // Just check the database directly instead of rewriting it
      const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle()
      
      let finalRole = currentProfile?.role

      if (!currentProfile) {
        const isAdmin = email.toLowerCase().includes('admin') || email.toLowerCase() === 'abc12051004@gmail.com';
        finalRole = isAdmin ? 'admin' : 'user'
        
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email: email,
          role: finalRole,
          username: authData.user.user_metadata?.username || '',
          fullname: authData.user.user_metadata?.full_name || '',
          phone_no: authData.user.phone || ''
        })
      }
      
      toast.success('Successfully logged in!')
      router.push(finalRole === 'admin' ? '/admin' : '/home')
      router.refresh()
    }
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
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                Sign up for free
              </Link>
            </p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }} 
             animate={{ opacity: 1, y: 0 }} 
             transition={{ duration: 0.5, delay: 0.1 }}
             className="mt-10"
          >
            <form onSubmit={handleLogin} className="space-y-5">
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
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                    Password
                  </label>
                  <Link href="/forgot-password" className="font-semibold text-sm text-primary hover:text-primary/80 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm"
                />
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
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>
          </motion.div>
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
