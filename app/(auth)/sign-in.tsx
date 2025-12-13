import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function SignIn() {
    const { signIn } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const onSubmit = async () => {
        try {
            setSubmitting(true);
            await signIn(email, password);
            
            // Wait a bit for the profile to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            router.replace("/(tabs)");
        } catch (e: any) {
            Alert.alert("Sign in failed", e?.message ?? "Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-white p-6">
            <Text className="text-2xl font-semibold mb-6">Welcome back</Text>

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
            <View className="relative mb-4">
                <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-3 pr-12"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3"
                    style={{ padding: 4 }}
                >
                    <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={24} 
                        color="#6B7280" 
                    />
                </TouchableOpacity>
            </View>

            <Pressable
                onPress={onSubmit}
                disabled={submitting}
                className="bg-[#134a86] rounded-lg px-4 py-3 items-center"
            >
                {submitting ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-medium">Sign In</Text>
                )}
            </Pressable>

            <View className="flex-row justify-between mt-4">
                <Link href="/(auth)/forgot-password">
                    <Text className="text-[#134a86]">Forgot password?</Text>
                </Link>
                <Link href="/(auth)/sign-up">
                    <Text className="text-[#134a86]">Create account</Text>
                </Link>
            </View>
        </View>
    );
}