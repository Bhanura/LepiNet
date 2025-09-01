import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { getAllDrafts, submitDraft, ChecklistDraft } from "@/lib/checklists";
import { auth } from "@/lib/firebase";

export default function Checklist() {
    const router = useRouter();
    const [drafts, setDrafts] = useState<ChecklistDraft[]>([]);
    const uid = auth.currentUser?.uid;

    const load = useCallback(async () => {
        const data = await getAllDrafts(uid);
        setDrafts(data);
    }, [uid]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const onSubmit = async (id: string) => {
        if (!uid) {
            Alert.alert("Sign in required", "Please sign in to submit your checklist.");
            return;
        }
        try {
            await submitDraft(id, uid);
            Alert.alert("Submitted", "Checklist submitted successfully.");
            load();
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Submission failed.");
        }
    };

    const renderCard = ({ item }: { item: ChecklistDraft }) => {
        const created = new Date(item.createdAt).toLocaleString();
        return (
            <View className="border border-gray-200 rounded-lg p-4 mb-3">
                <Text className="text-base font-semibold">{item.name}</Text>
                <Text className="text-gray-600 text-sm">{created}</Text>
                <View className="flex-row items-center justify-between mt-3">
                    <Text className={`text-xs px-2 py-1 rounded ${item.status === "submitted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {item.status === "submitted" ? "Submitted" : "Draft"}
                    </Text>

                    <View className="flex-row gap-2">
                        {item.status === "draft" && (
                            <>
                                <Pressable
                                    onPress={() => router.push({ pathname: "/new/form", params: { id: item.id } })}
                                    className="px-3 py-2 border border-gray-300 rounded"
                                >
                                    <Text>Resume</Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => onSubmit(item.id)}
                                    disabled={!item.entries.length}
                                    className={`px-3 py-2 rounded ${item.entries.length ? "bg-green-600" : "bg-gray-300"}`}
                                >
                                    <Text className="text-white">Submit</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>

                {item.entries.length > 0 && (
                    <Text className="text-gray-700 text-xs mt-2">{item.entries.length} record(s)</Text>
                )}
            </View>
        );
    };

    return (
        <View className="flex-1 bg-white p-4">
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-semibold">Check Lists</Text>
                <Link href="/new" asChild>
                    <Pressable className="bg-[#134a86] rounded-lg px-4 py-2">
                        <Text className="text-white font-medium">+ New Check List</Text>
                    </Pressable>
                </Link>
            </View>

            <FlatList
                data={drafts}
                keyExtractor={(item) => item.id}
                renderItem={renderCard}
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                    <Text className="text-gray-600">No checklists yet. Create one to get started.</Text>
                }
            />
        </View>
    );
}