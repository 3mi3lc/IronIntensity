import {View, Text} from 'react-native'
import React from 'react'
import {Tabs} from "expo-router";

const _Layout = () => {
    return (
        <Tabs>
            <Tabs.Screen name="logging"  options={{
                headerShown: false,
                title: 'Log'
            }} />
            <Tabs.Screen name="statistics"  options={{
                headerShown: false,
                title: 'Stats'
            }} />
            <Tabs.Screen name="profile"  options={{
                headerShown: false,
                title: 'Profile'
            }}/>
        </Tabs>
    )
}
export default _Layout
