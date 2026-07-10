import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Shared accent for all loading states (primary_a10). Matches the sync
// indicator so every spinner in the app reads as the same element.
const ACCENT = '#f34023';

interface LoadingScreenProps {
    /** Primary line under the spinner. Pass null to show the spinner only. */
    message?: string | null;
    /** Optional secondary line, e.g. "Offline mode". */
    subMessage?: string;
    /**
     * Wrap the output in a SafeAreaView. Keep the default for a full-screen
     * loader; set false when rendering below an existing header or already
     * inside a SafeAreaView.
     */
    safeArea?: boolean;
}

/**
 * The single loading screen used across the app: a centered card with a
 * spinner and message on the dark surface. Use this instead of hand-rolling
 * ActivityIndicator / "Loading..." blocks so every loading state looks the same.
 */
export function LoadingScreen({ message = 'Loading...', subMessage, safeArea = true }: LoadingScreenProps) {
    const body = (
        <View className="flex-1 justify-center items-center bg-surface_a0">
            <View className="bg-surface_a10 px-10 py-8 rounded-2xl items-center">
                <ActivityIndicator size="large" color={ACCENT} />
                {message ? (
                    <Text className="text-white text-xl font-bold mt-4 text-center">{message}</Text>
                ) : null}
                {subMessage ? (
                    <Text className="text-surface_a50 text-sm mt-2 text-center">{subMessage}</Text>
                ) : null}
            </View>
        </View>
    );

    if (!safeArea) return body;

    return (
        <SafeAreaView className="flex-1 bg-surface_a0" edges={['top', 'left', 'right']}>
            {body}
        </SafeAreaView>
    );
}
