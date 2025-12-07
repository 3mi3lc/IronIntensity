import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useSync } from './useSync';

export const useAutoSync = () => {
    const { user } = useAuth();
    const { fullSync } = useSync();
    const hasAutoSynced = useRef(false);

    useEffect(() => {
        if (user && !hasAutoSynced.current) {
            console.log('Auto-sync: Starting for user:', user.id);
            hasAutoSynced.current = true;

            fullSync()
                .then(() => console.log('Auto-sync: Completed'))
                .catch(error => console.error('Auto-sync: Failed', error));
        }

        if (!user) {
            hasAutoSynced.current = false;
        }
    }, [user]);
};