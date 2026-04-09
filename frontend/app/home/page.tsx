'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Brain, BarChart3, ChevronRight, Phone, User as UserIcon, LogOut, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/')
      } else {
        const checkAdmin = async () => {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
          const isAdmin = profile?.role === 'admin'
          if (isAdmin) {
            router.push('/admin')
          }
        }
        checkAdmin()
      }
    }
  }, [user?.id, authLoading, router])

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-hidden relative selection:bg-primary selection:text-white">

      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-gradient-to-br from-blue-300/40 to-indigo-400/30 rounded-full blur-3xl opacity-60 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-gradient-to-tr from-sky-300/40 to-purple-400/30 rounded-full blur-3xl opacity-60" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full">
        <nav className="w-full h-20 flex items-center justify-between px-8 shadow-sm border-b border-white/50 bg-white/70 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Image
              src="/share_india_logo_new.png"
              alt="Share India Logo"
              width={140}
              height={60}
              className="h-[42px] w-auto object-contain"
              priority
            />
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-lg font-medium text-slate-800 tracking-tight">
              <Phone className="h-5 w-5 text-red-600 fill-current" />
              <span>Contact Us - <span className="font-extrabold text-slate-900">1800 210 2022</span></span>
            </div>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-11 w-11 rounded-full overflow-hidden border-[3px] border-white shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:border-blue-50 outline-none ring-offset-2 ring-offset-white focus:ring-2 focus:ring-blue-500 p-0 bg-transparent flex items-center justify-center cursor-pointer group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                    <Avatar className="h-full w-full pointer-events-none relative z-10 bg-transparent flex items-center justify-center">
                      <AvatarFallback className="bg-transparent text-white font-bold text-[15px] tracking-wide">
                        {(() => {
                          const name = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.user_name;
                          if (name) {
                            const names = name.split(' ').filter(Boolean);
                            if (names.length > 1) {
                              return (names[0][0] + names[names.length - 1][0]).toUpperCase();
                            }
                            return names[0].charAt(0).toUpperCase();
                          }
                          return <UserIcon className="h-5 w-5 text-white" />;
                        })()}
                      </AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-72 p-2 rounded-2xl border border-white/60 shadow-2xl bg-white/95 backdrop-blur-xl" align="end" sideOffset={12}>
                  <DropdownMenuLabel className="font-normal px-3 py-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-base font-bold text-slate-900 tracking-tight leading-none">{user.user_metadata?.full_name || 'User'}</p>
                      <p className="text-sm font-medium leading-none text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1.5 bg-slate-100" />
                  <DropdownMenuItem className="cursor-pointer rounded-xl p-2 hover:bg-slate-50 focus:bg-slate-50 transition-all group outline-none flex items-center gap-3" onClick={() => router.push('/profile')}>
                    <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 group-hover:scale-105 transition-all">
                      <UserIcon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex flex-col">
                       <span className="font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">Edit Profile</span>
                       <span className="text-[11px] font-medium text-slate-400">Manage your details</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-slate-100" />
                  <DropdownMenuItem className="cursor-pointer rounded-xl p-2 hover:bg-red-50 focus:bg-red-50 transition-all group outline-none flex items-center gap-3" onClick={async () => {
                    await signOut();
                    router.push('/');
                  }}>
                    <div className="h-9 w-9 rounded-full bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-100 group-hover:scale-105 transition-all">
                      <LogOut className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex flex-col">
                       <span className="font-semibold text-red-600 group-hover:text-red-700 transition-colors">Log out</span>
                       <span className="text-[11px] font-medium text-red-400">Securely sign out</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-4xl mx-auto text-center space-y-10"
        >
          <motion.div variants={fadeIn} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/50 text-blue-700 text-sm font-medium border border-blue-200 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              AI-Powered Insurance Advisor
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(to right, #0ea5e9, #3b82f6, #8b5cf6, #e11d48)'
                }}
              >
                InsureBot
              </span>
            </h1>

            <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Get personalized term life insurance recommendations in minutes.
              No spam, just data-driven advice tailored to your life.
            </p>
          </motion.div>

          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center pt-4 relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-300 w-fit mx-auto scale-95 group-hover:scale-105" />
            <Button
              onClick={() => router.push('/chat')}
              size="lg"
              className="relative h-14 px-8 rounded-full text-lg shadow-blue-500/25 shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 z-10 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
            >
              <span className="flex items-center">
                Talk to InsureBot
                <Sparkles className="ml-2 h-5 w-5 opacity-90 animate-pulse" />
              </span>
            </Button>
          </motion.div>

          {/* Features Grid */}
          <motion.div variants={fadeIn} className="grid md:grid-cols-3 gap-6 pt-16 text-left">
            {[
              {
                icon: <Brain className="h-6 w-6 text-indigo-600" />,
                title: "AI Expert Advisor",
                desc: "Conversational AI that understands your specific needs instantly.",
                bg: "bg-indigo-50"
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-blue-600" />,
                title: "Data-Driven Plans",
                desc: "Recommendations based on age, income, liabilities, and lifestyle.",
                bg: "bg-blue-50"
              },
              {
                icon: <Shield className="h-6 w-6 text-sky-600" />,
                title: "Trusted Insurers",
                desc: "Compare plans from India's top companies with verified CSR data.",
                bg: "bg-sky-50"
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="group p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 pointer-events-none" />
                <div className="relative z-10">
                  <div className={`h-12 w-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm border border-white/50`}>
                    {feature.icon}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm py-8 mt-auto">
        <div className="flex flex-col md:flex-row items-center justify-between px-8 max-w-7xl mx-auto">
          <p className="text-sm text-slate-500 font-medium">
            © 2025 Share India Insurance & Brokers. All rights reserved.
          </p>
          <div className="flex items-center gap-6 mt-4 md:mt-0">
            <p className="text-xs text-slate-400">
              Powered by Gemini AI • Indicative Recommendations
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}