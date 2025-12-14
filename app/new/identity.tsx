import { useAuth } from "@/context/AuthContext";
import { uploadImageAndGetURL } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

// --- CONFIGURATION ---
// Set to TRUE to test UI flow with fake data. Set to FALSE to use real AI.
const MOCK_MODE = false; 
const AI_API_URL = "https://bhanura-lepinet-backend.hf.space/predict";

export default function IdentifyScreen() {
    const router = useRouter();
    const { draftId } = useLocalSearchParams();
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    // State to hold the AI result
    const [result, setResult] = useState<{name: string, confidence: number, id: string, imageUrl: string} | null>(null);
    
    const cameraRef = useRef<CameraView>(null);

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center bg-white p-6">
                <Text className="mb-4 text-center text-lg">We need camera access to identify butterflies.</Text>
                <Pressable onPress={requestPermission} className="bg-[#134a86] px-6 py-3 rounded-lg">
                    <Text className="text-white font-semibold">Grant Permission</Text>
                </Pressable>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                if (photo) {
                    // Compress to speed up upload
                    const manipulated = await ImageManipulator.manipulateAsync(
                        photo.uri,
                        [{ resize: { width: 800 } }],
                        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                    );
                    setImageUri(manipulated.uri);
                }
            } catch (e) {
                Alert.alert("Error", "Failed to take photo");
            }
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const analyzeImage = async () => {
        if (!imageUri || !user) return;
        setLoading(true);

        try {
            // 1. Upload to Supabase Storage
            const publicUrl = await uploadImageAndGetURL(imageUri, "checklist_photos", user);
            if (!publicUrl) throw new Error("Upload failed. Check Supabase bucket & policies.");

            let data;

            if (MOCK_MODE) {
                // --- MOCK RESPONSE ---
                await new Promise(r => setTimeout(r, 2000));
                data = {
                    species_name: "Common Rose",
                    species_id: "b006",
                    confidence: 0.94
                };
            } else {
                // --- REAL AI SERVER CALL ---
                console.log("Preparing to call AI API:", AI_API_URL);
                
                const formData = new FormData();
                formData.append('file', {
                    uri: imageUri,
                    type: 'image/jpeg',
                    name: 'photo.jpg',
                } as any);

                // Add timeout for long-running requests
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 60000); 
                
                try {
                    const response = await fetch(AI_API_URL, {
                        method: 'POST',
                        body: formData,
                        headers: { 'Accept': 'application/json' },
                        signal: controller.signal,
                    });
                    
                    clearTimeout(timeout);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        if (response.status === 404 && errorText.includes('huggingface')) {
                            throw new Error('AI Server not found. Check if Space is Public.');
                        }
                        throw new Error(`Server error: ${response.status}`);
                    }
                    
                    data = await response.json();
                    if (data.error) throw new Error(data.error);

                } catch (fetchError: any) {
                    clearTimeout(timeout);
                    throw fetchError;
                }
            }

            // 3. Set Result State (including the image URL for later logging)
            setResult({
                name: data.species_name,
                confidence: data.confidence,
                id: data.species_id,
                imageUrl: publicUrl
            });

        } catch (e: any) {
            console.error(e);
            Alert.alert("Error", e.message || "Something went wrong");
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDecision = async (accepted: boolean) => {
        // Log the user's decision to Supabase
        if (result && user) {
            console.log(`Logging AI decision: ${accepted ? 'ACCEPTED' : 'REJECTED'}`);
            
            const { error } = await supabase
                .from('ai_logs')
                .insert({
                    user_id: user.id,
                    image_url: result.imageUrl,
                    predicted_id: result.id,
                    predicted_confidence: result.confidence,
                    user_action: accepted ? 'ACCEPTED' : 'REJECTED'
                });

            if (error) {
                console.error("Failed to log decision:", error);
            } else {
                console.log("Decision logged successfully");
            }
        }

        // Handle Navigation
        if (accepted && result) {
             router.dismissTo({
                pathname: "/new/form",
                params: { id: draftId, identifiedSpecies: result.name }
            });
        } else {
            router.back();
        }
    };

    return (
        <View className="flex-1 bg-black">
            {!imageUri ? (
                // Camera View
                <View className="flex-1">
                    <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} />
                    
                    {/* Controls Overlay */}
                    <View className="flex-1 justify-between py-10 px-6 z-10">
                        <Pressable onPress={() => router.back()} className="mt-4 self-start">
                             <Ionicons name="close-circle" size={32} color="white" />
                        </Pressable>
                        
                        <View className="flex-row justify-between items-center mb-6">
                            <Pressable onPress={pickImage} className="p-4 bg-gray-800/80 rounded-full">
                                <Ionicons name="images" size={24} color="white" />
                            </Pressable>
                            <Pressable onPress={takePicture} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300" />
                            <View className="w-12" /> 
                        </View>
                    </View>
                </View>
            ) : (
                // Preview & Result View
                <View className="flex-1 bg-white">
                    <Image source={{ uri: imageUri }} className="w-full h-2/3" resizeMode="cover" />
                    
                    <View className="flex-1 p-6 justify-between rounded-t-3xl -mt-6 bg-white">
                        {loading ? (
                            <View className="items-center justify-center flex-1">
                                <ActivityIndicator size="large" color="#134a86" />
                                <Text className="mt-4 text-gray-500 font-medium">Analyzing Butterfly...</Text>
                            </View>
                        ) : result ? (
                            <View>
                                <Text className="text-gray-500 text-center mb-2 uppercase tracking-wide text-xs">Identification Result</Text>
                                <Text className="text-3xl font-bold text-center text-[#134a86] mb-1">
                                    {result.name}
                                </Text>
                                <Text className="text-center text-gray-400 mb-8">
                                    Confidence: {(result.confidence * 100).toFixed(1)}%
                                </Text>

                                <View className="flex-row gap-4">
                                    <Pressable 
                                        onPress={() => handleDecision(false)}
                                        className="flex-1 bg-gray-100 py-4 rounded-xl items-center"
                                    >
                                        <Text className="font-semibold text-gray-700">Reject</Text>
                                    </Pressable>
                                    <Pressable 
                                        onPress={() => handleDecision(true)}
                                        className="flex-1 bg-[#134a86] py-4 rounded-xl items-center"
                                    >
                                        <Text className="font-semibold text-white">Accept</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ) : (
                            <View className="w-full mt-4">
                                <Pressable 
                                    onPress={analyzeImage}
                                    className="bg-[#134a86] w-full py-4 rounded-xl items-center mb-3 shadow-sm"
                                >
                                    <Text className="font-semibold text-white text-lg">Identify Species</Text>
                                </Pressable>
                                <Pressable 
                                    onPress={() => { setImageUri(null); setResult(null); }}
                                    className="py-4 items-center"
                                >
                                    <Text className="text-gray-500">Retake Photo</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}