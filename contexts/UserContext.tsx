import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { logger } from '@/utils/logger';
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
    // False until NetInfo reports the connectivity state at least once. Consumers
    // that trigger network work on startup should wait for this so they don't act
    // on the default (assumed online) value before the real state is known.
    isNetworkStateKnown: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

const AUTH_TIMEOUT = 5000; // 5 seconds timeout for auth checks

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const auth = useContext(AuthContext);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isOffline, setIsOffline] = useState(false);
    const [isNetworkStateKnown, setIsNetworkStateKnown] = useState(false);

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
            setIsNetworkStateKnown(true);
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
                logger.debug('Offline detected - loading from local database');
                await checkLocalUser();
                return;
            }

            // If auth is still loading, wait with timeout
            if (auth.isLoading) {
                setIsLoading(true);

                // Set a timeout to proceed anyway after 5 seconds
                timeoutId = setTimeout(() => {
                    logger.debug('Auth loading timeout - checking local database');
                    checkLocalUser();
                }, AUTH_TIMEOUT);

                return;
            }

            // Clear any pending timeout
            clearTimeout(timeoutId);

            // If no Supabase user, check if we have a local user (offline mode)
            if (!auth.supabaseUser) {
                logger.debug('No Supabase user - checking local database');
                await checkLocalUser();
                return;
            }

            // We have a Supabase user, create/update local user
            try {
                logger.debug('Creating/updating user from Supabase:', auth.supabaseUser.email);
                const localUser = await createOrUpdateUser({
                    id: auth.supabaseUser.id,
                    email: auth.supabaseUser.email!,
                    username: auth.supabaseUser.user_metadata?.username ||
                        auth.supabaseUser.email!.split('@')[0],
                });

                setUser(localUser);
                setIsLoading(false);
            } catch (error) {
                logger.error('Failed to load/create user:', error);
                // Fall back to checking local database
                await checkLocalUser();
            }
        };

        const checkLocalUser = async () => {
            try {
                // Try to get the last logged-in user from local database
                const localUser = await getLastLocalUser();

                if (localUser) {
                    logger.debug('Loaded user from local database (offline mode):', localUser.email);
                    setUser(localUser);
                } else {
                    logger.debug('No local user found');
                    setUser(null);
                }
            } catch (error) {
                logger.error('Failed to check local user:', error);
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
        <UserContext.Provider value={{ user, isLoading, refreshTrigger, triggerRefresh, clearUser, isOffline, isNetworkStateKnown }}>
            {children}
        </UserContext.Provider>
    );
};
