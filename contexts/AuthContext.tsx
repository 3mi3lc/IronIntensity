import React, { createContext, useState, useEffect, ReactNode, useRef } from 'react';
import { logger } from '@/utils/logger';
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
                    // Offline-first: let the user in immediately with the cached
                    // session and never block the UI on a network call. Even an
                    // expired token is fine: it just means sync will retry once
                    // a connection is available.
                    logger.debug('AuthContext: Cached session found, granting local access');
                    setSession(cachedSession);
                    setSupabaseUser(cachedSession.user);
                    initialSessionHandled.current = true;
                    setIsLoading(false);

                    // Refresh the token in the background. This hits the network,
                    // so it must not be awaited: it fails silently when offline
                    // and updates the session if/when it succeeds.
                    supabase.auth.refreshSession().then(({ data, error }) => {
                        if (!mounted) return;
                        if (!error && data.session) {
                            logger.debug('AuthContext: Background token refresh succeeded');
                            setSession(data.session);
                            setSupabaseUser(data.session.user);
                        } else {
                            logger.debug('AuthContext: Background token refresh failed (offline?)');
                        }
                    }).catch((err) => {
                        logger.debug('AuthContext: Background token refresh threw (offline?)', err);
                    });
                } else {
                    logger.debug('AuthContext: No cached session found');
                    setSession(null);
                    setSupabaseUser(null);
                    setIsLoading(false);
                }
            } catch (error) {
                logger.error('AuthContext: Init session error:', error);
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

            logger.debug('AuthContext: Auth state change:', event);

            if (event === 'INITIAL_SESSION' && initialSessionHandled.current) {
                return;
            }

            if (event === 'TOKEN_REFRESHED') {
                setSession(session);
                setSupabaseUser(session?.user || null);
                return;
            }

            if (event === 'SIGNED_OUT') {
                logger.debug('AuthContext: Signing out - clearing all state');
                setSession(null);
                setSupabaseUser(null);
                initialSessionHandled.current = false;
                setIsLoading(false);
                return;
            }

            if (event === 'SIGNED_IN') {
                logger.debug('AuthContext: Signed in');
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
