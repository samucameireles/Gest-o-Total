
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nwopklynryiieuejjnna.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53b3BrbHlucnlpaWV1ZWpqbm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzExNjcsImV4cCI6MjA4NTIwNzE2N30.mT-erxBC3cb2LxfoXdaRyk-ZBN8p6oDQKbGurHt9r8k'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin() {
    console.log('Attempting login with enzo@gmail.com...')
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'enzo@gmail.com',
        password: '123456',
    })

    if (error) {
        console.error('Login Error:', error.message)
        console.error('Status:', error.status)
        console.error('Details:', error)
    } else {
        console.log('Login Success!')
        console.log('User ID:', data.user?.id)
        console.log('Email:', data.user?.email)
        console.log('Session exists:', !!data.session)
    }
}

testLogin()
