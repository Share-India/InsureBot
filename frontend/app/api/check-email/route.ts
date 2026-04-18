import { createClient } from '@supabase/supabase-js'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
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

    const cleanEmail = email.trim()

    // Look up the email directly in the profiles table using Service Role
    const { data: profileCheck, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .ilike('email', cleanEmail)
      .limit(1)

    if (profileError || !profileCheck || profileCheck.length === 0) {
      return NextResponse.json({ exists: false })
    }

    return NextResponse.json({ exists: true })
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json({ error: 'Server error check failed' }, { status: 500 })
  }
}
