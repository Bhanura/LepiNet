import { useAuth } from "@/context/AuthContext";
import { ChecklistDraft, deleteDraft, getAllDrafts, submitDraft } from "@/lib/checklists";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    Text,
    TextInput,
    View
} from "react-native";

type Submission = {
    checklist_id: string;
    checklist_name: string;
    submitted_date: string;
    submitted_time: string;
    record_count: number;
};

type CombinedChecklist = (ChecklistDraft | Submission) & {
    type: 'draft' | 'submitted';
};

type FilterType = 'all' | 'draft' | 'submitted';

export default function Checklist() {
    const router = useRouter();
    const [drafts, setDrafts] = useState<ChecklistDraft[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<FilterType>('all');
    const [menuVisible, setMenuVisible] = useState<string | null>(null);
    const { user } = useAuth();
    const uid = user?.id;

    const load = useCallback(async () => {
        // Load drafts
        const draftData = await getAllDrafts(uid);
        setDrafts(draftData);

        // Load submissions from Supabase
        if (uid) {
            const { data, error } = await supabase
                .from('submissions')
                .select(`
                    checklist_id,
                    checklist_name,
                    submitted_date,
                    submitted_time,
                    records:records(count)
                `)
                .eq('user_id', uid)
                .order('submitted_date', { ascending: false });

            if (!error && data) {
                const formatted = data.map(item => ({
                    checklist_id: item.checklist_id,
                    checklist_name: item.checklist_name,
                    submitted_date: item.submitted_date,
                    submitted_time: item.submitted_time,
                    record_count: item.records?.length || 0,
                }));
                setSubmissions(formatted);
            }
        }
    }, [uid]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [load])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const onSubmitDraft = async (draftId: string) => {
        if (!uid) {
            Alert.alert("Sign in required", "Please sign in to submit your checklist.");
            return;
        }

        const draft = drafts.find(d => d.id === draftId);
        if (!draft?.entries.length) {
            Alert.alert("Empty checklist", "Please add at least one record before submitting.");
            return;
        }

        Alert.alert(
            "Submit Checklist",
            "Are you sure you want to submit this checklist?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Submit",
                    onPress: async () => {
                        try {
                            await submitDraft(draftId, uid);
                            Alert.alert("Success", "Checklist submitted successfully!");
                            load();
                        } catch (e: any) {
                            Alert.alert("Error", e?.message ?? "Unable to submit.");
                        }
                    }
                }
            ]
        );
    };

    const onDeleteDraft = async (draftId: string) => {
        Alert.alert(
            "Delete Checklist",
            "Are you sure you want to delete this checklist? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDraft(draftId, uid);
                            Alert.alert("Deleted", "Checklist deleted successfully.");
                            load();
                        } catch (e: any) {
                            Alert.alert("Error", e?.message ?? "Unable to delete.");
                        }
                    }
                }
            ]
        );
    };

    // Combine and filter data
    const combinedData: CombinedChecklist[] = [
        ...drafts.map(d => ({ ...d, type: 'draft' as const })),
        ...submissions.map(s => ({ ...s, type: 'submitted' as const }))
    ];

    const filteredData = combinedData.filter(item => {
        // Filter by search query
        const name = item.type === 'draft' ? item.name : item.checklist_name;
        if (searchQuery && !name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Filter by type
        if (filter === 'draft' && item.type !== 'draft') return false;
        if (filter === 'submitted' && item.type !== 'submitted') return false;

        return true;
    });

    // Sort by date (newest first)
    filteredData.sort((a, b) => {
        const dateA = a.type === 'draft' ? a.createdAt : new Date(`${a.submitted_date} ${a.submitted_time}`).getTime();
        const dateB = b.type === 'draft' ? b.createdAt : new Date(`${b.submitted_date} ${b.submitted_time}`).getTime();
        return dateB - dateA;
    });

    const renderChecklistCard = ({ item }: { item: CombinedChecklist }) => {
        const isDraft = item.type === 'draft';
        const id = isDraft ? item.id : item.checklist_id;
        const name = isDraft ? item.name : item.checklist_name;
        const recordCount = isDraft ? item.entries.length : item.record_count;
        
        let dateStr = '';
        if (isDraft) {
            dateStr = new Date(item.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } else {
            dateStr = new Date(item.submitted_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }

        return (
            <Pressable
                onPress={() => {
                    if (isDraft) {
                        router.push({ pathname: "/new/form", params: { id } });
                    } else {
                        router.push({ pathname: "/checklist-view", params: { id } });
                    }
                }}
                className={`border rounded-lg p-4 mb-3 ${
                    isDraft ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
                }`}
            >
                <View className="flex-row justify-between">
                    {/* Left Side */}
                    <View className="flex-1 mr-3">
                        <Text className="text-lg font-bold text-gray-900 mb-1">{name}</Text>
                        <Text className="text-sm text-gray-600 mb-1">{dateStr}</Text>
                        <Text className="text-xs text-gray-500">
                            {recordCount} record{recordCount !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    {/* Right Side */}
                    <View className="items-end justify-between">
                        {/* Status Badge or Submit Button */}
                        {isDraft ? (
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onSubmitDraft(id);
                                }}
                                disabled={recordCount === 0}
                                className={`px-3 py-1 rounded ${
                                    recordCount > 0 ? 'bg-green-600' : 'bg-gray-300'
                                }`}
                            >
                                <Text className="text-white text-xs font-semibold">Submit</Text>
                            </Pressable>
                        ) : (
                            <View className="bg-green-600 px-3 py-1 rounded">
                                <Text className="text-white text-xs font-semibold">Submitted</Text>
                            </View>
                        )}

                        {/* Three Dot Menu */}
                        <Pressable
                            onPress={(e) => {
                                e.stopPropagation();
                                setMenuVisible(menuVisible === id ? null : id);
                            }}
                            className="mt-2 p-1"
                        >
                            <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                        </Pressable>
                    </View>
                </View>

                {/* Dropdown Menu */}
                {menuVisible === id && (
                    <View className="absolute right-4 top-16 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        {isDraft && (
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setMenuVisible(null);
                                    router.push({ pathname: "/new/form", params: { id } });
                                }}
                                className="px-4 py-3 border-b border-gray-100 flex-row items-center"
                            >
                                <Ionicons name="create-outline" size={18} color="#134a86" />
                                <Text className="ml-2 text-gray-800">Edit</Text>
                            </Pressable>
                        )}
                        {isDraft && (
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setMenuVisible(null);
                                    onDeleteDraft(id);
                                }}
                                className="px-4 py-3 flex-row items-center"
                            >
                                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                                <Text className="ml-2 text-red-600">Delete</Text>
                            </Pressable>
                        )}
                        {!isDraft && (
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setMenuVisible(null);
                                    router.push({ pathname: "/checklist-view", params: { id } });
                                }}
                                className="px-4 py-3 flex-row items-center"
                            >
                                <Ionicons name="eye-outline" size={18} color="#134a86" />
                                <Text className="ml-2 text-gray-800">View Details</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </Pressable>
        );
    };

    return (
        <View className="flex-1 bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
                <Text className="text-2xl font-bold text-gray-900">Checklists</Text>
                <Link href="/new" asChild>
                    <Pressable className="bg-[#134a86] rounded-lg px-4 py-2 flex-row items-center">
                        <Ionicons name="add" size={20} color="white" />
                        <Text className="text-white font-semibold ml-1">New Checklist</Text>
                    </Pressable>
                </Link>
            </View>

            {/* Search Bar */}
            <View className="px-4 pb-3">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                    <Ionicons name="search" size={20} color="#666" />
                    <TextInput
                        className="flex-1 ml-2 text-base"
                        placeholder="Search checklists..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={20} color="#666" />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Filter Buttons */}
            <View className="flex-row px-4 pb-3 gap-2">
                <Pressable
                    onPress={() => setFilter('all')}
                    className={`flex-1 py-2 rounded-lg ${
                        filter === 'all' ? 'bg-[#134a86]' : 'bg-gray-200'
                    }`}
                >
                    <Text className={`text-center font-semibold ${
                        filter === 'all' ? 'text-white' : 'text-gray-700'
                    }`}>
                        All
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setFilter('draft')}
                    className={`flex-1 py-2 rounded-lg ${
                        filter === 'draft' ? 'bg-[#134a86]' : 'bg-gray-200'
                    }`}
                >
                    <Text className={`text-center font-semibold ${
                        filter === 'draft' ? 'text-white' : 'text-gray-700'
                    }`}>
                        Draft
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setFilter('submitted')}
                    className={`flex-1 py-2 rounded-lg ${
                        filter === 'submitted' ? 'bg-[#134a86]' : 'bg-gray-200'
                    }`}
                >
                    <Text className={`text-center font-semibold ${
                        filter === 'submitted' ? 'text-white' : 'text-gray-700'
                    }`}>
                        Submitted
                    </Text>
                </Pressable>
            </View>

            {/* Checklist Cards */}
            <FlatList
                data={filteredData}
                keyExtractor={(item) => 
                    item.type === 'draft' ? item.id : item.checklist_id
                }
                renderItem={renderChecklistCard}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                ListEmptyComponent={
                    <View className="items-center justify-center py-12">
                        <Ionicons name="clipboard-outline" size={64} color="#ccc" />
                        <Text className="text-gray-500 text-center mt-4 text-base">
                            {searchQuery 
                                ? "No checklists found matching your search" 
                                : filter === 'draft'
                                ? "No draft checklists"
                                : filter === 'submitted'
                                ? "No submitted checklists"
                                : "No checklists yet.\nCreate one to get started!"}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}