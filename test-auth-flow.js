import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nwopklynryiieuejjnna.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53b3BrbHlucnlpaWV1ZWpqbm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MzExNjcsImV4cCI6MjA4NTIwNzE2N30.mT-erxBC3cb2LxfoXdaRyk-ZBN8p6oDQKbGurHt9r8k'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCompleteFlow() {
    console.log('=== Testing Login ===')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'enzo@gmail.com',
        password: '123456',
    })

    if (loginError) {
        console.error('❌ Login failed:', loginError.message)
        return
    }

    console.log('✅ Login successful!')
    console.log('User ID:', loginData.user?.id)
    console.log('Email:', loginData.user?.email)

    console.log('\n=== Fetching User Tenants ===')
    const { data: tenantsData, error: tenantsError } = await supabase
        .from('user_roles')
        .select('role, tenants(id, name, slug)')
        .eq('user_id', loginData.user?.id)

    if (tenantsError) {
        console.error('❌ Failed to fetch tenants:', tenantsError.message)
    } else {
        console.log('✅ User tenants:', JSON.stringify(tenantsData, null, 2))
    }

    console.log('\n=== Testing Tenant Creation ===')
    const newTenantName = `Test Restaurant ${Date.now()}`
    const slug = newTenantName.toLowerCase().replace(/[^a-z0-9]/g, '-')

    const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert([{ name: newTenantName, slug }])
        .select()
        .single()

    if (createError) {
        console.error('❌ Failed to create tenant:', createError.message)
    } else {
        console.log('✅ Tenant created:', newTenant)

        // Wait a bit for trigger to execute
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Fetch again to see if it appears
        const { data: updatedTenants } = await supabase
            .from('user_roles')
            .select('role, tenants(id, name, slug)')
            .eq('user_id', loginData.user?.id)

        console.log('✅ Updated tenant list:', JSON.stringify(updatedTenants, null, 2))
    }

    await supabase.auth.signOut()
    console.log('\n✅ Test complete!')
}

testCompleteFlow()
