'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { User, Mail, ArrowLeft, Loader2, Sparkles, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProfilePage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    async function loadProfile() {
      if (authLoading) return // Wait until auth checks are done
      
      if (!user) {
        router.push('/')
        return
      }

      setEmail(user.email || '')
      setPhone(user.phone || '')

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (data) {
        setUsername(data.username || '')
      } else if (error) {
        console.error("Error loading profile:", error)
      }
      setFetching(false)
    }

    loadProfile()
  }, [user, authLoading, router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    const { error: dbError } = await supabase
      .from('profiles')
      .update({ username: username })
      .eq('id', user.id)

    // Update Auth JWT to instantly trigger UI reactivity across the app
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: username }
    })

    if (dbError || authError) {
      toast.error('Failed to update profile. Please try again.')
      console.error(dbError || authError)
    } else {
      toast.success('Profile updated successfully! 🎉')
      router.push('/home')
      router.refresh()
    }
    
    setLoading(false)
  }

  if (fetching) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex items-center justify-center">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100 rounded-full blur-3xl opacity-60" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full blur-3xl opacity-60" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full relative z-10"
      >
        <button 
          onClick={() => router.push('/home')}
          className="flex items-center text-slate-500 hover:text-blue-600 mb-8 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/50 relative overflow-hidden">
          {/* Decorative Top Accent */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600" />
          
          <div className="text-center mb-10">
            <div className="mx-auto h-20 w-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center mb-6 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
              <User className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              Edit Profile
            </h1>
            <p className="text-slate-500 text-sm">
              Manage your personal details and account settings.
            </p>
          </div>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="space-y-4">
              {/* Full Name Field */}
              <div className="relative group">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/50 backdrop-blur-sm transition-all outline-none"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email Address Field (Disabled) */}
              <div className="relative group">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative opacity-60 cursor-not-allowed">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Email addresses are secured and cannot be changed here.
                </p>
              </div>

              {/* Phone Number Field (Disabled) */}
              <div className="relative group">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="relative opacity-60 cursor-not-allowed">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold font-mono">#</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    disabled
                    placeholder="No phone number linked"
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    {phone ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : null}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Phone numbers are secured by SMS authentication and cannot be changed manually.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 font-semibold text-lg relative group overflow-hidden border-0"
            >
              <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 transform origin-left transition-transform duration-500 ease-out" />
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  Save Changes
                  <Sparkles className="ml-2 h-5 w-5 opacity-70" />
                </div>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
