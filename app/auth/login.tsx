import React, { useState } from 'react';
import { Alert, View, TextInput, Text, Pressable } from 'react-native';
import { supabase } from '@/utils/supabase';
import { router } from 'expo-router';
import '../globals.css'

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signInWithEmail() {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            Alert.alert(error.message);
            setLoading(false);
            return;
        }

        // Optional: log user info
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error("Error fetching user after sign-in:", userError.message);
        } else {
            console.log("User logged in:", userData.user);
        }

        setLoading(false);

        // ✅ Redirect to the app
        router.replace('/(tabs)/logging');
    }


    async function signUpWithEmail() {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            Alert.alert('Signup failed', error.message);
        } else {
            if (!session) {
                Alert.alert('Check your inbox to verify your email');
            } else {
                Alert.alert('Signup successful!');
            }
        }
        setLoading(false);
    }


    return (
        <View className="flex-1 justify-center items-center bg-surface_a10 px-6">
            <View className="w-full max-w-md">
                <Text className="text-white text-3xl font-bold mb-8 text-center">Welcome</Text>

                <View className="mb-4">
                    <Text className="text-white mb-1">Email</Text>
                    <TextInput
                        className="bg-surface_a20 text-white px-3 py-2 rounded-md border border-surface_a30"
                        placeholder="email@address.com"
                        placeholderTextColor="#8b8b8b"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                    />
                </View>

                <View className="mb-6">
                    <Text className="text-white mb-1">Password</Text>
                    <TextInput
                        className="bg-surface_a20 text-white px-3 py-2 rounded-md border border-surface_a30"
                        placeholder="Password"
                        placeholderTextColor="#8b8b8b"
                        secureTextEntry
                        autoCapitalize="none"
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <Pressable
                    onPress={signInWithEmail}
                    disabled={loading}
                    className={`mb-4 rounded-md py-3 ${
                        loading ? 'bg-primary_a20' : 'bg-primary_a0'
                    }`}
                >
                    <Text className="text-white text-center font-semibold text-lg">Login</Text>
                </Pressable>

                <Pressable
                    onPress={signUpWithEmail}
                    disabled={loading}
                    className={`rounded-md py-3 ${
                        loading ? 'bg-primary_a20' : 'bg-primary_a0'
                    }`}
                >
                    <Text className="text-white text-center font-semibold text-lg">Sign Up</Text>
                </Pressable>
            </View>
        </View>
    );
}
