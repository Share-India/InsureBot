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
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    // Only redirect if the user is fully logged in and has an email registered to prevent kicking Phone-verified partial accounts
    if (!authLoading && user && user.email) {
      const checkRole = async () => {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        const isAdmin = data?.role === 'admin'
        router.push(isAdmin ? '/admin' : '/home')
      }
      checkRole()
    }
  }, [user, authLoading, router])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  const handleSendOtp = async () => {
    if (!phone) {
      setErrorMsg("Please enter a phone number first.")
      return
    }
    setLoading(true)
    setErrorMsg('')
    const fullPhone = `${countryCode}${phone.replace(/\s+/g, '')}`
    
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: fullPhone
    })

    if (error) {
      setErrorMsg(error.message.includes("registered") ? "This phone number is already registered." : error.message)
      setLoading(false)
      return
    }
    
    toast.success('SMS verification code sent!')
    setIsOtpSent(true)
    setResendTimer(30)
    setLoading(false)
  }

  const handleVerifyOtp = async () => {
    if (otp.length < 6) return
    setLoading(true)
    setErrorMsg('')
    const fullPhone = `${countryCode}${phone.replace(/\s+/g, '')}`

    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: 'sms'
    })

    if (error || !data?.session) {
      setErrorMsg(error?.message || "Invalid OTP code.")
      setLoading(false)
      return
    }

    toast.success('Phone verified successfully!')
    setIsPhoneVerified(true)
    setIsOtpSent(false)
    setLoading(false)
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPhoneVerified) {
       setErrorMsg("Please verify your phone number first.")
       return
    }
    setLoading(true)
    setErrorMsg('')

    try {
      const verifyRes = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      const verifyData = await verifyRes.json()
      
      if (verifyData.exists) {
        setErrorMsg('Username is already taken. Please choose a different one.')
        setLoading(false)
        return
      }
    } catch (e) {
      console.error("Failed to verify username:", e)
    }

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      email,
      password,
      data: {
        full_name: name,
        username: username,
      }
    })

    if (updateError) {
      setErrorMsg(updateError.message)
      setLoading(false)
      return
    }

    if (updateData?.user) {
      // Profile creation is now deferred until the user logs in after email verification
    }

    toast.success('Account setup complete! Please check your email.')
    setIsRegistered(true)
    setLoading(false)
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
              <Link href="/" className="font-semibold text-primary hover:text-primary/80 transition-colors">
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
                <Button 
                  className="w-full py-6 rounded-xl text-base font-semibold group flex items-center justify-center gap-2 shadow-md"
                  onClick={async () => {
                    await supabase.auth.signOut()
                    router.push('/')
                  }}
                >
                  Return to Login
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }} 
               transition={{ duration: 0.5, delay: 0.1 }}
               className="mt-10"
            >
              <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="insure_pro"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="block w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm"
                />
              </div>

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
                <label className="text-sm font-semibold text-slate-700" htmlFor="phone">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={isPhoneVerified}
                    className="appearance-none rounded-xl border border-slate-300 px-3 py-3 text-slate-900 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm bg-white text-center cursor-pointer disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="+91">🇮🇳 +91 (IN)</option>
                    <option value="+1">🇺🇸 +1 (US/CA)</option>
                    <option value="+44">🇬🇧 +44 (UK)</option>
                    <option value="+61">🇦🇺 +61 (AU)</option>
                    <option value="+81">🇯🇵 +81 (JP)</option>
                    <option value="+49">🇩🇪 +49 (DE)</option>
                    <option value="+33">🇫🇷 +33 (FR)</option>
                    <option value="+39">🇮🇹 +39 (IT)</option>
                    <option value="+34">🇪🇸 +34 (ES)</option>
                    <option value="+55">🇧🇷 +55 (BR)</option>
                    <option value="+52">🇲🇽 +52 (MX)</option>
                    <option value="+27">🇿🇦 +27 (ZA)</option>
                    <option value="+971">🇦🇪 +971 (AE)</option>
                    <option value="+65">🇸🇬 +65 (SG)</option>
                    <option value="+86">🇨🇳 +86 (CN)</option>
                  </select>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="98765 43210"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isPhoneVerified}
                    className="block w-full appearance-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all sm:text-sm flex-1 disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  {!isPhoneVerified ? (
                    <Button 
                      type="button" 
                      onClick={handleSendOtp} 
                      disabled={loading || isOtpSent || !phone} 
                      variant="outline"
                      className="shrink-0 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {isOtpSent ? 'Sent!' : 'Verify'}
                    </Button>
                  ) : (
                    <div className="flex items-center justify-center px-4 bg-green-50 text-green-600 rounded-xl border border-green-200 shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>

              {isOtpSent && !isPhoneVerified && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                   <div className="flex items-center justify-between mb-2">
                     <label className="text-xs font-semibold text-indigo-900 block">Enter 6-digit SMS Code</label>
                     {resendTimer > 0 ? (
                       <span className="text-xs text-indigo-500 font-medium">Resend in {resendTimer}s</span>
                     ) : (
                       <button type="button" onClick={handleSendOtp} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">Resend Code</button>
                     )}
                   </div>
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       maxLength={6} 
                       value={otp} 
                       onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} 
                       className="block w-full text-center tracking-[0.5em] font-bold appearance-none rounded-xl border border-indigo-200 px-4 py-2 text-indigo-900 focus:border-indigo-500 focus:outline-none bg-white" 
                     />
                     <Button type="button" onClick={handleVerifyOtp} disabled={loading || otp.length < 6} className="shrink-0 bg-primary hover:bg-primary/90">Submit</Button>
                   </div>
                </motion.div>
              )}

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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                    Password
                  </label>
                </div>
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
                  className={`w-full flex justify-center py-6 px-4 border border-transparent rounded-xl shadow-lg text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${!isPhoneVerified ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500' : 'bg-primary hover:bg-primary/90 shadow-primary/25 hover:-translate-y-0.5 focus:ring-primary'}`}
                  disabled={loading || !isPhoneVerified}
                >
                  {!isPhoneVerified ? 'Verify phone to continue' : loading ? 'Creating account...' : 'Create Account'}
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
