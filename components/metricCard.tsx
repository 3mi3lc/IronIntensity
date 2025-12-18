// components/MetricCard.tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

type IconSource = 'AntDesign' | 'MaterialIcons';

interface MetricCardProps {
    isSelected: boolean;
    onPress: () => void;
    iconSource: IconSource;
    iconName: string;
    value: string;
    label: string;
    sublabel: string;
    sublabelColor?: 'green' | 'red' | 'white' | 'default';
}

export const MetricCard: React.FC<MetricCardProps> = ({
                                                          isSelected,
                                                          onPress,
                                                          iconSource,
                                                          iconName,
                                                          value,
                                                          label,
                                                          sublabel,
                                                          sublabelColor = 'default',
                                                      }) => {
    const Icon = iconSource === 'AntDesign' ? AntDesign : MaterialIcons;

    const getSublabelColorClass = () => {
        if (isSelected) return 'text-white';

        switch (sublabelColor) {
            case 'green': return 'text-green-400';
            case 'red': return 'text-red-400';
            case 'white': return 'text-white';
            default: return 'text-surface_a50';
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            className={`w-36 mr-3 p-4 rounded-xl ${
                isSelected ? 'bg-primary_a0' : 'bg-surface_a10'
            }`}
            activeOpacity={0.8}
        >
            <Icon
                name={iconName as any}
                size={20}
                color={isSelected ? 'white' : '#f34023'}
            />
            <Text className={`text-xl font-bold mt-2 ${
                isSelected ? 'text-white' : 'text-light'
            }`}>
                {value}
            </Text>
            <Text className={`text-xs mt-1 ${
                isSelected ? 'text-white/70' : 'text-surface_a50'
            }`}>
                {label}
            </Text>
            <Text className={`text-xs font-semibold mt-1 ${getSublabelColorClass()}`}>
                {sublabel}
            </Text>
        </TouchableOpacity>
    );
};