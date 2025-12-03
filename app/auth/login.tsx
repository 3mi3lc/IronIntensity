// app/auth/login.tsx
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {useContext, useEffect, useState} from 'react';
import { UserContext } from '@/contexts/UserContext';
import { AntDesign } from '@expo/vector-icons';
import '../globals.css';

export default function Login() {
    const router = useRouter();
    const { signIn, signUp, user } = useContext(UserContext) ?? {};

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            console.log('Login: User detected, navigating to app...');
            router.replace('/(tabs)/logging');
        }
    }, [user]);


    const handleAuth = async () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        if (isSignUp && !username.trim()) {
            Alert.alert('Error', 'Please enter a username');
            return;
        }

        setIsLoading(true);
        try {
            console.log('Starting auth...', isSignUp ? 'Sign Up' : 'Sign In');

            if (isSignUp && signUp) {
                console.log('Calling signUp...');
                const { error } = await signUp(email.trim(), password, username.trim());
                console.log('SignUp result:', { error });

                if (error) {
                    Alert.alert('Sign Up Failed', error);
                } else {
                    Alert.alert(
                        'Success!',
                        'Account created! Please check your email to verify your account.',
                        [{ text: 'OK', onPress: () => setIsSignUp(false) }]
                    );
                }
            } else if (signIn) {
                console.log('Calling signIn...');
                const { error } = await signIn(email.trim(), password);
                console.log('SignIn result:', { error });

                if (error) {
                    Alert.alert('Login Failed', error);
                } else {
                    console.log('Login successful, waiting for navigation...');
                    // Navigation happens automatically via UserContext
                }
            }
        } catch (error: any) {
            console.error('Auth error:', error);
            Alert.alert('Error', error.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-surface_a0"
        >
            <View className="flex-1 justify-center px-6">
                {/* Header */}
                <View className="items-center mb-12">
                    <View className="bg-primary_a0 w-20 h-20 rounded-full items-center justify-center mb-4">
                        <AntDesign name="trophy" size={40} color="white" />
                    </View>
                    <Text className="text-white text-4xl font-bold">Iron Intensity</Text>
                    <Text className="text-surface_a50 text-lg mt-2">Track Your Strength Journey</Text>
                </View>

                {/* Form Card */}
                <View className="bg-surface_a10 rounded-3xl p-6 shadow-lg">
                    {/* Toggle Tabs */}
                    <View className="flex-row bg-surface_a20 rounded-xl p-1 mb-6">
                        <TouchableOpacity
                            onPress={() => setIsSignUp(false)}
                            className={`flex-1 py-3 rounded-lg ${!isSignUp ? 'bg-primary_a0' : ''}`}
                            activeOpacity={0.8}
                        >
                            <Text className={`text-center font-bold ${!isSignUp ? 'text-white' : 'text-surface_a50'}`}>
                                Login
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setIsSignUp(true)}
                            className={`flex-1 py-3 rounded-lg ${isSignUp ? 'bg-primary_a0' : ''}`}
                            activeOpacity={0.8}
                        >
                            <Text className={`text-center font-bold ${isSignUp ? 'text-white' : 'text-surface_a50'}`}>
                                Sign Up
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Email Input */}
                    <View className="mb-4">
                        <Text className="text-surface_a50 mb-2 ml-1">Email</Text>
                        <View className="bg-surface_a20 rounded-xl px-4 py-3 flex-row items-center">
                            <AntDesign name="mail" size={20} color="#8b8b8b" />
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="your@email.com"
                                placeholderTextColor="#8b8b8b"
                                className="flex-1 text-white ml-3"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>
                    </View>

                    {/* Username Input (Sign Up only) */}
                    {isSignUp && (
                        <View className="mb-4">
                            <Text className="text-surface_a50 mb-2 ml-1">Username</Text>
                            <View className="bg-surface_a20 rounded-xl px-4 py-3 flex-row items-center">
                                <AntDesign name="user" size={20} color="#8b8b8b" />
                                <TextInput
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Choose a username"
                                    placeholderTextColor="#8b8b8b"
                                    className="flex-1 text-white ml-3"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    )}

                    {/* Password Input */}
                    <View className="mb-6">
                        <Text className="text-surface_a50 mb-2 ml-1">Password</Text>
                        <View className="bg-surface_a20 rounded-xl px-4 py-3 flex-row items-center">
                            <AntDesign name="lock" size={20} color="#8b8b8b" />
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                placeholderTextColor="#8b8b8b"
                                className="flex-1 text-white ml-3"
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        onPress={handleAuth}
                        disabled={isLoading}
                        className={`py-4 rounded-xl ${isLoading ? 'bg-surface_a30' : 'bg-primary_a0'}`}
                        activeOpacity={0.8}
                    >
                        <Text className="text-white text-center font-bold text-lg">
                            {isLoading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Login'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <Text className="text-surface_a50 text-center mt-8">
                    {isSignUp
                        ? 'By signing up, you agree to our Terms & Privacy Policy'
                        : 'Forgot password? Contact support'}
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}