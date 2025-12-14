import { SPECIES } from "@/constants/species";
import { useAuth } from "@/context/AuthContext";
import {
    addEntryToDraft,
    ChecklistDraft,
    deleteDraft,
    deleteEntryFromDraft,
    submitDraft
} from "@/lib/checklists";
import { getDraftById } from "@/lib/storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from "react-native";

type LocState = {
    hasPermission: boolean;
    coords?: { latitude: number; longitude: number; accuracy?: number | null } | null;
};

export default function ChecklistForm() {
    const { id, identifiedSpecies } = useLocalSearchParams<{ id: string, identifiedSpecies?: string}>();
    const router = useRouter();
    const { user } = useAuth();
    const uid = user?.id;

    const [draft, setDraft] = useState<ChecklistDraft | null>(null);
    const [speciesQuery, setSpeciesQuery] = useState("");
    const [selectedSpecies, setSelectedSpecies] = useState<string>("");
    const [count, setCount] = useState<string>("");
    const [loc, setLoc] = useState<LocState>({ hasPermission: false, coords: null });
    const [submitting, setSubmitting] = useState(false);
    const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);

    // Auto-fill species if coming back from AI identification
    useEffect(() => {
            if (identifiedSpecies) {
                // Auto-select the species returned by the AI
                setSelectedSpecies(identifiedSpecies);
                setSpeciesQuery(identifiedSpecies);
            }
        }, [identifiedSpecies]);

    // Load draft
    useEffect(() => {
        (async () => {
            const d = await getDraftById(id!, uid);
            if (!d) {
                Alert.alert("Not found", "Draft not found.");
                router.back();
                return;
            }
            setDraft(d);
        })();
    }, [id]);

    // Get location permission
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            const granted = status === "granted";
            if (!granted) {
                setLoc({ hasPermission: false, coords: null });
                return;
            }
            setLoc((s) => ({ ...s, hasPermission: true }));
            const pos = await Location.getCurrentPositionAsync({ 
                accuracy: Location.Accuracy.Balanced 
            });
            setLoc({ 
                hasPermission: true, 
                coords: { 
                    latitude: pos.coords.latitude, 
                    longitude: pos.coords.longitude, 
                    accuracy: pos.coords.accuracy ?? null 
                } 
            });
        })();
    }, []);

    const filteredSpecies = useMemo(() => {
        const q = speciesQuery.trim().toLowerCase();
        if (!q) return SPECIES.slice(0, 20);
        return SPECIES.filter((n) => n.toLowerCase().includes(q)).slice(0, 50);
    }, [speciesQuery]);

    const addRecord = async () => {
        const name = selectedSpecies || speciesQuery;
        const c = parseInt(count, 10);
        
        if (!name) {
            Alert.alert("Missing species", "Please select or type a species name.");
            return;
        }
        if (!Number.isFinite(c) || c <= 0) {
            Alert.alert("Invalid count", "Enter a positive number.");
            return;
        }
        
        try {
            const updated = await addEntryToDraft(
                id!,
                {
                    speciesName: name,
                    count: c,
                    location: loc.coords ?? undefined,
                },
                uid
            );
            setDraft(updated);
            setSelectedSpecies("");
            setSpeciesQuery("");
            setCount("");
            setShowSpeciesDropdown(false);
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Unable to add record.");
        }
    };

    const onSubmit = async () => {
        if (!uid) {
            Alert.alert("Sign in required", "Please sign in to submit your checklist.");
            return;
        }
        if (!draft?.entries.length) {
            Alert.alert("Empty checklist", "Please add at least one record.");
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
                            setSubmitting(true);
                            await submitDraft(id!, uid);
                            Alert.alert(
                                "Submitted Successfully", 
                                "Your checklist has been submitted.",
                                [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
                            );
                        } catch (e: any) {
                            Alert.alert("Submit failed", e?.message ?? "Please try again.");
                        } finally {
                            setSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const onDeleteChecklist = async () => {
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
                            await deleteDraft(id!, uid);
                            Alert.alert("Deleted", "Checklist deleted successfully.", [
                                { text: "OK", onPress: () => router.replace("/(tabs)") }
                            ]);
                        } catch (e: any) {
                            Alert.alert("Error", e?.message ?? "Unable to delete.");
                        }
                    }
                }
            ]
        );
    };

    const onDeleteRecord = async (entryId: string) => {
        Alert.alert(
            "Delete Record",
            "Are you sure you want to delete this record?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const updated = await deleteEntryFromDraft(id!, entryId, uid);
                            setDraft(updated);
                        } catch (e: any) {
                            Alert.alert("Error", e?.message ?? "Unable to delete record.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1 bg-white">
            {/* Custom Header */}
            <View className="flex-row items-center justify-between px-6 pt-12 pb-4 border-b border-gray-200">
                <Pressable onPress={() => router.replace("/(tabs)")}>
                    <Ionicons name="arrow-back" size={24} color="#134a86" />
                </Pressable>
                <Pressable
                    onPress={onSubmit}
                    disabled={submitting || !draft?.entries.length}
                    className={`px-4 py-2 rounded-lg ${
                        draft?.entries.length ? "bg-green-600" : "bg-gray-300"
                    }`}
                >
                    <Text className="text-white font-medium">
                        {submitting ? "Submitting..." : "Submit"}
                    </Text>
                </Pressable>
            </View>

            <ScrollView className="flex-1">
                {!draft ? (
                    <Text className="p-6">Loading...</Text>
                ) : (
                    <View className="p-6">
                        {/* Checklist Name */}
                        <Text className="text-xl font-semibold mb-2">{draft.name}</Text>
                        <Text className="text-gray-600 mb-6">
                            Created: {new Date(draft.createdAt).toLocaleString()}
                        </Text>

                        {/* Add Record Box */}
                        <View className="border border-gray-300 rounded-lg p-4 mb-6">
                            <Text className="text-lg font-semibold mb-4">Add Record</Text>

                            {/* Species Selection with Camera Button */}
                            <View className="flex-row items-center mb-3">
                                <View className="flex-1">
                                    <Text className="text-sm text-gray-700 mb-1">Species</Text>
                                    <Pressable
                                        onPress={() => setShowSpeciesDropdown(true)}
                                        className="border border-gray-300 rounded-lg px-3 py-3"
                                    >
                                        <Text className={selectedSpecies ? "text-black" : "text-gray-400"}>
                                            {selectedSpecies || "Select species"}
                                        </Text>
                                    </Pressable>
                                </View>
                                
                                {/* AI Camera Button */}
                                <Pressable 
                                    onPress={() => router.push({
                                        pathname: "/new/identity",
                                        // Pass the draft ID so we can come back to this exact draft
                                        params: { draftId: id }
                                    })}
                                    className="ml-3 mt-6 bg-[#134a86] p-3 rounded-lg"
                                >
                                    <Ionicons name="camera" size={24} color="white" />
                                </Pressable>
                            </View>

                            {/* Count Input */}
                            <Text className="text-sm text-gray-700 mb-1">Count</Text>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-3 py-3 mb-3"
                                value={count}
                                onChangeText={setCount}
                                placeholder="e.g., 3"
                                keyboardType="numeric"
                            />

                            {/* Location Info */}
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-sm text-gray-700 flex-1">
                                    📍 {loc.coords
                                        ? `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`
                                        : loc.hasPermission
                                            ? "Locating..."
                                            : "Location permission needed"}
                                </Text>
                                <Pressable
                                    onPress={async () => {
                                        const pos = await Location.getCurrentPositionAsync({ 
                                            accuracy: Location.Accuracy.Balanced 
                                        });
                                        setLoc({
                                            hasPermission: true,
                                            coords: {
                                                latitude: pos.coords.latitude,
                                                longitude: pos.coords.longitude,
                                                accuracy: pos.coords.accuracy ?? null,
                                            },
                                        });
                                    }}
                                    className="ml-2 px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <Ionicons name="refresh" size={16} color="#134a86" />
                                </Pressable>
                            </View>

                            {/* Add Record Button */}
                            <Pressable 
                                onPress={addRecord} 
                                className="bg-[#134a86] rounded-lg px-4 py-3 items-center"
                            >
                                <Text className="text-white font-medium">Add Record</Text>
                            </Pressable>
                        </View>

                        {/* Records Box */}
                        <View className="border border-gray-300 rounded-lg p-4 mb-6">
                            <Text className="text-lg font-semibold mb-4">
                                Records ({draft.entries.length})
                            </Text>
                            
                            {draft.entries.length === 0 ? (
                                <Text className="text-gray-500 text-center py-4">
                                    No records yet. Add your first observation above.
                                </Text>
                            ) : (
                                <FlatList
                                    data={draft.entries}
                                    keyExtractor={(item) => item.id}
                                    scrollEnabled={false}
                                    renderItem={({ item }) => (
                                        <Pressable
                                            onPress={() => router.push({
                                                pathname: "/new/record-view",
                                                params: { draftId: id!, entryId: item.id }
                                            })}
                                            className="border border-gray-200 rounded-lg p-3 mb-2 flex-row items-center"
                                        >
                                            <View className="flex-1">
                                                <Text className="font-semibold text-base">{item.speciesName}</Text>
                                                <Text className="text-gray-700">Count: {item.count}</Text>
                                                <Text className="text-gray-500 text-xs">
                                                    {new Date(item.observedAt).toLocaleString()}
                                                    {item.location && ` • ${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)}`}
                                                </Text>
                                            </View>
                                            
                                            {/* Three Dot Menu */}
                                            <View className="flex-row gap-2">
                                                <Pressable
                                                    onPress={(e) => {
                                                        e.stopPropagation(); // Prevent card click
                                                        router.push({
                                                            pathname: "/new/edit-record",
                                                            params: { draftId: id!, entryId: item.id }
                                                        });
                                                    }}
                                                    className="p-2"
                                                >
                                                    <Ionicons name="create-outline" size={20} color="#134a86" />
                                                </Pressable>
                                                <Pressable
                                                    onPress={(e) => {
                                                        e.stopPropagation(); // Prevent card click
                                                        onDeleteRecord(item.id);
                                                    }}
                                                    className="p-2"
                                                >
                                                    <Ionicons name="trash-outline" size={20} color="#dc2626" />
                                                </Pressable>
                                            </View>
                                        </Pressable>
                                    )}
                                />
                            )}
                        </View>

                        {/* Delete Checklist Button */}
                        <Pressable
                            onPress={onDeleteChecklist}
                            className="bg-red-600 rounded-lg px-4 py-3 items-center"
                        >
                            <Text className="text-white font-medium">Delete Checklist</Text>
                        </Pressable>
                    </View>
                )}
            </ScrollView>

            {/* Species Selection Modal */}
            <Modal
                visible={showSpeciesDropdown}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSpeciesDropdown(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl" style={{ height: '70%' }}>
                        <View className="p-4 border-b border-gray-200">
                            <View className="flex-row justify-between items-center mb-3">
                                <Text className="text-lg font-semibold">Select Species</Text>
                                <Pressable onPress={() => setShowSpeciesDropdown(false)}>
                                    <Ionicons name="close" size={24} color="#666" />
                                </Pressable>
                            </View>
                            <TextInput
                                className="border border-gray-300 rounded-lg px-3 py-2"
                                value={speciesQuery}
                                onChangeText={setSpeciesQuery}
                                placeholder="Search species..."
                                autoFocus
                            />
                        </View>
                        <FlatList
                            data={filteredSpecies}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <Pressable
                                    onPress={() => {
                                        setSelectedSpecies(item);
                                        setSpeciesQuery(item);
                                        setShowSpeciesDropdown(false);
                                    }}
                                    className="px-4 py-3 border-b border-gray-100"
                                >
                                    <Text className="text-base">{item}</Text>
                                </Pressable>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}