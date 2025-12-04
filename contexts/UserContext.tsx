// contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { createOrUpdateUser } from '@/repositories/users';
import { SyncService } from '@/db/sync';
import type { User } from '@/repositories/types';
import {clearAllUserData} from "@/db/cleanup";
import { router } from 'expo-router';

interface UserContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    refreshTrigger: number;
    triggerRefresh: () => void; // Add this
    signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    syncData: () => Promise<boolean>;
    pullData: () => Promise<boolean>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Debounce sync to prevent double execution
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;

    // Function to manually trigger a refresh
    const triggerRefresh = () => {
        console.log('UserContext: Manual refresh triggered');
        setRefreshTrigger(prev => prev + 1);
    };

    // Initialize session on mount
    useEffect(() => {
        let mounted = true;

        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (!mounted) return;

            if (error) {
                console.error('UserContext: Session error:', error.message);

                // Only clear session if it's truly invalid
                if (error.message.includes('Refresh Token Not Found') ||
                    error.message.includes('Invalid Refresh Token')) {
                    console.log('UserContext: Clearing invalid session');
                    supabase.auth.signOut();
                    setSession(null);
                    setUser(null);
                }
                setIsLoading(false);
                return;
            }

            setSession(session);
            if (session?.user) {
                loadLocalUser(session.user);
            } else {
                setIsLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            console.log('UserContext: Auth state changed:', event);

            // Handle token refresh - DON'T sync, just update session
            if (event === 'TOKEN_REFRESHED') {
                console.log('UserContext: Token refreshed successfully');
                setSession(session);
                return;
            }

            // Handle signed out
            if (event === 'SIGNED_OUT') {
                console.log('UserContext: User signed out');
                setUser(null);
                setSession(null);
                setIsLoading(false);
                return;
            }

            // Handle signed in - loadLocalUser handles the sync
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                setSession(session);
                if (session?.user) {
                    await loadLocalUser(session.user);
                } else {
                    setIsLoading(false);
                }
                return;
            }

            // Default handler
            setSession(session);
            if (session?.user) {
                await loadLocalUser(session.user);
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            if (syncTimeout) clearTimeout(syncTimeout);
        };
    }, []);

    const loadLocalUser = async (supabaseUser: SupabaseUser) => {
        try {
            console.log('UserContext: Loading local user for:', supabaseUser.id);

            const localUser = await createOrUpdateUser({
                id: supabaseUser.id,
                email: supabaseUser.email!,
                username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
            });

            console.log('UserContext: Local user loaded:', localUser);
            setUser(localUser);

            // Debounced auto-sync and pull
            if (syncTimeout) clearTimeout(syncTimeout);
            syncTimeout = setTimeout(async () => {
                console.log('UserContext: Starting auto-sync and pull...');
                const currentSession = await supabase.auth.getSession();
                const syncService = new SyncService(localUser.id, currentSession.data.session);

                // Pull body parts first (static lookup data)
                //await syncService.pullBodyParts();

                // Then pull user's data from server
                //await syncService.pullAll();

                // Finally sync any local changes
                //await syncService.syncAll();

                // Trigger refresh
                setRefreshTrigger(prev => prev + 1);
            }, 500);
        } catch (error) {
            console.error('UserContext: Failed to load local user:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const signUp = async (email: string, password: string, username: string) => {
        try {
            console.log('UserContext: Starting signUp for:', email);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username,
                    },
                },
            });

            console.log('UserContext: SignUp response:', { data, error });

            if (error) {
                return { error: error.message };
            }

            return {};
        } catch (error: any) {
            console.error('UserContext: SignUp exception:', error);
            return { error: error.message || 'An error occurred during sign up' };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            console.log('UserContext: Starting signIn for:', email);
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            console.log('UserContext: SignIn response:', { error });

            if (error) {
                return { error: error.message };
            }

            return {};
        } catch (error: any) {
            console.error('UserContext: SignIn exception:', error);
            return { error: error.message || 'An error occurred during sign in' };
        }
    };

    const signOut = async () => {
        try {
            console.log('UserContext: Signing out...');

            if (syncTimeout) clearTimeout(syncTimeout);

            // 1. Clear user state first (stops UI from trying to load data)
            setUser(null);
            setSession(null);

            // 2. Navigate to login immediately (gets user away from protected screens)
            router.replace('/auth/login');

            // 3. Clear local database in background
            await clearAllUserData();

            // 4. Sign out from Supabase
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('UserContext: SignOut error:', error);
            }

            console.log('UserContext: Logout complete');
        } catch (error) {
            console.error('UserContext: Failed to sign out:', error);
            // Force clear state even on error
            setUser(null);
            setSession(null);
            router.replace('/auth/login');
        }
    };

    const syncData = async () => {
        if (!user) {
            console.warn('No user to sync');
            return false;
        }

        const currentSession = await supabase.auth.getSession();
        const syncService = new SyncService(user.id, currentSession.data.session);
        return await syncService.syncAll();
    };

    const pullData = async () => {
        if (!user) {
            console.warn("No user to pull");
            return false;
        }

        const currentSession = await supabase.auth.getSession();
        const syncService = new SyncService(user.id, currentSession.data.session);
        const success = await syncService.pullAll();

        if (success) {
            setRefreshTrigger(prev => prev + 1);
        }

        return success;
    };


    return (
        <UserContext.Provider value={{
            user,
            session,
            isLoading,
            refreshTrigger,
            triggerRefresh, // Add this to the provider value
            signUp,
            signIn,
            signOut,
            syncData,
            pullData
        }}>
            {children}
        </UserContext.Provider>
    );
};