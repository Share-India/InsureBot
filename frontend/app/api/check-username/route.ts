import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Admin configuration missing missing' }, { status: 500 })
    }

    // Specialized Admin client bypassing RLS
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

    // Look up the username directly in the profiles table using Service Role
    const { data: profileCheck, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .single()

    if (profileError || !profileCheck) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ exists: true })
  } catch (error) {
    console.error('Error verifying username:', error)
    return NextResponse.json({ exists: false }, { status: 500 }) // Return false on error so as to not block aggressively, or let frontend handle it
  }
}
