import { Image } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { icons } from "@/constants/icons";

const _layout = () => {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    height: 80, // Increase tab bar height
                    paddingBottom: 10,
                    paddingTop: 10,
                },
                tabBarLabelStyle: {
                    fontSize: 14,
                },
                tabBarActiveTintColor: "#134a86",   // Active icon/text color
                tabBarInactiveTintColor: "#999999", // Inactive icon/text color
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Check List",
                    tabBarIcon: ({ color }) => (
                        <Image
                            source={icons.checklist}
                            className="w-6 h-6"
                            style={{ tintColor: color }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: "Explore",
                    tabBarIcon: ({ color }) => (
                        <Image
                            source={icons.explore}
                            className="w-6 h-6"
                            style={{ tintColor: color }}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color }) => (
                        <Image
                            source={icons.profile}
                            className="w-6 h-6"
                            style={{ tintColor: color }}
                        />
                    ),
                }}
            />
        </Tabs>
    );
};

export default _layout;
