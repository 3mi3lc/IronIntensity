import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { createOrUpdateUser } from '@/repositories/users';
import type { User } from '@/repositories/types';

interface UserContextType {
    user: User | null;
    isLoading: boolean;
    refreshTrigger: number;
    triggerRefresh: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const auth = useContext(AuthContext);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Load local user when auth state changes
    useEffect(() => {
        if (!auth) return;

        if (auth.isLoading) {
            setIsLoading(true);
            return;
        }

        if (!auth.supabaseUser) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        // Create/update local user
        createOrUpdateUser({
            id: auth.supabaseUser.id,
            email: auth.supabaseUser.email!,
            username: auth.supabaseUser.user_metadata?.username || auth.supabaseUser.email!.split('@')[0],
        })
            .then(localUser => {
                setUser(localUser);
                setIsLoading(false);
            })
            .catch(error => {
                console.error('Failed to load local user:', error);
                setIsLoading(false);
            });
    }, [auth?.supabaseUser, auth?.isLoading]);

    return (
        <UserContext.Provider value={{ user, isLoading, refreshTrigger, triggerRefresh }}>
            {children}
        </UserContext.Provider>
    );
};