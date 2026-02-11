
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const tenantId = import.meta.env.VITE_TENANT_ID

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        headers: {
            'x-tenant-id': tenantId || '',
        },
    },
})

export const setTenant = (id: string) => {
    // @ts-ignore - Dynamic header injection for RLS
    supabase.rest.headers['x-tenant-id'] = id;
    // Also update global config for future requests if client is recreated/internal logic changes
    // (supabase as any).global.headers['x-tenant-id'] = id; 
}
