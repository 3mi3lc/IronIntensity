import { Platform } from 'react-native';
import { supabase } from '@/utils/supabase';

/**
 * Upsert this device's Expo push token so the backend can target the user with
 * remote push. Goes through a security-definer RPC so a device switching users
 * reassigns cleanly. Online-only.
 */
export async function registerPushToken(token: string): Promise<void> {
    const { error } = await supabase.rpc('register_push_token', {
        p_token: token,
        p_platform: Platform.OS,
    });
    if (error) throw new Error(error.message);
}

/** Remove this user's push tokens (e.g. when they turn push off). */
export async function clearPushTokens(userId: string): Promise<void> {
    const { error } = await supabase.from('push_tokens').delete().eq('user_id', userId);
    if (error) throw new Error(error.message);
}
