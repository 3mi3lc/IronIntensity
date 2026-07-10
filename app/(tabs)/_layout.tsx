// app/(tabs)/_layout.tsx
import React from 'react'
import {Tabs} from "expo-router";
import {icons} from "@/constants/icons";
import {Image, View } from "react-native";
import {AntDesign} from "@expo/vector-icons";

const TabIcon = ({focused, icon} : any) => {
    return (
        <View className="items-center">
            <Image source={icon} className="size-7"/>
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
                tabBarIcon: ({focused}) => (
                    <TabIcon focused={focused} icon={icons.log_icon}></TabIcon>
                )
            }}></Tabs.Screen>

            <Tabs.Screen name="statistics"  options={{
                headerShown: false,
                title: 'Stats',
                tabBarIcon: ({focused}) => (
                    <TabIcon focused={focused} icon={icons.stats_icon}></TabIcon>
                )
            }} />

            <Tabs.Screen name="communities"  options={{
                headerShown: false,
                title: 'Community',
                tabBarIcon: ({focused}) => (
                    <View className="items-center">
                        <AntDesign name="team" size={26} color={focused ? '#eb0202' : '#9ca3af'} />
                    </View>
                )
            }}/>

            <Tabs.Screen name="profile"  options={{
                headerShown: false,
                title: 'Profile',
                tabBarIcon: ({focused}) => (
                    <TabIcon focused={focused} icon={icons.profile_icon}></TabIcon>
                )
            }}/>
        </Tabs>
    )
}
export default _Layout
