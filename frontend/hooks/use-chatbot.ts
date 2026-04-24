'use client';

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from './use-auth'

export interface Message {
  id?: string
  role: 'user' | 'model' | 'assistant'
  content: string
}

export interface Recommendation {
  company: string
  product_name: string
  premium_estimate: number
  csr: number
  score: number
  usp: string
}

export function useChatBot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [loadingIndicator, setLoadingIndicator] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [sidebarTrigger, setSidebarTrigger] = useState(0) // Used to trigger sidebar reload
  const { user } = useAuth()

  // Load a chat when a chat ID is selected
  const loadChat = useCallback(async (chatId: string) => {
    if (!user) return
    setLoadingIndicator(true)
    setCurrentChatId(chatId)

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error('Supabase returned ' + error.message);
      }
      
      setMessages(data.map((msg: any) => ({
        id: msg.id,
        role: msg.role === 'assistant' ? 'model' : 'user', // Match backend/UI expectations
        content: msg.content
      })));
      setRecommendations(null); // Reset recommendations for old chats by default
    } catch (error) {
      toast.error('Failed to load chat history');
      console.error("Error loading chat:", error);
    }
    setLoadingIndicator(false);
  }, [user])

  // Clear current chat to start a new one
  const startNewChat = useCallback(() => {
    setCurrentChatId(null)
    setMessages([])
    setRecommendations(null)
  }, [])

  const sendMessage = useCallback(async (userContent: string) => {
    if (!userContent.trim() || !user) return

    const newUserMessage: Message = { role: 'user', content: userContent }
    setMessages((prev) => [...prev, newUserMessage])
    setLoadingIndicator(true)

      try {
      // 0. Ensure Profile exists (Foreign Key requirement for chats)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        console.log('Profile missing, creating one...')
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.user_name;
        const { error: insertProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'user',
            username: name || user.email?.split('@')[0]
          })
        if (insertProfileError) {
          console.log('Failed to create profile, perhaps already exists or RLS blocked this:', insertProfileError)
          // Continue anyway
        }
      }

      const { data: sessionData } = await supabase.auth.getSession()
      
      let activeChatId = currentChatId;
      
      try {
        // Native Supabase insert: Chat creation bypasses backend RLS issues
        if (!activeChatId) {
          const chatTitle = userContent.trim().substring(0, 40) + '...';
          const { data: chatData, error: chatError } = await supabase.from('chats').insert({
            user_id: user.id,
            title: chatTitle
          }).select('id').single();
          
          if (chatError) throw chatError;
          if (chatData) {
            activeChatId = chatData.id;
            setCurrentChatId(activeChatId);
            setSidebarTrigger(prev => prev + 1);
          }
        }
        
        // Native Supabase insert: User Message
        if (activeChatId) {
          await supabase.from('messages').insert({
            chat_id: activeChatId,
            role: 'user',
            content: userContent
          });
        }
      } catch (dbErr) {
        console.error("Local DB Insert failed:", dbErr);
        toast.error("Could not save chat to database");
      }

      const messagesForAPI = [...messages, newUserMessage]
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesForAPI.map((msg) => ({
            role: msg.role === 'model' ? 'model' : 'user',
            content: msg.content,
          })),
          user_id: user.id,
          chat_id: activeChatId,
          access_token: sessionData?.session?.access_token,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Backend returned ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.response || ''

      // We no longer rely on backend for chat creation
      const resolvedChatId = data.chat_id || activeChatId;

      if (resolvedChatId && resolvedChatId !== currentChatId) {
        setCurrentChatId(resolvedChatId)
        setSidebarTrigger(prev => prev + 1)
      }

      const newAiMessage: Message = {
        role: 'model',
        content: aiResponse,
      }

      setMessages((prev) => [...prev, newAiMessage])
      
      // Native Supabase insert: AI Message
      if (resolvedChatId) {
        try {
          await supabase.from('messages').insert({
             chat_id: resolvedChatId,
             role: 'assistant',
             content: aiResponse
          });
        } catch (dbErrAI) {
           console.error("Local DB Insert for AI failed:", dbErrAI);
        }
      }

      if (data.recommendations) {
        setRecommendations(data.recommendations)
        toast.success('Insurance plans personalized for you!')
      }

    } catch (error: any) {
      console.error('Error sending message:', error)
      toast.error(error.message || 'Failed to process message or save to history.')
      const mockResponse: Message = {
        role: 'model',
        content: `I apologize for the technical difficulty. (Error: ${error.message || 'Unknown'})`,
      }
      setMessages((prev) => [...prev, mockResponse])
    } finally {
      setLoadingIndicator(false)
    }
  }, [messages, currentChatId, user])

  return {
    messages,
    sendMessage,
    recommendations,
    loadingIndicator,
    currentChatId,
    loadChat,
    startNewChat,
    sidebarTrigger, // Pass this out so the sidebar knows when to refresh
  }
}