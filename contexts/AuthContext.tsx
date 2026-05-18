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

        const initSession = async () => {
            try {
                const { data: { session: cachedSession } } = await supabase.auth.getSession();

                if (!mounted) return;

                if (cachedSession) {
                    // Check if token is expired
                    const expiresAt = cachedSession.expires_at; // unix timestamp in seconds
                    const now = Math.floor(Date.now() / 1000);
                    const isExpired = expiresAt ? now >= expiresAt : false;

                    if (isExpired) {
                        console.log('AuthContext: Token expired, attempting refresh...');
                        // Try to refresh — will fail offline
                        const { data, error } = await supabase.auth.refreshSession();
                        if (error || !data.session) {
                            console.log('AuthContext: Refresh failed (offline?), using expired session for local access');
                            // Still let the user in — they can use local data
                            setSession(cachedSession);
                            setSupabaseUser(cachedSession.user);
                        } else {
                            setSession(data.session);
                            setSupabaseUser(data.session.user);
                        }
                    } else {
                        console.log('AuthContext: Valid cached session found');
                        setSession(cachedSession);
                        setSupabaseUser(cachedSession.user);

                        // Background refresh
                        supabase.auth.refreshSession().then(({ data, error }) => {
                            if (!mounted) return;
                            if (!error && data.session) {
                                setSession(data.session);
                                setSupabaseUser(data.session.user);
                            }
                        });
                    }

                    initialSessionHandled.current = true;
                    setIsLoading(false);
                } else {
                    console.log('AuthContext: No cached session found');
                    setSession(null);
                    setSupabaseUser(null);
                    setIsLoading(false);
                }
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

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            console.log('AuthContext: Auth state change:', event);

            if (event === 'INITIAL_SESSION' && initialSessionHandled.current) {
                return;
            }

            if (event === 'TOKEN_REFRESHED') {
                setSession(session);
                setSupabaseUser(session?.user || null);
                return;
            }

            if (event === 'SIGNED_OUT') {
                console.log('AuthContext: Signing out - clearing all state');
                setSession(null);
                setSupabaseUser(null);
                initialSessionHandled.current = false;
                setIsLoading(false);
                return;
            }

            if (event === 'SIGNED_IN') {
                console.log('AuthContext: Signed in');
                setSession(session);
                setSupabaseUser(session?.user || null);
                setIsLoading(false);
                return;
            }

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