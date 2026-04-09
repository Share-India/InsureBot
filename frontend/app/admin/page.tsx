'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, ShieldCheck, Users, MessageSquare, ArrowLeft, Clock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import MessageBubble from '@/components/chat/message-bubble'

// Define data types
interface UserData {
  id: string
  email: string
  name: string
  created_at: string
  last_sign_in_at?: string
}

interface ChatData {
  id: string
  user_id: string
  title: string
  created_at: string
}

interface MessageData {
  id: string
  chat_id: string
  role: 'user' | 'assistant' | 'model'
  content: string
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user: currentUser, loading: authLoading, signOut } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [chats, setChats] = useState<ChatData[]>([])
  const [messages, setMessages] = useState<MessageData[]>([])
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

  // Wait for auth to load before trying anything
  useEffect(() => {
    if (authLoading) return
    if (!currentUser?.id) {
       router.push('/')
    } else {
       fetchAdminData()
    }
  }, [currentUser?.id, authLoading, router])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/data')
      if (!res.ok) {
        throw new Error('Failed to fetch admin data. Ensure you have the right key.')
      }
      const data = await res.json()
      setUsers(data.users || [])
      setChats(data.chats || [])
      setMessages(data.messages || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Derived state for the UI
  const selectedUserChats = useMemo(() => {
    if (!selectedUserId) return []
    return chats.filter(c => c.user_id === selectedUserId)
  }, [chats, selectedUserId])

  const selectedChatMessages = useMemo(() => {
    if (!selectedChatId) return []
    return messages.filter(m => m.chat_id === selectedChatId)
  }, [messages, selectedChatId])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-500">
           <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
           <p className="font-medium">Loading Secure Admin Data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative w-full overflow-hidden">
      
      {/* Admin Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 shrink-0 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4 text-white">
          <Button variant="ghost" size="icon" onClick={async () => { await signOut(); router.push('/'); }} className="hover:bg-slate-800 text-slate-400 hover:text-white rounded-full">
            <LogOut className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide">InsureBot Admin Portal</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">System Overseer</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">Connected to Supabase</Badge>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden bg-white">
        
        {!selectedUserId ? (
          // TABLE VIEW
          <div className="flex-1 overflow-auto p-8">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold text-slate-800">User Management</h2>
               <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 shadow-none px-3 py-1">
                 {users.length} Total Users
               </Badge>
            </div>
            
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4">Last Active</th>
                    <th className="px-6 py-4 text-center">Sessions</th>
                    <th className="px-6 py-4 text-center">Messages</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                     <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">No users found</td></tr>
                  ) : users.map(u => {
                    const userChats = chats.filter(c => c.user_id === u.id)
                    const userMessagesCount = userChats.reduce((sum, chat) => sum + messages.filter(m => m.chat_id === chat.id).length, 0)
                    
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 w-[250px] max-w-[250px]">
                           <div className="flex items-center gap-3 w-full">
                              <Avatar className="h-8 w-8 border border-slate-200 bg-blue-50 group-hover:bg-blue-100 transition-colors shrink-0">
                                 <AvatarFallback className="text-xs text-blue-700 font-semibold bg-transparent">
                                   {(() => {
                                      const nameStr = u.name && u.name !== 'Anonymous' ? u.name : u.email.split('@')[0];
                                      const names = nameStr.split(' ').filter(Boolean);
                                      if (names.length > 1) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
                                      return names[0].charAt(0).toUpperCase();
                                   })()}
                                 </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-slate-700 truncate block w-full">{u.email}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium capitalize max-w-[150px] truncate">{u.name}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-500">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}</td>
                        <td className="px-6 py-4 text-center">
                           <Badge variant="secondary" className="bg-slate-100 text-slate-600 shadow-none font-medium">{userChats.length}</Badge>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500 font-medium">{userMessagesCount}</td>
                        <td className="px-6 py-4 text-right">
                           <Button size="sm" variant="outline" className="border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 shadow-none font-semibold transition-all" onClick={() => {
                              setSelectedUserId(u.id)
                              setSelectedChatId(null)
                           }}>
                              View Activity
                           </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // DETAIL VIEW (Chats + Transcript)
          <div className="flex flex-1 w-full relative">
            
            {/* Chats Column */}
            <div className="w-[350px] border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0 relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
               <div className="p-5 border-b border-slate-200 bg-white flex flex-col gap-4">
                 <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)} className="w-fit -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to All Users
                 </Button>
                 
                 <div>
                   <div className="flex items-center gap-2 mb-1">
                       <MessageSquare className="h-5 w-5 text-blue-500" />
                       <h2 className="text-lg font-bold text-slate-800">Chat History</h2>
                   </div>
                   <p className="text-xs text-slate-500 font-medium truncate">
                      Viewing <span className="text-slate-700">{users.find(u => u.id === selectedUserId)?.email}</span>
                   </p>
                 </div>
               </div>
               
               <ScrollArea className="flex-1 px-4 py-4">
                 {selectedUserChats.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 mt-24">
                     <MessageSquare className="h-10 w-10 opacity-20" />
                     <p className="text-sm font-medium">No chat sessions found.</p>
                   </div>
                 ) : (
                   <div className="flex flex-col gap-3 pb-8">
                     {selectedUserChats.map(chat => (
                       <Card 
                         key={chat.id}
                         onClick={() => setSelectedChatId(chat.id)}
                         className={`cursor-pointer transition-all border shadow-sm hover:shadow-md ${selectedChatId === chat.id ? 'border-blue-400 ring-1 ring-blue-200 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                       >
                         <CardHeader className="p-4 pb-3">
                           <CardTitle className="text-sm font-bold line-clamp-2 leading-relaxed text-slate-800 tracking-tight">{chat.title}</CardTitle>
                         </CardHeader>
                         <CardContent className="px-4 pb-4 pt-0">
                           <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="flex items-center gap-1.5 font-medium"><Clock className="h-3 w-3" /> {new Date(chat.created_at).toLocaleDateString()}</span>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-semibold shadow-none">
                                {messages.filter(m => m.chat_id === chat.id).length} msgs
                              </Badge>
                           </div>
                         </CardContent>
                       </Card>
                     ))}
                   </div>
                 )}
               </ScrollArea>
            </div>
            
            {/* Transcript Column */}
            <div className="flex-1 bg-white flex flex-col relative">
               {!selectedChatId ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50">
                     <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-6 border border-slate-200 shadow-inner">
                        <ShieldCheck className="h-10 w-10 text-slate-300" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-700 tracking-tight">Observation Deck</h3>
                     <p className="text-base text-slate-500 mt-3 text-center max-w-md leading-relaxed">
                       Select one of the chat sessions from the left panel to review the exact AI interaction and recommendations.
                     </p>
                  </div>
               ) : (
                 <>
                   <div className="h-16 border-b border-slate-100 flex items-center px-8 bg-white shrink-0 sticky top-0 z-10 shadow-sm justify-between">
                     <h2 className="text-sm font-bold text-slate-800 flex items-center gap-3 tracking-wide uppercase">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        Live Transcript View
                     </h2>
                   </div>
                   <ScrollArea className="flex-1 bg-slate-50/30">
                     <div className="max-w-4xl mx-auto py-10 px-8 space-y-6">
                        {selectedChatMessages.length === 0 ? (
                           <p className="text-center text-base text-slate-400 mt-10 font-medium">No messages found in this chat session.</p>
                        ) : (
                          selectedChatMessages.map((msg, idx) => (
                             <MessageBubble
                               key={idx}
                               role={msg.role === 'assistant' ? 'model' : 'user'}
                               content={msg.content}
                               isSpeaking={false}
                             />
                          ))
                        )}
                     </div>
                   </ScrollArea>
                 </>
               )}
            </div>
            
          </div>
        )}
      </div>
    </div>
  )
}
