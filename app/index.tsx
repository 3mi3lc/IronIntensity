import { useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import 'react-native-get-random-values';
import * as schema from '@/db/schema';

export default function Index() {
    const db = useSQLiteContext();
    const drizzleDb = drizzle(db, { schema });

    useEffect(() => {
        async function init() {
            // Optional: do some database setup or queries here with drizzleDb

            const { data } = await supabase.auth.getSession();
            router.replace(data.session ? '/(tabs)/logging' : '/auth/login');
        }
        init();
    }, []);

    return (
        <View className="flex-1 justify-center items-center bg-black">
            <ActivityIndicator size="large" color="#f95e3d" />
        </View>
    );
}
