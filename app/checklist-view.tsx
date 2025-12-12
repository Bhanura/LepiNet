import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from "react-native";

type ChecklistData = {
    checklist_id: string;
    checklist_name: string;
    submitted_date: string;
    submitted_time: string;
    user_id: string;
};

type RecordData = {
    record_id: string;
    species_name: string;
    species_count: number;
    recorded_date: string;
    recorded_time: string;
    recorded_location_latitude: number | null;
    recorded_location_longitude: number | null;
};

export default function ChecklistView() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    
    const [checklist, setChecklist] = useState<ChecklistData | null>(null);
    const [records, setRecords] = useState<RecordData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadChecklist();
    }, [id]);

    const loadChecklist = async () => {
        try {
            // Load checklist details
            const { data: checklistData, error: checklistError } = await supabase
                .from('submissions')
                .select('*')
                .eq('checklist_id', id)
                .single();

            if (checklistError) throw checklistError;
            setChecklist(checklistData);

            // Load records
            const { data: recordsData, error: recordsError } = await supabase
                .from('records')
                .select('*')
                .eq('checklist_id', id)
                .order('recorded_date', { ascending: false });

            if (recordsError) throw recordsError;
            setRecords(recordsData || []);
        } catch (e: any) {
            console.error("Error loading checklist:", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#134a86" />
            </View>
        );
    }

    if (!checklist) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <Text className="text-gray-600">Checklist not found</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center px-6 pt-12 pb-4 border-b border-gray-200">
                <Pressable onPress={() => router.back()} className="mr-4">
                    <Ionicons name="arrow-back" size={24} color="#134a86" />
                </Pressable>
                <Text className="text-lg font-semibold">Checklist Details</Text>
            </View>

            <ScrollView className="flex-1">
                <View className="p-6">
                    {/* Checklist Info */}
                    <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <Text className="text-2xl font-bold text-gray-900 mb-2">
                            {checklist.checklist_name}
                        </Text>
                        <View className="flex-row items-center mb-1">
                            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                            <Text className="text-green-700 ml-2 font-semibold">Submitted</Text>
                        </View>
                        <View className="flex-row items-center mb-1">
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text className="text-gray-600 ml-2">
                                {new Date(checklist.submitted_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text className="text-gray-600 ml-2">{checklist.submitted_time}</Text>
                        </View>
                    </View>

                    {/* Records Section */}
                    <Text className="text-xl font-bold mb-4">
                        Records ({records.length})
                    </Text>

                    {records.length === 0 ? (
                        <View className="items-center py-8">
                            <Ionicons name="document-outline" size={48} color="#ccc" />
                            <Text className="text-gray-500 mt-2">No records found</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={records}
                            keyExtractor={(item) => item.record_id}
                            scrollEnabled={false}
                            renderItem={({ item }) => (
                                <View className="border border-gray-200 rounded-lg p-4 mb-3 bg-white">
                                    <Text className="text-lg font-bold text-gray-900 mb-2">
                                        {item.species_name}
                                    </Text>
                                    <View className="flex-row items-center mb-1">
                                        <Ionicons name="list-outline" size={16} color="#666" />
                                        <Text className="text-gray-700 ml-2">
                                            Count: {item.species_count}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center mb-1">
                                        <Ionicons name="calendar-outline" size={16} color="#666" />
                                        <Text className="text-gray-600 ml-2 text-sm">
                                            {new Date(item.recorded_date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center mb-1">
                                        <Ionicons name="time-outline" size={16} color="#666" />
                                        <Text className="text-gray-600 ml-2 text-sm">
                                            {item.recorded_time}
                                        </Text>
                                    </View>
                                    {item.recorded_location_latitude && item.recorded_location_longitude && (
                                        <View className="flex-row items-center mt-2">
                                            <Ionicons name="location-outline" size={16} color="#666" />
                                            <Text className="text-gray-600 ml-2 text-xs font-mono">
                                                {item.recorded_location_latitude.toFixed(5)}, {item.recorded_location_longitude.toFixed(5)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}