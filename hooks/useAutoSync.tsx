import { useEffect, useRef, useState, useContext } from 'react';
import { useAuth } from './useAuth';
import { useSync } from './useSync';
import { AuthContext } from '@/contexts/AuthContext';

export const useAutoSync = () => {
    const { user } = useAuth();
    const auth = useContext(AuthContext);
    const { fullSync } = useSync();
    const hasAutoSynced = useRef(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const fullSyncRef = useRef(fullSync);

    // Keep ref up to date without triggering effect
    useEffect(() => {
        fullSyncRef.current = fullSync;
    }, [fullSync]);

    useEffect(() => {
        if (user && auth?.session && !hasAutoSynced.current) {
            console.log('Auto-sync: Starting for user:', user.id);
            hasAutoSynced.current = true;

            setIsSyncing(true);
            fullSyncRef.current() // ✅ use ref, not the value directly
                .then(() => console.log('Auto-sync: Completed'))
                .catch(error => console.error('Auto-sync: Failed', error))
                .finally(() => setIsSyncing(false));
        }

        if (!user) {
            hasAutoSynced.current = false;
        }
    }, [user, auth?.session]); // fullSync no longer in deps

    return { isSyncing };
};