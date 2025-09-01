import { useState } from "react";
import { Alert, Text, TextInput, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { createDraft } from "@/lib/checklists";
import { auth } from "@/lib/firebase";

export default function NewChecklistName() {
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const router = useRouter();
    const uid = auth.currentUser?.uid;

    const onContinue = async () => {
        try {
            setBusy(true);
            const draft = await createDraft(name || "Untitled Checklist", uid);
            router.replace({ pathname: "/new/form", params: { id: draft.id } });
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Unable to create draft");
        } finally {
            setBusy(false);
        }
    };

    return (
        <View className="flex-1 bg-white p-6">
            <Text className="text-xl font-semibold mb-4">Name your checklist</Text>
            <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 mb-4"
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
                <Text className="text-white font-medium">
                    {busy ? "Creating..." : "Continue"}
                </Text>
            </Pressable>
        </View>
    );
}