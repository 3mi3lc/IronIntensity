// utils/themedAlert.tsx
//
// Drop-in themed replacement for react-native's Alert. Exposes the same
// `Alert.alert(title, message?, buttons?)` signature so call sites only need to
// swap their import from 'react-native' to '@/utils/themedAlert'. Rendering is
// handled by a single <ThemedAlertHost /> mounted at the app root, styled to
// match the app (surface_a10 card, primary_a0 accent) instead of the stock
// Android dialog.
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AlertButton {
    text?: string;
    onPress?: () => void;
    style?: AlertButtonStyle;
}

interface AlertConfig {
    title: string;
    message?: string;
    buttons: AlertButton[];
}

type Listener = (config: AlertConfig) => void;

let listener: Listener | null = null;

function alert(title: string, message?: string, buttons?: AlertButton[]) {
    const config: AlertConfig = {
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }],
    };
    if (listener) {
        listener(config);
    } else if (__DEV__) {
        // Host not mounted (e.g. very early startup); fail loud in dev only.
        console.warn('ThemedAlertHost is not mounted; alert dropped:', title, message);
    }
}

/** Same shape as react-native's Alert, but themed. */
export const Alert = { alert };

/**
 * Mount once near the app root, inside the providers. Listens for imperative
 * `Alert.alert(...)` calls and renders them as themed modals.
 */
export function ThemedAlertHost() {
    const [config, setConfig] = useState<AlertConfig | null>(null);

    useEffect(() => {
        listener = (c) => setConfig(c);
        return () => {
            listener = null;
        };
    }, []);

    const close = useCallback(() => setConfig(null), []);

    if (!config) return null;

    const { title, message, buttons } = config;

    // Keep declared order, but push any cancel button to the bottom.
    const ordered = [
        ...buttons.filter((b) => b.style !== 'cancel'),
        ...buttons.filter((b) => b.style === 'cancel'),
    ];

    // The "primary" (accented) action: the destructive one if present,
    // otherwise the last non-cancel button (the main call to action).
    const nonCancel = ordered.filter((b) => b.style !== 'cancel');
    const destructive = nonCancel.find((b) => b.style === 'destructive');
    const primary = destructive ?? nonCancel[nonCancel.length - 1];

    const handlePress = (b: AlertButton) => {
        close();
        b.onPress?.();
    };

    const handleBackdrop = () => {
        const cancelBtn = buttons.find((b) => b.style === 'cancel');
        close();
        cancelBtn?.onPress?.();
    };

    // Icon only for message-bearing alerts (info/confirm); action-sheet style
    // menus (no message) read cleaner without one.
    const showIcon = !!message;
    const iconName = destructive ? 'warning' : 'info';

    return (
        <Modal animationType="fade" transparent visible onRequestClose={handleBackdrop}>
            <Pressable
                onPress={handleBackdrop}
                className="flex-1 justify-center items-center bg-black/60 px-6"
            >
                <Pressable
                    onPress={(e) => e.stopPropagation()}
                    className="bg-surface_a10 rounded-2xl w-full max-w-sm p-6"
                    style={{
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8,
                    }}
                >
                    {showIcon && (
                        <View className="items-center mb-4">
                            <View className="bg-primary_a0/20 p-4 rounded-full">
                                <AntDesign name={iconName} size={36} color="#eb0202" />
                            </View>
                        </View>
                    )}

                    <Text className="text-white font-bold text-xl text-center mb-2">{title}</Text>

                    {message ? (
                        <Text className="text-surface_a50 text-center text-base mb-6">{message}</Text>
                    ) : (
                        <View className="mb-4" />
                    )}

                    <ScrollView
                        className="max-h-96"
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="gap-y-3">
                            {ordered.map((b, i) => {
                                const isPrimary = b === primary;
                                const isCancel = b.style === 'cancel';
                                const bg = isPrimary
                                    ? 'bg-primary_a0'
                                    : 'bg-surface_a20';
                                const textColor = isCancel
                                    ? 'text-surface_a50'
                                    : 'text-white';
                                const weight = isPrimary ? 'font-bold' : 'font-semibold';
                                return (
                                    <Pressable
                                        key={`${b.text}-${i}`}
                                        onPress={() => handlePress(b)}
                                        className={`${bg} py-4 rounded-xl active:opacity-80`}
                                    >
                                        <Text className={`${textColor} ${weight} text-base text-center`}>
                                            {b.text ?? 'OK'}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
