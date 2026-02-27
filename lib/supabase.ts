
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing. Check your .env.local file.')
}

// Active tenant ID for RLS header injection
let activeTenantId = import.meta.env.VITE_TENANT_ID || ''

// Create the Supabase client with a dynamic header getter
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
    global: {
        fetch: (url: RequestInfo | URL, options: RequestInit = {}) => {
            // Inject x-tenant-id into every request dynamically
            const headers = new Headers(options.headers || {})
            if (activeTenantId) {
                headers.set('x-tenant-id', activeTenantId)
            }
            return fetch(url, { ...options, headers })
        }
    }
})

/**
 * Sets the active tenant for all subsequent Supabase queries.
 * This ensures RLS policies isolate data correctly per tenant.
 */
export const setTenant = (id: string) => {
    if (!id) return
    activeTenantId = id
    console.log(`[Supabase] Active Tenant: ${id}`)
}

/**
 * Uploads a logo file to the 'logos' bucket in Supabase Storage.
 * Returns the public URL of the uploaded file.
 */
export const uploadLogo = async (file: File, tenantId: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${tenantId}-${Math.random()}.${fileExt}`
    const filePath = `store-logos/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

    // Also update the tenant record with the path
    const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_path: filePath, logo_url: null })
        .eq('id', tenantId)

    if (updateError) throw updateError

    return publicUrl
}

/**
 * Updates the tenant's logo using an external URL.
 */
export const updateTenantLogoUrl = async (url: string, tenantId: string) => {
    const { error } = await supabase
        .from('tenants')
        .update({ logo_url: url, logo_path: null })
        .eq('id', tenantId)

    if (error) throw error
}
