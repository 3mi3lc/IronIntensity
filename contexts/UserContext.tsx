// contexts/UserContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { createOrUpdateUser } from '@/repositories/users';
import type { User } from '@/repositories/types';

interface UserContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signUp: (email: string, password: string, username: string) => Promise<{ error?: string }>;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize session on mount
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                loadLocalUser(session.user);
            } else {
                setIsLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                loadLocalUser(session.user);
            } else {
                setUser(null);
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadLocalUser = async (supabaseUser: SupabaseUser) => {
        try {
            console.log('UserContext: Loading local user for:', supabaseUser.id);

            // Create or update user in local SQLite
            const localUser = await createOrUpdateUser({
                id: supabaseUser.id,
                email: supabaseUser.email!,
                username: supabaseUser.user_metadata?.username || supabaseUser.email!.split('@')[0],
            });

            console.log('UserContext: Local user loaded:', localUser);
            setUser(localUser);
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
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
        } catch (error) {
            console.error('Failed to sign out:', error);
        }
    };

    return (
        <UserContext.Provider value={{ user, session, isLoading, signUp, signIn, signOut }}>
            {children}
        </UserContext.Provider>
    );
};