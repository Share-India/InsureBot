'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from 'next/link'
import { useAuth } from "@/hooks/use-auth"
import { Plus, MessageSquare, Trash2, LogOut, User as UserIcon, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface ChatHistoryItem {
  id: string
  title: string
  created_at: string
}

interface ChatSidebarProps {
  currentChatId: string | null
  onChatSelect: (id: string) => void
  onNewChat: () => void
  triggerUpdate: number
}

export function ChatSidebar({ currentChatId, onChatSelect, onNewChat, triggerUpdate }: ChatSidebarProps) {
  const [chats, setChats] = useState<ChatHistoryItem[]>([])
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    async function fetchChats() {
      if (!user) return
      
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('id, title, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Failed to fetch chats from supabase:", error);
        } else if (data) {
          setChats(data);
        }
      } catch (err) {
        console.error("Error communicating with supabase for chats:", err);
      }
    }
    fetchChats()
  }, [user, triggerUpdate])

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation()
    try {
      const { error } = await supabase.from('chats').delete().eq('id', chatId);
      
      if (error) {
        toast.error("Failed to delete chat")
        console.error(error);
      } else {
        setChats(prev => prev.filter(c => c.id !== chatId))
        if (currentChatId === chatId) {
          onNewChat() // if we delete the active chat, reset to new chat
        }
        toast.success("Chat deleted")
      }
    } catch (err) {
      console.error("Error deleting chat via backend API:", err);
      toast.error("Failed to delete chat")
    }
  }

  return (
    <Sidebar variant="inset" className="border-r border-slate-200 bg-slate-50">
      <SidebarHeader className="p-4 border-b border-slate-100 flex flex-col gap-2 relative">
         <Link href="/home" className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors w-fit group">
             <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                 <div className="h-3 w-3 bg-blue-600 rounded-sm"></div>
             </div>
             <span className="font-bold text-slate-800 tracking-tight">InsureBot</span>
         </Link>
         <Button 
            onClick={onNewChat}
            variant="outline" 
            className="w-full justify-start gap-2 text-slate-600 bg-white hover:bg-slate-50 border-slate-200/60 shadow-sm mt-2"
          >
           <Plus className="h-4 w-4" />
           New Chat
         </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-4">Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu>
              <AnimatePresence>
                {chats.map((chat) => (
                  <motion.div
                     key={chat.id}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, height: 0 }}
                  >
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                        asChild 
                        isActive={currentChatId === chat.id}
                        className={`group relative overflow-hidden transition-all duration-200 ${currentChatId === chat.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:text-slate-900'} `}
                        onClick={() => onChatSelect(chat.id)}
                    >
                      <button className="flex w-full items-center justify-between text-left">
                        <div className="flex items-center gap-2 overflow-hidden px-1">
                           <MessageSquare className={`h-4 w-4 shrink-0 ${currentChatId === chat.id ? 'text-blue-500' : 'text-slate-400'}`} />
                           <span className="truncate text-sm pr-4 capitalize">{chat.title}</span>
                        </div>
                        <div 
                           className={`absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-200/50 rounded-md ${currentChatId === chat.id ? 'opacity-100' : ''}`}
                           onClick={(e) => deleteChat(e, chat.id)}
                        >
                           <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                        </div>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-slate-100 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-slate-100/80 hover:bg-slate-50 border border-transparent hover:border-slate-200/60 shadow-none hover:shadow-sm transition-all rounded-xl overflow-hidden py-3 h-auto group"
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.2)] flex items-center justify-center shrink-0 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all">
                        <span className="text-[14px] font-bold text-white tracking-wide z-10">
                          {(() => {
                            const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.user_name;
                            if (name) {
                              const names = name.split(' ').filter(Boolean);
                              if (names.length > 1) return (names[0][0] + names[names.length - 1][0]).toUpperCase();
                              return names[0].charAt(0).toUpperCase();
                            }
                            return 'U';
                          })()}
                        </span>
                    </div>
                    <div className="flex flex-col overflow-hidden text-left">
                      <span className="truncate text-base text-slate-900 font-bold tracking-tight leading-tight">
                          {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.user_name || user?.email?.split('@')[0]}
                      </span>
                      <span className="truncate text-xs text-slate-500 font-medium mt-0.5">
                          {user?.email}
                      </span>
                    </div>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 p-2 rounded-2xl border border-white/60 shadow-2xl bg-white/95 backdrop-blur-xl" align="start" side="top" sideOffset={12}>
                <DropdownMenuLabel className="font-normal px-3 py-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-base font-bold text-slate-900 tracking-tight leading-none">{user?.user_metadata?.full_name || 'User'}</p>
                    <p className="text-sm font-medium leading-none text-slate-500">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1.5 bg-slate-100" />
                
                {/* Admin Dashboard - Only show if current user is admin */}
                {(user?.email?.toLowerCase().includes('admin') || user?.email?.toLowerCase() === 'abc12051004@gmail.com') && (
                  <DropdownMenuItem className="cursor-pointer rounded-xl p-2 hover:bg-emerald-50 focus:bg-emerald-50 transition-all group outline-none flex items-center gap-3" onClick={() => router.push('/admin')}>
                    <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 group-hover:scale-105 transition-all">
                      <ShieldCheck className="h-[18px] w-[18px]" />
                    </div>
                    <div className="flex flex-col">
                       <span className="font-semibold text-emerald-700 group-hover:text-emerald-800 transition-colors">Admin Dashboard</span>
                       <span className="text-[11px] font-medium text-emerald-500">View Users & Transcripts</span>
                    </div>
                  </DropdownMenuItem>
                )}
                
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
                  await supabase.auth.signOut();
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
