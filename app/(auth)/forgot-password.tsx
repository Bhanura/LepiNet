import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPassword() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async () => {
        try {
            setSubmitting(true);
            await resetPassword(email);
            Alert.alert("Email sent", "Check your inbox for password reset instructions.");
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Unable to send reset email.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-white p-6">
            <Text className="text-2xl font-semibold mb-6">Reset your password</Text>

            <Text className="text-sm text-gray-700 mb-2">Email</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
            />

            <Pressable
                onPress={onSubmit}
                disabled={submitting}
                className="bg-[#134a86] rounded-lg px-4 py-3 items-center"
            >
                <Text className="text-white font-medium">
                    {submitting ? "Sending..." : "Send reset email"}
                </Text>
            </Pressable>

            <View className="mt-4">
                <Link href="/(auth)/sign-in">
                    <Text className="text-[#134a86]">Back to sign in</Text>
                </Link>
            </View>
        </View>
    );
}