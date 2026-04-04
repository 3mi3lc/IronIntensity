import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { createOrUpdateUser, getLastLocalUser } from '@/repositories/users';
import type { User } from '@/repositories/types';
import NetInfo from '@react-native-community/netinfo';

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    refreshTrigger: number;
    triggerRefresh: () => void;
    clearUser: () => void;
    isOffline: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

const AUTH_TIMEOUT = 5000; // 5 seconds timeout for auth checks

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const auth = useContext(AuthContext);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isOffline, setIsOffline] = useState(false);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const clearUser = () => {
        setUser(null);
    };

    // Monitor network connectivity
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });

        return () => unsubscribe();
    }, []);

    // Load local user when auth state changes
    useEffect(() => {
        if (!auth) return;

        let timeoutId: ReturnType<typeof setTimeout>;

        const loadUser = async () => {
            // If offline, immediately try to load local user
            if (isOffline) {
                console.log('Offline detected - loading from local database');
                await checkLocalUser();
                return;
            }

            // If auth is still loading, wait with timeout
            if (auth.isLoading) {
                setIsLoading(true);

                // Set a timeout to proceed anyway after 5 seconds
                timeoutId = setTimeout(() => {
                    console.log('Auth loading timeout - checking local database');
                    checkLocalUser();
                }, AUTH_TIMEOUT);

                return;
            }

            // Clear any pending timeout
            clearTimeout(timeoutId);

            // If no Supabase user, check if we have a local user (offline mode)
            if (!auth.supabaseUser) {
                console.log('No Supabase user - checking local database');
                await checkLocalUser();
                return;
            }

            // We have a Supabase user, create/update local user
            try {
                console.log('Creating/updating user from Supabase:', auth.supabaseUser.email);
                const localUser = await createOrUpdateUser({
                    id: auth.supabaseUser.id,
                    email: auth.supabaseUser.email!,
                    username: auth.supabaseUser.user_metadata?.username ||
                        auth.supabaseUser.email!.split('@')[0],
                });

                setUser(localUser);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to load/create user:', error);
                // Fall back to checking local database
                await checkLocalUser();
            }
        };

        const checkLocalUser = async () => {
            try {
                // Try to get the last logged-in user from local database
                const localUser = await getLastLocalUser();

                if (localUser) {
                    console.log('Loaded user from local database (offline mode):', localUser.email);
                    setUser(localUser);
                } else {
                    console.log('No local user found');
                    setUser(null);
                }
            } catch (error) {
                console.error('Failed to check local user:', error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();

        return () => {
            clearTimeout(timeoutId);
        };
    }, [auth?.supabaseUser, auth?.isLoading, isOffline]);

    return (
        <UserContext.Provider value={{ user, isLoading, refreshTrigger, triggerRefresh, clearUser, isOffline }}>
            {children}
        </UserContext.Provider>
    );
};