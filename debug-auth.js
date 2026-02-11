
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nwopklynryiieuejjnna.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53b3BrbHlucnlpaWV1ZWpqbm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzExNjcsImV4cCI6MjA4NTIwNzE2N30.mT-erxBC3cb2LxfoXdaRyk-ZBN8p6oDQKbGurHt9r8k'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSignup() {
    const email = `test.debug.${Date.now()}@example.com`
    const password = 'Password123!'

    console.log(`Attempting signup with ${email}...`)
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        console.error('Signup Error:', error.message)
        console.error('Details:', error)
    } else {
        console.log('Signup Success!')
        console.log('User ID:', data.user?.id)
        console.log('Session is null?', data.session === null)
        if (data.session === null && data.user) {
            console.log('CONCLUSION: Email confirmation is REQUIRED.')
        } else {
            console.log('CONCLUSION: Email confirmation is AUTO-CONFIRMED or NOT REQUIRED.')
        }
    }
}

testSignup()
