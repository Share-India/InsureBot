'use client';

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function AuthListener() {
  useEffect(() => {
    // Supabase automatically parses #access_token=...&type=recovery hash. We don't need to manually strip it.

    // 2. Active Subscription Check
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (_event === 'PASSWORD_RECOVERY' && typeof window !== 'undefined') {
          if (window.location.pathname !== '/update-password') {
            window.location.href = '/update-password'
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <></>
}
