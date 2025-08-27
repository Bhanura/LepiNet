import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function SignUp() {
    const { signUp } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async () => {
        try {
            setSubmitting(true);
            await signUp(email, password, displayName || undefined);
            router.replace("/(tabs)");
        } catch (e: any) {
            Alert.alert("Sign up failed", e?.message ?? "Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-white p-6">
            <Text className="text-2xl font-semibold mb-6">Create your account</Text>

            <Text className="text-sm text-gray-700 mb-2">Name (optional)</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
            />

            <Text className="text-sm text-gray-700 mb-2">Email</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
            />

            <Text className="text-sm text-gray-700 mb-2">Password</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
            />

            <Pressable
                onPress={onSubmit}
                disabled={submitting}
                className="bg-[#134a86] rounded-lg px-4 py-3 items-center"
            >
                <Text className="text-white font-medium">
                    {submitting ? "Creating..." : "Create Account"}
                </Text>
            </Pressable>

            <View className="flex-row justify-end mt-4">
                <Link href="/(auth)/sign-in">
                    <Text className="text-[#134a86]">Already have an account? Sign in</Text>
                </Link>
            </View>
        </View>
    );
}