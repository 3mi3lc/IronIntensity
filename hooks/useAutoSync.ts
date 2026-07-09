import {useContext, useEffect, useRef, useState} from 'react';
import { logger } from '@/utils/logger';
import { UserContext } from '@/contexts/UserContext';
import {useAuth} from "@/hooks/useAuth";
import {AuthContext} from "@/contexts/AuthContext";
import {useSync} from "@/hooks/useSync";

export const useAutoSync = () => {
    const { user } = useAuth();
    const auth = useContext(AuthContext);
    const userContext = useContext(UserContext);
    const { fullSync } = useSync();
    const hasAutoSynced = useRef(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const fullSyncRef = useRef(fullSync);

    useEffect(() => {
        fullSyncRef.current = fullSync;
    }, [fullSync]);

    useEffect(() => {
        // Skip sync if offline
        if (userContext?.isOffline) {
            logger.debug('Auto-sync: Skipping — device is offline');
            return;
        }

        if (user && auth?.session && !hasAutoSynced.current) {
            logger.debug('Auto-sync: Starting for user:', user.id);
            hasAutoSynced.current = true;

            setIsSyncing(true);
            fullSyncRef.current()
                .then(() => logger.debug('Auto-sync: Completed'))
                .catch(error => logger.error('Auto-sync: Failed', error))
                .finally(() => setIsSyncing(false));
        }

        if (!user) {
            hasAutoSynced.current = false;
        }
    }, [user, auth?.session, userContext?.isOffline]);

    return { isSyncing };
};
