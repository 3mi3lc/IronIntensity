// app/index.tsx
import { Redirect } from 'expo-router';
import { logger } from '@/utils/logger';
import { useContext, useEffect } from 'react';
import { UserContext } from '@/contexts/UserContext';
import { LoadingScreen } from '@/components/loadingScreen';

export default function Index() {
    const { user, isLoading, isOffline } = useContext(UserContext) ?? {
        user: null,
        isLoading: true,
        isOffline: false
    };

    useEffect(() => {
        logger.debug('Index: User state changed:', {
            user: user?.email,
            isLoading,
            isOffline
        });
    }, [user, isLoading, isOffline]);

    if (isLoading) {
        return <LoadingScreen subMessage={isOffline ? 'Offline mode' : undefined} />;
    }

    logger.debug('Index: Redirecting...', user ? 'to app' : 'to login');

    // Redirect based on auth state
    if (!user) {
        return <Redirect href="/auth/login" />;
    }

    return <Redirect href="/(tabs)/logging" />;
}
