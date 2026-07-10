import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

/**
 * Lightweight, dependency-free confetti burst rendered at the app root.
 *
 * Mount a single <ConfettiOverlay /> near the root (next to <Toast />) and fire
 * it imperatively from anywhere with `Confetti.fire()`. Because it lives at the
 * root it survives navigation, so it can be triggered right as the finish flow
 * pushes back to the logging screen.
 */

let fireImpl: (() => void) | null = null;

export const Confetti = {
    fire: () => fireImpl?.(),
};

const COLORS = ['#f34023', '#ff7857', '#ffd166', '#06d6a0', '#4cc9f0', '#ffffff'];
const PIECE_COUNT = 28;
const DURATION = 2400;

interface PieceSpec {
    startX: number;
    driftX: number;
    delay: number;
    color: string;
    size: number;
    rotations: number;
    startY: number;
}

function makePieces(width: number, height: number): PieceSpec[] {
    return Array.from({ length: PIECE_COUNT }, () => ({
        startX: Math.random() * width,
        driftX: (Math.random() - 0.5) * 160,
        delay: Math.random() * 400,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        rotations: 2 + Math.random() * 4,
        startY: -40 - Math.random() * height * 0.15,
    }));
}

const ConfettiPiece: React.FC<{ spec: PieceSpec; fallTo: number }> = ({ spec, fallTo }) => {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const anim = Animated.timing(progress, {
            toValue: 1,
            duration: DURATION,
            delay: spec.delay,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
        });
        anim.start();
        return () => anim.stop();
    }, [progress, spec.delay]);

    const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [spec.startY, fallTo],
    });
    const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, spec.driftX],
    });
    const rotate = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', `${spec.rotations * 360}deg`],
    });
    const opacity = progress.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [1, 1, 0],
    });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: spec.startX,
                width: spec.size,
                height: spec.size * 1.6,
                borderRadius: 2,
                backgroundColor: spec.color,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
            }}
        />
    );
};

export const ConfettiOverlay: React.FC = () => {
    const { width, height } = Dimensions.get('window');
    const [burst, setBurst] = useState<{ id: number; pieces: PieceSpec[] } | null>(null);
    const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fireImpl = () => {
            if (clearTimer.current) clearTimeout(clearTimer.current);
            setBurst({ id: Date.now(), pieces: makePieces(width, height) });
            clearTimer.current = setTimeout(() => setBurst(null), DURATION + 500);
        };
        return () => {
            fireImpl = null;
            if (clearTimer.current) clearTimeout(clearTimer.current);
        };
    }, [width, height]);

    if (!burst) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {burst.pieces.map((spec, i) => (
                <ConfettiPiece key={`${burst.id}-${i}`} spec={spec} fallTo={height + 40} />
            ))}
        </View>
    );
};
