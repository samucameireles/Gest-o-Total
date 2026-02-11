
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
    session: Session | null
    user: User | null
    loading: boolean
    role: 'owner' | 'gestor' | 'caixa' | 'staff' | null
    tenantId: string | null
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    role: null,
    tenantId: null,
    signOut: async () => { },
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [role, setRole] = useState<'owner' | 'gestor' | 'caixa' | 'staff' | null>(null)
    const [tenantId, setTenantId] = useState<string | null>(null)

    useEffect(() => {
        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserRole(session.user.id)
            } else {
                setLoading(false)
            }
        })

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserRole(session.user.id)
            } else {
                setRole(null)
                setTenantId(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchUserRole = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role, tenant_id')
                .eq('user_id', userId)
                .single()

            if (error) {
                console.error('Error fetching role:', error)
                // Fallback for development or if no role assigned yet
            }

            if (data) {
                setRole(data.role as any)
                setTenantId(data.tenant_id)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setRole(null)
        setTenantId(null)
    }

    return (
        <AuthContext.Provider value={{ session, user, loading, role, tenantId, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}
