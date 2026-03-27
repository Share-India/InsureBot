'use client';

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function AuthListener() {
  useEffect(() => {
    // 1. Initial Load Check
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      window.location.href = '/update-password'
    }

    // 2. Active Subscription Check
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (_event === 'PASSWORD_RECOVERY') {
          window.location.href = '/update-password'
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <></>
}
