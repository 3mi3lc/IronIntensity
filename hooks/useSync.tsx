import { useContext, useCallback } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { UserContext } from '@/contexts/UserContext';
import { SyncService } from '@/db/sync';

export const useSync = () => {
    const auth = useContext(AuthContext);
    const userContext = useContext(UserContext);

    if (!auth || !userContext) {
        throw new Error('useSync must be used within AuthProvider and UserProvider');
    }

    const pushData = useCallback(async () => {
        if (!userContext.user || !auth.session) {
            console.warn('No user or session available for sync');
            return false;
        }

        const syncService = new SyncService(userContext.user.id, auth.session);
        const success = await syncService.pushAll();

        if (success) {
            userContext.triggerRefresh();
        }

        return success;
    }, [userContext.user, auth.session]);

    const pullData = useCallback(async () => {
        if (!userContext.user || !auth.session) {
            console.warn('No user or session available for pull');
            return false;
        }

        const syncService = new SyncService(userContext.user.id, auth.session);
        const success = await syncService.pullAll();

        if (success) {
            userContext.triggerRefresh();
        }

        return success;
    }, [userContext.user, auth.session]);

    const fullSync = useCallback(async () => {
        if (!userContext.user || !auth.session) {
            console.warn('No user or session available for full sync');
            return false;
        }

        const syncService = new SyncService(userContext.user.id, auth.session);

        // Pull body parts (static data)
        await syncService.pullBodyParts();

        // Sync local changes first
        await syncService.pushAll();

        // Then pull server updates
        await syncService.pullAll();

        userContext.triggerRefresh();
        return true;
    }, [userContext.user, auth.session]);

    return {
        pushData,
        pullData,
        fullSync,
    };
};