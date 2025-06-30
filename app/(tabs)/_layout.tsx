import React from 'react'
import {Tabs} from "expo-router";
import {icons} from "@/constants/icons";
import {Image, ImageBackground, View, Text} from "react-native";

const _Layout = () => {
    return (
        <Tabs>
            <Tabs.Screen name="logging"  options={{
                headerShown: false,
                title: "Log",
                tabBarIcon: ({focused}) => (
                    <View className="items-center">
                        <Image source={icons.log_icon} className="size-5"/>
                        {focused && <Text className="text-xs text-blue-600">Log</Text>}
                    </View>
                )
            }}></Tabs.Screen>

            <Tabs.Screen name="statistics"  options={{
                headerShown: false,
                title: 'Stats',
                tabBarIcon: ({focused}) => (
                    <>
                        <Image source={icons.stats_icon} className="size-5"></Image>
                    </>
                )
            }} />

            <Tabs.Screen name="profile"  options={{
                headerShown: false,
                title: 'Profile',
                tabBarIcon: ({focused}) => (
                    <>
                        <Image source={icons.profile_icon} className="size-5"></Image>
                    </>
                )
            }}/>
        </Tabs>
    )
}
export default _Layout
