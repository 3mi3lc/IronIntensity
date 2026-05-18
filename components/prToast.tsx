import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';

interface PRToastProps {
    visible: boolean;
    weight: number;
    reps: number;
    onHide: () => void;
}

export const PRToast = ({ visible, weight, reps, onHide }: PRToastProps) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(translateY, {
                        toValue: -20,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start(() => onHide());
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View
            style={{
                opacity,
                transform: [{ translateY }],
                position: 'absolute',
                top: 60,
                left: 24,
                right: 24,
                zIndex: 999,
            }}
        >
            <View
                style={{
                    backgroundColor: '#f34023',
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
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
                        New Personal Record! 🏆
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>
                        {weight}kg × {reps} reps
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};