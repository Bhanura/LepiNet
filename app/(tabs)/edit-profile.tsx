import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from "react-native";

export default function EditProfile() {
    const { user, profile, refreshProfile, updateProfilePhoto } = useAuth();
    const router = useRouter();
    
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [mobile, setMobile] = useState("");
    const [birthday, setBirthday] = useState("");
    const [gender, setGender] = useState("");
    const [educationalLevel, setEducationalLevel] = useState("");
    const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
    const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || "");
            setLastName(profile.last_name || "");
            setMobile(profile.mobile || "");
            setBirthday(profile.birthday || "");
            setGender(profile.gender || "");
            setEducationalLevel(profile.educational_level || "");
            setProfilePhotoUrl(profile.profile_photo_url || null);
            setLoading(false);
        }
    }, [profile]);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'We need permission to access your photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setNewPhotoUri(result.assets[0].uri);
        }
    };

    const uploadPhoto = async () => {
        if (!newPhotoUri) return;

        try {
            setUploadingPhoto(true);
            await updateProfilePhoto(newPhotoUri);
            setProfilePhotoUrl(newPhotoUri);
            setNewPhotoUri(null);
            Alert.alert("Success", "Profile photo updated!");
        } catch (e: any) {
            console.error("Photo upload error:", e);
            Alert.alert("Upload failed", e?.message ?? "Failed to upload photo.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const onSave = async () => {
        if (!firstName || !lastName) {
            Alert.alert("Missing fields", "First name and last name are required.");
            return;
        }

        try {
            setSaving(true);
            console.log("Updating profile for user:", user?.id);

            const { error } = await supabase
                .from("users")
                .update({
                    first_name: firstName,
                    last_name: lastName,
                    mobile: mobile,
                    birthday: birthday,
                    gender: gender,
                    educational_level: educationalLevel,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", user?.id);

            if (error) {
                console.error("Error updating profile:", error);
                throw error;
            }

            console.log("Profile updated successfully");
            await refreshProfile();

            Alert.alert(
                "Success", 
                "Your profile has been updated!",
                [{ text: "OK", onPress: () => router.back() }]
            );

        } catch (e: any) {
            console.error("Save error:", e);
            Alert.alert("Update failed", e?.message ?? "Please try again.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#134a86" />
            </View>
        );
    }

    const displayPhoto = newPhotoUri || profilePhotoUrl;

    return (
        <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 24 }}>
            <Text className="text-2xl font-semibold mb-6">Edit Profile</Text>

            {/* Profile Photo Section */}
            <View className="items-center mb-6">
                <View className="relative">
                    {displayPhoto ? (
                        <Image
                            source={{ uri: displayPhoto }}
                            className="w-32 h-32 rounded-full"
                            style={{ backgroundColor: '#e5e7eb' }}
                        />
                    ) : (
                        <View className="w-32 h-32 rounded-full bg-[#134a86] justify-center items-center">
                            <Text className="text-white text-5xl font-bold">
                                {firstName?.[0]?.toUpperCase() || "?"}
                            </Text>
                        </View>
                    )}
                    
                    {/* Camera Icon Button */}
                    <Pressable
                        onPress={pickImage}
                        className="absolute bottom-0 right-0 bg-[#134a86] p-2 rounded-full"
                        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}
                    >
                        <Ionicons name="camera" size={20} color="white" />
                    </Pressable>
                </View>

                {/* Upload Button (shown when new photo is selected) */}
                {newPhotoUri && (
                    <Pressable
                        onPress={uploadPhoto}
                        disabled={uploadingPhoto}
                        className="mt-3 bg-green-600 rounded-lg px-4 py-2"
                    >
                        <Text className="text-white font-medium">
                            {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                        </Text>
                    </Pressable>
                )}
            </View>

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

            <View className="flex-row gap-3 mt-4">
                <Pressable
                    onPress={() => router.back()}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-3 items-center"
                >
                    <Text className="text-gray-700 font-medium">Cancel</Text>
                </Pressable>

                <Pressable
                    onPress={onSave}
                    disabled={saving}
                    className="flex-1 bg-[#134a86] rounded-lg px-4 py-3 items-center"
                >
                    <Text className="text-white font-medium">
                        {saving ? "Saving..." : "Save Changes"}
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    );
}