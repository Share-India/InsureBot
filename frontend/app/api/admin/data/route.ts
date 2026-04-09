import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Admin configuration missing on server' }, { status: 500 })
  }

  // Create a specialized Admin client that bypasses all Row Level Security
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey
      },
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' })
      }
    }
  })

  try {
    // 1. Fetch all registered users (up to 1000 to bypass default pagination)
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    if (usersError) throw usersError

    // 1b. Fetch all custom profiles to retrieve accurate business logic usernames
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
    if (profilesError) console.error("Failed to fetch profiles", profilesError)

    const users = (profiles || []).map(p => {
      const authUser = usersData.users.find(u => u.id === p.id)
      return {
        id: p.id,
        email: p.email || authUser?.email,
        name: p.fullname || p.username || authUser?.user_metadata?.full_name || 'Anonymous',
        created_at: authUser?.created_at || new Date().toISOString(),
        last_sign_in_at: authUser?.last_sign_in_at || null
      }
    })

    // Direct Supabase Admin DB query instead of brittle Python API ping
    const { data: rawChats, error: chatsError } = await supabaseAdmin.from('chats').select('*')
    if (chatsError) console.error("Error fetching chats natively:", chatsError)
    
    const { data: rawMessages, error: messagesError } = await supabaseAdmin.from('messages').select('*')
    if (messagesError) console.error("Error fetching messages natively:", messagesError)

    const chats = rawChats || []
    const messages = rawMessages || []

    // Return the bundled data to the frontend Dashboard
    return NextResponse.json({
      users,
      chats,
      messages
    })
    
  } catch (error: any) {
    console.error('Admin API Fetch Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch admin data' }, { status: 500 })
  }
}
