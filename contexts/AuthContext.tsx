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
        const initSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();

                if (!mounted) return;

                if (error) {
                    console.error('AuthContext: Session error:', error.message);
                    if (error.message.includes('Refresh Token Not Found') ||
                        error.message.includes('Invalid Refresh Token')) {
                        await supabase.auth.signOut({ scope: 'local' });
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
            } catch (error) {
                console.error('AuthContext: Init session error:', error);
                if (mounted) {
                    setSession(null);
                    setSupabaseUser(null);
                    setIsLoading(false);
                }
            }
        };

        initSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            console.log('AuthContext: Auth state change:', event);

            // Skip duplicate INITIAL_SESSION
            if (event === 'INITIAL_SESSION' && initialSessionHandled.current) {
                return;
            }

            // Just update session for token refresh
            if (event === 'TOKEN_REFRESHED') {
                setSession(session);
                setSupabaseUser(session?.user || null);
                return;
            }

            // Handle sign out - ensure complete cleanup
            if (event === 'SIGNED_OUT') {
                console.log('AuthContext: Signing out - clearing all state');
                setSession(null);
                setSupabaseUser(null);
                initialSessionHandled.current = false;
                setIsLoading(false);
                return;
            }

            // Handle sign in
            if (event === 'SIGNED_IN') {
                console.log('AuthContext: Signed in');
                setSession(session);
                setSupabaseUser(session?.user || null);
                setIsLoading(false);
                return;
            }

            // Default - update session
            setSession(session);
            setSupabaseUser(session?.user || null);
            setIsLoading(false);
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