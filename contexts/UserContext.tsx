import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabase';
import {  createOrUpdateUser } from '@/repositories/users';

type User = {
    id: string;
    email: string | null;
    username?: string;
};

type UserContextType = {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        async function fetchUser() {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data?.user) {
                setUser(null);
                return;
            }

            const authUser = data.user;

            // Sync user to local DB or create if missing
            const localUser = await createOrUpdateUser({
                id: authUser.id,
                email: authUser.email!,
                username: '', // you can keep username if you want to update here
            });

            setUser(localUser);
        }

        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                (async () => {
                    const authUser = session.user;
                    const localUser = await createOrUpdateUser({
                        id: authUser.id,
                        email: authUser.email!,
                        username: '',
                    });
                    setUser(localUser);
                })();
            } else {
                setUser(null);
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}
