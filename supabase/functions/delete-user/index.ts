
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

        const { target_user_id, tenant_id } = await req.json()

        if (!target_user_id || !tenant_id) {
            throw new Error('Missing required fields')
        }

        // Verify if the requester is a manager (gestor) of the tenant
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

        // Use Service Role (Admin) to delete the user
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Delete from user_roles first (due to foreign keys if any, though usually auth.users is the parent)
        const { error: deleteRoleError } = await supabaseAdmin
            .from('user_roles')
            .delete()
            .eq('user_id', target_user_id)
            .eq('tenant_id', tenant_id)

        if (deleteRoleError) throw deleteRoleError

        // Delete from auth.users
        const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id)

        if (deleteUserError) throw deleteUserError

        return new Response(
            JSON.stringify({ message: 'User deleted successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
