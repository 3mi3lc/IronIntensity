import { useContext } from 'react';
import { supabase } from '@/utils/supabase';
import { AuthContext } from '@/contexts/AuthContext';
import { UserContext } from '@/contexts/UserContext';
import { clearAllUserData } from '@/db/cleanup';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
    const auth = useContext(AuthContext);
    const userContext = useContext(UserContext);

    if (!auth) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    const signUp = async (email: string, password: string, username: string) => {
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username },
                },
            });

            if (error) {
                return { error: error.message };
            }

            return {};
        } catch (error: any) {
            return { error: error.message || 'An error occurred during sign up' };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { error: error.message };
            }

            // Store the user ID for offline access
            if (data.user) {
                await AsyncStorage.setItem('lastUserId', data.user.id);
            }

            return {};
        } catch (error: any) {
            return { error: error.message || 'An error occurred during sign in' };
        }
    };

    const signOut = async () => {
        try {
            // Clear local database
            await clearAllUserData();

            // Clear stored user ID
            await AsyncStorage.removeItem('lastUserId');

            // Sign out from Supabase
            await supabase.auth.signOut();

            // Navigate to login
            router.replace('/auth/login');
        } catch (error) {
            console.error('Failed to sign out:', error);
            router.replace('/auth/login');
        }
    };

    return {
        session: auth.session,
        user: userContext?.user || null,
        isLoading: auth.isLoading || userContext?.isLoading || false,
        isOffline: userContext?.isOffline || false,
        signUp,
        signIn,
        signOut,
    };
};