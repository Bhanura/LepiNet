import { useAuth } from "@/context/AuthContext";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from "expo-image-picker";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function SignUp() {
    const { signUp } = useAuth();
    const router = useRouter();
    
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [mobile, setMobile] = useState("");
    const [birthday, setBirthday] = useState("");
    const [gender, setGender] = useState("");
    const [educationalLevel, setEducationalLevel] = useState("");
    const [password, setPassword] = useState("");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const onSubmit = async () => {
        // Validation
        if (!firstName || !lastName || !email || !password) {
            Alert.alert("Missing fields", "Please fill in all required fields.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Weak password", "Password must be at least 6 characters.");
            return;
        }
        
        try {
            setSubmitting(true);
            
            console.log("Starting signup process...");
            
            await signUp(
                email,
                password,
                imageUri,
                {
                    firstName,
                    lastName,
                    mobile,
                    birthday,
                    gender,
                    educationalLevel,
                }
            );
            
            console.log("Signup successful!");
            
            Alert.alert(
                "Sign up successful", 
                "Please check your email to verify your account before logging in.",
                [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
            );
            
        } catch (e: any) {
            console.error("Signup error:", e);
            Alert.alert("Sign up failed", e?.message ?? "Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
            <Text className="text-2xl font-semibold mb-6">Create your account</Text>

            <Text className="text-sm text-gray-700 mb-2">First Name*</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Your first name"
            />

            <Text className="text-sm text-gray-700 mb-2">Last Name*</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Your last name"
            />

            <Text className="text-sm text-gray-700 mb-2">Email*</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
            />

            <Text className="text-sm text-gray-700 mb-2">Password*</Text>
            <View className="relative mb-4">
                <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-3 pr-12"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
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

            <View className="border-t border-gray-200 my-4" />

            <Text className="text-lg font-semibold mb-4">Optional Details</Text>

            <Text className="text-sm text-gray-700 mb-2">Mobile Number</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                keyboardType="phone-pad"
                value={mobile}
                onChangeText={setMobile}
                placeholder="+94 12 345 6789"
            />
            
            <Text className="text-sm text-gray-700 mb-2">Birthday</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                value={birthday}
                onChangeText={setBirthday}
                placeholder="YYYY-MM-DD"
            />

            <Text className="text-sm text-gray-700 mb-2">Gender</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                value={gender}
                onChangeText={setGender}
                placeholder="Male / Female / Other"
            />
            
            <Text className="text-sm text-gray-700 mb-2">Educational Level</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
                value={educationalLevel}
                onChangeText={setEducationalLevel}
                placeholder="e.g., Undergraduate, Graduate"
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
        </ScrollView>
    );
}