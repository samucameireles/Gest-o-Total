
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        const { email, password, tenant_id, role } = await req.json()

        if (!email || !password || !tenant_id || !role) {
            throw new Error('Missing required fields')
        }

        // Verify if the requester is a manager of the tenant
        const { data: userRole, error: roleError } = await supabaseClient
            .from('user_roles')
            .select('role, tenant_id')
            .eq('user_id', user.id)
            .eq('tenant_id', tenant_id)
            .eq('role', 'gestor')
            .single()

        if (roleError || !userRole) {
            throw new Error('Unauthorized: You must be a manager of this tenant')
        }

        // Create the new user using the Service Role (Admin)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { tenant_id, role }
        })

        if (createError) throw createError

        // Insert into user_roles
        const { error: insertError } = await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: newUser.user.id,
                tenant_id,
                role,
                email // Denormalized for easy display
            })

        if (insertError) throw insertError

        return new Response(
            JSON.stringify(newUser),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
