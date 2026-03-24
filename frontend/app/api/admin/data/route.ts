import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

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

    const users = usersData.users.map(u => {
      const profile = profiles?.find(p => p.id === u.id)
      return {
        id: u.id,
        email: u.email,
        name: profile?.username || u.user_metadata?.full_name || u.user_metadata?.name || u.user_metadata?.user_name || 'Anonymous',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at
      }
    })

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'
    let chats = []
    let messages = []
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/all_chats_and_messages`, { cache: 'no-store' })
      if (response.ok) {
        const proxyData = await response.json()
        chats = proxyData.chats || []
        messages = proxyData.messages || []
      } else {
        console.error("Failed to fetch proxy data", await response.text())
      }
    } catch (e) {
      console.error("Error calling admin proxy route:", e)
    }

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
