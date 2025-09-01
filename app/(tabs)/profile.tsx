import { View, Text, Pressable } from "react-native";
import { useAuth } from "@/context/AuthContext";

export default function Profile() {
    const { user, signOut } = useAuth();

    return (
        <View className="flex-1 bg-white p-6">
            <Text className="text-2xl font-semibold mb-4">Account</Text>

            {user ? (
                <View className="space-y-2 mb-6">
                    <Text className="text-gray-800">
                        Name: <Text className="font-medium">{user.displayName ?? "-"}</Text>
                    </Text>
                    <Text className="text-gray-800">
                        Email: <Text className="font-medium">{user.email}</Text>
                    </Text>
                    <Text className="text-gray-800">
                        UID: <Text className="font-mono">{user.uid}</Text>
                    </Text>
                </View>
            ) : (
                <Text className="text-gray-600 mb-6">Not signed in</Text>
            )}

            <Pressable
                onPress={signOut}
                className="bg-red-600 rounded-lg px-4 py-3 self-start"
            >
                <Text className="text-white font-medium">Sign Out</Text>
            </Pressable>
        </View>
    );
}

