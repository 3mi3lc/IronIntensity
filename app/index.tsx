import { useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import './globals.css'

export default function Index() {
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                router.replace('/(tabs)/logging');
            } else {
                router.replace('/auth/login');
            }
        });
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
