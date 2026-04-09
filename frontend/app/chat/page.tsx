'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { MessageCircle, Mic, Send, ArrowLeft, Volume2, VolumeX, Loader2, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useChatBot } from '@/hooks/use-chatbot'
import { useSpeech } from '@/hooks/use-speech'
import MessageBubble from '@/components/chat/message-bubble'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { LogOut, PanelLeftOpen } from 'lucide-react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { ChatSidebar } from '@/components/chat/sidebar'
import { supabase } from '@/lib/supabase'

export default function ChatPage() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user, loading: authLoading, signOut } = useAuth()

  const {
    messages,
    sendMessage,
    recommendations,
    loadingIndicator,
    currentChatId,
    loadChat,
    startNewChat,
    sidebarTrigger,
  } = useChatBot()

  const {
    speak,
    stopSpeaking,
    isSpeaking,
  } = useSpeech()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loadingIndicator])

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

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  const handleSendMessage = async () => {
    if (!input.trim()) return
    const userMessage = input.trim()
    setInput('')
    await sendMessage(userMessage)
  }

  const handleStartListening = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser')
      return
    }

    setIsListening(true)
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }
    recognition.start()
  }

  const handleSampleQuestion = async (question: string) => {
    setInput('')
    await sendMessage(question)
  }

  const renderInputArea = (variant: 'centered' | 'fixed') => (
    <motion.div
      layout
      initial={variant === 'centered' ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 20 }}
      animate={variant === 'centered' ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`
        relative group transition-all duration-300
        ${variant === 'centered'
          ? 'w-full max-w-2xl bg-white/70 backdrop-blur-xl p-2 rounded-[2rem] shadow-2xl shadow-blue-500/10 border border-white/60 flex items-end gap-2'
          : 'flex items-end gap-2 bg-white/80 backdrop-blur-xl p-2 rounded-[2rem] shadow-xl shadow-blue-500/10 border border-white/60'
        }
      `}
    >
      <Button
        size="icon"
        onClick={handleStartListening}
        className={`rounded-full h-10 w-10 shrink-0 transition-all duration-300 ${isListening ? 'bg-red-500 shadow-red-200 shadow-lg animate-pulse' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
      >
        <Mic className="h-5 w-5" />
      </Button>

      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
        placeholder="Ask me anything about insurance..."
        className="resize-none min-h-[44px] max-h-32 py-3 px-2 bg-transparent border-0 focus-visible:ring-0 text-base placeholder:text-slate-400"
      />

      <Button
        size="icon"
        onClick={handleSendMessage}
        disabled={!input.trim()}
        className={`rounded-full h-10 w-10 shrink-0 transition-all duration-500 ${input.trim() ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/40 rotate-0 scale-100 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:scale-105' : 'bg-slate-100 text-slate-300 scale-90'}`}
      >
        <Send className="h-5 w-5 ml-0.5" />
      </Button>
    </motion.div>
  )

  return (
    <SidebarProvider>
      <ChatSidebar 
        currentChatId={currentChatId} 
        onChatSelect={loadChat} 
        onNewChat={startNewChat}
        triggerUpdate={sidebarTrigger}
      />
      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden relative w-full transition-all duration-300">

        {/* Background Ambience */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-gradient-to-br from-blue-300/40 to-indigo-400/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-gradient-to-tr from-sky-300/40 to-purple-400/30 rounded-full blur-3xl opacity-60" />
        </div>

        {/* Floating Header */}
        <div className="sticky top-0 z-50 p-4">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full glass-panel rounded-full px-6 h-16 flex items-center justify-between shadow-sm border border-white/50 bg-white/80 backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-8 w-8 hover:bg-slate-100 text-slate-500 rounded-lg shrink-0 flex items-center justify-center p-0">
                  <PanelLeftOpen className="h-4 w-4" />
              </SidebarTrigger>
              <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">InsureBot</h1>
                <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Online
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              className="rounded-full transition-all text-slate-400 hover:bg-red-50 hover:text-red-500"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              className={`rounded-full transition-all ${isMuted ? 'text-slate-400 hover:bg-slate-100' : 'bg-blue-50 text-primary hover:bg-blue-100'}`}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-24 pb-4 scroll-smooth z-10 w-full">
        <div className="max-w-2xl mx-auto space-y-6">
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center min-h-[50vh] mt-10"
              >
                <div className="w-full max-w-2xl bg-white/70 backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 opacity-80" />
                  <div className="text-center space-y-8 relative z-10">
                    <div className="relative mx-auto h-20 w-20">
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-2xl rotate-6 animate-pulse opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center transform -rotate-6 hover:rotate-0 transition-all duration-300 hover:scale-105">
                        <MessageCircle className="h-10 w-10 text-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">Hello there! 👋</h2>
                      <p className="text-slate-500 text-lg leading-relaxed">I'm your personal insurance expert.<br />How can I protect your family today?</p>
                    </div>

                    {/* Flattened Input Area for Center Display */}
                    <div className="w-full pt-2">
                      {renderInputArea('centered')}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={idx}
                    role={msg.role as 'user' | 'model'}
                    content={msg.content}
                    onSpeak={() => !isMuted && speak(msg.content)}
                    isSpeaking={isSpeaking}
                    onStopSpeak={stopSpeaking}
                  />
                ))}

                {loadingIndicator && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white px-5 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-slate-500 font-medium">Thinking...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Area - Centered in flex-col */}
      <div className="px-4 pb-4 bg-transparent relative z-50">
        <div className="max-w-2xl mx-auto relative">
          <AnimatePresence mode="wait">
            {messages.length > 0 && (
              /* Input at bottom when active */
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10"
              >
                {renderInputArea('fixed')}
              </motion.div>
            )}
          </AnimatePresence>
          {/* Absolutely positioned disclaimer to prevent pushing up the input box */}
          <div className="absolute -bottom-6 left-0 w-full text-center">
            <p className="text-[10px] text-slate-400 font-medium">
              AI can make mistakes. Please check important info.
            </p>
          </div>
        </div>
      </div>
    </div>
    </SidebarProvider>
  )
}