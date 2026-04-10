import "@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req) => {
  try {
    // 1. Parse payload sent from Supabase Auth Interceptor
    const payload = await req.json()
    const { user, sms } = payload
    
    if (!user?.phone || !sms?.otp) {
      return new Response(JSON.stringify({ error: "Missing required auth hook parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const unformattedMobile = user.phone
    // Strip `+` from the E.164 number format because MSG91 strictly expects integers e.g. 919876543210
    const mobileNo = unformattedMobile.replace(/\D/g, '')

    // 2. Load MSG91 Credentials from Secure Environment Variables
    const authKey = Deno.env.get('MSG91_AUTH_KEY')
    const templateId = "69d885bc1eb6d273140ae013" 
    const senderId = "POLSQR"

    if (!authKey) {
      console.error("MSG91_AUTH_KEY strictly missing from vault!")
      return new Response(JSON.stringify({ error: "Server Configuration Error" }), { status: 500 })
    }

    // 3. Construct MSG91 Transactional Flow Payload
    const msg91Payload = {
      template_id: templateId,
      short_url: "0",
      recipients: [
        {
          mobiles: mobileNo,
          OTP: sms.otp // Maps to the ##OTP## tag we configured in MSG91 dashboard
        }
      ]
    }

    console.log(`📡 Sending OTP ${sms.otp} to ${mobileNo} via MSG91...`)

    // 4. Dispatch SMS Request
    const response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey": authKey
      },
      body: JSON.stringify(msg91Payload)
    })

    const msg91ResponseData = await response.json()

    if (!response.ok) {
      console.error("❌ MSG91 API Failure:", msg91ResponseData)
      return new Response(JSON.stringify({ error: "Upstream SMS Provider Failure" }), { status: 502 })
    }

    console.log("✅ MSG91 Request Successful:", msg91ResponseData)

    // 5. Return success callback back to Supabase Auth so it can mark OTP as generated 
    return new Response(JSON.stringify({ status: "success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    console.error("❌ Edge Function crash:", error)
    return new Response(JSON.stringify({ error: "Internal Edge Hook Error" }), { status: 500 })
  }
})

