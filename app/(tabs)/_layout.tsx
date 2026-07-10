// app/(tabs)/_layout.tsx
import React from 'react'
import {Tabs} from "expo-router";
import {View} from "react-native";
import {AntDesign, Ionicons} from "@expo/vector-icons";

type AntDesignName = React.ComponentProps<typeof AntDesign>['name'];

const TabIcon = ({name}: {name: AntDesignName}) => {
    return (
        <View className="items-center">
            <AntDesign name={name} size={28} color="#eb0202" />
        </View>
    )
}

const _Layout = () => {
    return (
        <Tabs screenOptions={{
            tabBarStyle: {
                backgroundColor: '#121212',  // fully transparent background
                borderTopWidth: 0,                // no border
                elevation: 0,                    // no shadow Android
                shadowOpacity: 10,                // no shadow iOS
                position: 'absolute',            // make it float on top
                left: 0,
                right: 0,
                bottom: 0,
                paddingBottom: 0,
                paddingTop: 5,
                height: 70,
            },
            tabBarActiveTintColor: '#eb0202', // active icon/text color
            tabBarInactiveTintColor: '#9ca3af', // inactive icon/text color
        }}
        >
            <Tabs.Screen name="logging"  options={{
                headerShown: false,
                title: "Log",
                tabBarIcon: () => (
                    <View className="items-center">
                        <Ionicons name="calendar-outline" size={28} color="#eb0202" />
                    </View>
                )
            }}></Tabs.Screen>

            <Tabs.Screen name="statistics"  options={{
                headerShown: false,
                title: 'Stats',
                tabBarIcon: () => (
                    <TabIcon name="bar-chart" />
                )
            }} />

            <Tabs.Screen name="communities"  options={{
                headerShown: false,
                title: 'Community',
                tabBarIcon: () => (
                    <TabIcon name="team" />
                )
            }}/>

            <Tabs.Screen name="profile"  options={{
                headerShown: false,
                title: 'Profile',
                tabBarIcon: () => (
                    <TabIcon name="user" />
                )
            }}/>
        </Tabs>
    )
}
export default _Layout
