import React from 'react';
import { View, Text } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { BaseToastProps } from 'react-native-toast-message';

export const toastConfig = {
    pr: ({ text1, text2 }: BaseToastProps) => (
        <View
            style={{
                backgroundColor: '#f34023',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: 24,
                shadowColor: '#f34023',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
            }}
        >
            <AntDesign name="star" size={24} color="white" />
            <View>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                    {text1}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>
                    {text2}
                </Text>
            </View>
        </View>
    ),

    celebration: ({ text1, text2 }: BaseToastProps) => (
        <View
            style={{
                backgroundColor: '#282828',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: 24,
                borderWidth: 1,
                borderColor: 'rgba(243,64,35,0.4)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
            }}
        >
            {!!text2 && <Text style={{ fontSize: 28 }}>{text2}</Text>}
            <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
                    {text1}
                </Text>
            </View>
        </View>
    ),

    achievement: ({ text1, text2 }: BaseToastProps) => (
        <View
            style={{
                backgroundColor: '#282828',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                marginHorizontal: 24,
                borderWidth: 1,
                borderColor: '#f34023',
                shadowColor: '#f34023',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
            }}
        >
            <Text style={{ fontSize: 32 }}>{text2}</Text>
            <View style={{ flex: 1 }}>
                <Text style={{ color: '#f34023', fontWeight: 'bold', fontSize: 12, marginBottom: 2 }}>
                    ACHIEVEMENT UNLOCKED
                </Text>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                    {text1}
                </Text>
            </View>
        </View>
    ),
};