import { useContext, useCallback } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { UserContext } from '@/contexts/UserContext';
import { SyncService } from '@/db/sync';
import { getFailedSyncs } from '@/repositories/syncMetadata';

export type SyncResult = {
    success: boolean;
    failures: Array<{ entity: string; error: string }>;
}

export const useSync = () => {
    const auth = useContext(AuthContext);
    const userContext = useContext(UserContext);

    if (!auth || !userContext) {
        throw new Error('useSync must be used within AuthProvider and UserProvider');
    }

    const pushData = useCallback(async (): Promise<SyncResult> => {
        if (!userContext.user || !auth.session) {
            return { success: false, failures: [{ entity: 'auth', error: 'No user or session available' }] };
        }

        const syncService = new SyncService(userContext.user.id, auth.session);
        const success = await syncService.pushAll();
        const failures = await getFailedSyncs();

        if (success) userContext.triggerRefresh();
        return { success, failures };
    }, [userContext.user, auth.session]);

    const pullData = useCallback(async (): Promise<SyncResult> => {
        if (!userContext.user || !auth.session) {
            return { success: false, failures: [{ entity: 'auth', error: 'No user or session available' }] };
        }

        const syncService = new SyncService(userContext.user.id, auth.session);
        const success = await syncService.pullAll();
        const failures = await getFailedSyncs();

        if (success) userContext.triggerRefresh();
        return { success, failures };
    }, [userContext.user, auth.session]);

    const fullSync = useCallback(async (): Promise<SyncResult> => {
        if (!userContext.user || !auth.session) {
            return { success: false, failures: [{ entity: 'auth', error: 'No user or session available' }] };
        }

        const syncService = new SyncService(userContext.user.id, auth.session);
        await syncService.pullBodyParts();
        await syncService.pushAll();
        await syncService.pullAll();

        const failures = await getFailedSyncs();
        userContext.triggerRefresh();
        return { success: failures.length === 0, failures };
    }, [userContext.user, auth.session]);

    return { pushData, pullData, fullSync };
};