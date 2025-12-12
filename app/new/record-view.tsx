import { useAuth } from "@/context/AuthContext";
import { ChecklistDraft, ChecklistEntry } from "@/lib/checklists";
import { getDraftById } from "@/lib/storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

export default function RecordView() {
    const { draftId, entryId } = useLocalSearchParams<{ draftId: string; entryId: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const uid = user?.id;

    const [draft, setDraft] = useState<ChecklistDraft | null>(null);
    const [record, setRecord] = useState<ChecklistEntry | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const d = await getDraftById(draftId!, uid);
            if (!d) {
                router.back();
                return;
            }
            setDraft(d);
            
            const entry = d.entries.find(e => e.id === entryId);
            if (!entry) {
                router.back();
                return;
            }
            setRecord(entry);
            setLoading(false);
        })();
    }, [draftId, entryId]);

    if (loading || !record || !draft) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#134a86" />
            </View>
        );
    }

    const recordedDate = new Date(record.observedAt);

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 pt-12 pb-4 border-b border-gray-200">
                <Pressable onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#134a86" />
                </Pressable>
                <Text className="text-lg font-semibold">Record Details</Text>
                <Pressable 
                    onPress={() => router.push({
                        pathname: "/new/edit-record",
                        params: { draftId, entryId }
                    })}
                >
                    <Ionicons name="create-outline" size={24} color="#134a86" />
                </Pressable>
            </View>

            <ScrollView className="flex-1">
                <View className="p-6">
                    {/* Checklist Name */}
                    <View className="bg-gray-50 rounded-lg p-4 mb-6">
                        <Text className="text-sm text-gray-500 mb-1">Checklist</Text>
                        <Text className="text-base font-semibold">{draft.name}</Text>
                    </View>

                    {/* Species Name */}
                    <View className="border-b border-gray-200 pb-4 mb-4">
                        <Text className="text-sm text-gray-500 mb-1">Species Name</Text>
                        <Text className="text-2xl font-bold text-[#134a86]">
                            {record.speciesName}
                        </Text>
                    </View>

                    {/* Count */}
                    <View className="border-b border-gray-200 pb-4 mb-4">
                        <Text className="text-sm text-gray-500 mb-1">Count</Text>
                        <Text className="text-xl font-semibold">{record.count}</Text>
                    </View>

                    {/* Date & Time */}
                    <View className="border-b border-gray-200 pb-4 mb-4">
                        <Text className="text-sm text-gray-500 mb-1">Recorded Date & Time</Text>
                        <View className="flex-row items-center mt-1">
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text className="text-base ml-2">
                                {recordedDate.toLocaleDateString()}
                            </Text>
                        </View>
                        <View className="flex-row items-center mt-1">
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text className="text-base ml-2">
                                {recordedDate.toLocaleTimeString()}
                            </Text>
                        </View>
                    </View>

                    {/* Location */}
                    <View className="border-b border-gray-200 pb-4 mb-4">
                        <Text className="text-sm text-gray-500 mb-2">Location</Text>
                        {record.location ? (
                            <>
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="location-outline" size={16} color="#666" />
                                    <Text className="text-base ml-2">Coordinates:</Text>
                                </View>
                                <View className="bg-gray-50 rounded-lg p-3">
                                    <Text className="text-sm font-mono">
                                        Latitude: {record.location.latitude.toFixed(7)}
                                    </Text>
                                    <Text className="text-sm font-mono">
                                        Longitude: {record.location.longitude.toFixed(7)}
                                    </Text>
                                    {record.location.accuracy && (
                                        <Text className="text-xs text-gray-500 mt-1">
                                            Accuracy: ±{record.location.accuracy.toFixed(2)}m
                                        </Text>
                                    )}
                                </View>
                            </>
                        ) : (
                            <Text className="text-gray-500 italic">No location recorded</Text>
                        )}
                    </View>

                    {/* Record ID */}
                    <View className="pb-4">
                        <Text className="text-sm text-gray-500 mb-1">Record ID</Text>
                        <Text className="text-xs text-gray-600 font-mono">{record.id}</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Edit Button at Bottom */}
            <View className="p-6 border-t border-gray-200">
                <Pressable
                    onPress={() => router.push({
                        pathname: "/new/edit-record",
                        params: { draftId, entryId }
                    })}
                    className="bg-[#134a86] rounded-lg px-4 py-3 items-center"
                >
                    <Text className="text-white font-medium text-base">Edit Record</Text>
                </Pressable>
            </View>
        </View>
    );
}