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
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${BACKEND_URL}/api/chats/${chatId}/messages`);
      
      if (!response.ok) {
        throw new Error('Backend returned ' + response.status);
      }
      
      const data = await response.json();
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
          chat_id: currentChatId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Backend returned ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.response || ''
      const newChatId = data.chat_id

      // If a new chat was created by the backend, update our state
      if (newChatId && newChatId !== currentChatId) {
        setCurrentChatId(newChatId)
        setSidebarTrigger(prev => prev + 1)
      }

      const newAiMessage: Message = {
        role: 'model',
        content: aiResponse,
      }

      setMessages((prev) => [...prev, newAiMessage])

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