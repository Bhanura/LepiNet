import { useAuth } from "@/context/AuthContext";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";

export default function Profile() {
    const { user, profile, signOut, refreshProfile } = useAuth();
    const router = useRouter();

    useFocusEffect(
        useCallback(() => {
            if (user) {
                refreshProfile();
            }
        }, [user])
    );

    if (!user) {
        return (
            <View className="flex-1 bg-white p-6 justify-center items-center">
                <Text className="text-gray-600">Not signed in</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-white">
            <View className="p-6">
                <Text className="text-2xl font-semibold mb-6">My Profile</Text>

                {/* Profile Avatar with Photo or Initial */}
                <View className="items-center mb-6">
                    {profile?.profile_photo_url ? (
                        <Image
                            source={{ uri: profile.profile_photo_url }}
                            className="w-32 h-32 rounded-full"
                            style={{ backgroundColor: '#e5e7eb' }}
                        />
                    ) : (
                        <View className="w-32 h-32 rounded-full bg-[#134a86] justify-center items-center">
                            <Text className="text-white text-5xl font-bold">
                                {profile?.first_name?.[0]?.toUpperCase() || "?"}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Profile Information */}
                {profile ? (
                    <View className="space-y-4 mb-6">
                        <View className="border-b border-gray-200 pb-3">
                            <Text className="text-sm text-gray-500 mb-1">Full Name</Text>
                            <Text className="text-base text-gray-800 font-medium">
                                {profile.first_name} {profile.last_name}
                            </Text>
                        </View>

                        <View className="border-b border-gray-200 pb-3">
                            <Text className="text-sm text-gray-500 mb-1">Email</Text>
                            <Text className="text-base text-gray-800 font-medium">
                                {profile.email}
                            </Text>
                        </View>

                        {profile.mobile && (
                            <View className="border-b border-gray-200 pb-3">
                                <Text className="text-sm text-gray-500 mb-1">Mobile</Text>
                                <Text className="text-base text-gray-800 font-medium">
                                    {profile.mobile}
                                </Text>
                            </View>
                        )}

                        {profile.birthday && (
                            <View className="border-b border-gray-200 pb-3">
                                <Text className="text-sm text-gray-500 mb-1">Birthday</Text>
                                <Text className="text-base text-gray-800 font-medium">
                                    {profile.birthday}
                                </Text>
                            </View>
                        )}

                        {profile.gender && (
                            <View className="border-b border-gray-200 pb-3">
                                <Text className="text-sm text-gray-500 mb-1">Gender</Text>
                                <Text className="text-base text-gray-800 font-medium">
                                    {profile.gender}
                                </Text>
                            </View>
                        )}

                        {profile.educational_level && (
                            <View className="border-b border-gray-200 pb-3">
                                <Text className="text-sm text-gray-500 mb-1">Education Level</Text>
                                <Text className="text-base text-gray-800 font-medium">
                                    {profile.educational_level}
                                </Text>
                            </View>
                        )}

                        <View className="border-b border-gray-200 pb-3">
                            <Text className="text-sm text-gray-500 mb-1">User ID</Text>
                            <Text className="text-xs text-gray-600 font-mono">
                                {user.id}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View className="items-center py-8">
                        <ActivityIndicator size="large" color="#134a86" />
                        <Text className="text-gray-600 mt-4">Loading profile...</Text>
                    </View>
                )}

                {/* Edit Profile Button */}
                <Pressable
                    onPress={() => router.push("/(tabs)/edit-profile")}
                    className="bg-[#134a86] rounded-lg px-4 py-3 mb-3"
                >
                    <Text className="text-white font-medium text-center">Edit My Profile</Text>
                </Pressable>

                {/* Sign Out Button */}
                <Pressable
                    onPress={signOut}
                    className="bg-red-600 rounded-lg px-4 py-3"
                >
                    <Text className="text-white font-medium text-center">Sign Out</Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}