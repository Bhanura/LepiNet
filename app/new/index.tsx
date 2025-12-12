import { useAuth } from "@/context/AuthContext";
import { createDraft } from "@/lib/checklists";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export default function NewChecklistName() {
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const router = useRouter();
    const { user } = useAuth();
    const uid = user?.id;

    const onContinue = async () => {
        if (!name.trim()) {
            Alert.alert("Missing Name", "Please enter a checklist name.");
            return;
        }

        try {
            setBusy(true);
            const draft = await createDraft(name.trim(), uid);
            router.replace({ pathname: "/new/form", params: { id: draft.id } });
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Unable to create draft");
        } finally {
            setBusy(false);
        }
    };

    return (
        <View className="flex-1 bg-white">
            {/* Custom Header with Back Button */}
            <View className="flex-row items-center px-6 pt-12 pb-4 border-b border-gray-200">
                <Pressable 
                    onPress={() => router.back()}
                    className="mr-4"
                >
                    <Ionicons name="arrow-back" size={24} color="#134a86" />
                </Pressable>
                <Text className="text-xl font-semibold">New Checklist</Text>
            </View>

            <View className="p-6">
                <Text className="text-base text-gray-700 mb-2">Checklist Name</Text>
                <TextInput
                    className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base"
                    placeholder="e.g., Morning Survey - Central Park"
                    value={name}
                    onChangeText={setName}
                    autoFocus
                />
                <Pressable
                    onPress={onContinue}
                    disabled={busy}
                    className="bg-[#134a86] rounded-lg px-4 py-3 items-center"
                >
                    <Text className="text-white font-medium text-base">
                        {busy ? "Creating..." : "Continue"}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}