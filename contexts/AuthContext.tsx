import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    supabaseUser: SupabaseUser | null;
    isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initialSessionHandled = useRef(false);

    useEffect(() => {
        let mounted = true;

        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!mounted) return;

            if (error) {
                console.error('AuthContext: Session error:', error.message);
                if (error.message.includes('Refresh Token Not Found') ||
                    error.message.includes('Invalid Refresh Token')) {
                    supabase.auth.signOut();
                    setSession(null);
                    setSupabaseUser(null);
                }
                setIsLoading(false);
                return;
            }

            initialSessionHandled.current = true;
            setSession(session);
            setSupabaseUser(session?.user || null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;

            // Skip duplicate INITIAL_SESSION
            if (event === 'INITIAL_SESSION' && initialSessionHandled.current) {
                return;
            }

            // Just update session for token refresh
            if (event === 'TOKEN_REFRESHED') {
                setSession(session);
                return;
            }

            // Handle sign out
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setSupabaseUser(null);
                initialSessionHandled.current = false;
                return;
            }

            // Handle sign in
            if (event === 'SIGNED_IN') {
                setSession(session);
                setSupabaseUser(session?.user || null);
                return;
            }

            // Default
            setSession(session);
            setSupabaseUser(session?.user || null);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, supabaseUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};