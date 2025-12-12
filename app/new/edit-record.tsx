import { SPECIES } from "@/constants/species";
import { useAuth } from "@/context/AuthContext";
import { ChecklistDraft, ChecklistEntry, updateEntryInDraft } from "@/lib/checklists";
import { getDraftById } from "@/lib/storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from "react-native";

export default function EditRecord() {
    const { draftId, entryId } = useLocalSearchParams<{ draftId: string; entryId: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const uid = user?.id;

    const [draft, setDraft] = useState<ChecklistDraft | null>(null);
    const [record, setRecord] = useState<ChecklistEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [speciesQuery, setSpeciesQuery] = useState("");
    const [selectedSpecies, setSelectedSpecies] = useState("");
    const [count, setCount] = useState("");
    const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
            setSelectedSpecies(entry.speciesName);
            setSpeciesQuery(entry.speciesName);
            setCount(entry.count.toString());
            setLocation(entry.location ? {
                latitude: entry.location.latitude,
                longitude: entry.location.longitude
            } : null);
            setLoading(false);
        })();
    }, [draftId, entryId]);

    const filteredSpecies = useMemo(() => {
        const q = speciesQuery.trim().toLowerCase();
        if (!q) return SPECIES.slice(0, 20);
        return SPECIES.filter((n) => n.toLowerCase().includes(q)).slice(0, 50);
    }, [speciesQuery]);

    const refreshLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "Location permission is required.");
                return;
            }

            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });
            setLocation({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
            });
            Alert.alert("Success", "Location updated successfully.");
        } catch (e) {
            Alert.alert("Error", "Failed to get location.");
        }
    };

    const onSave = async () => {
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
            setSaving(true);
            await updateEntryInDraft(
                draftId!,
                entryId!,
                {
                    speciesName: name,
                    count: c,
                    location: location ?? undefined,
                },
                uid
            );

            Alert.alert(
                "Success",
                "Record updated successfully.",
                [{ text: "OK", onPress: () => router.back() }]
            );
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Unable to update record.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !record || !draft) {
        return (
            <View className="flex-1 bg-white justify-center items-center">
                <ActivityIndicator size="large" color="#134a86" />
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
                <Text className="text-lg font-semibold">Edit Record</Text>
            </View>

            <ScrollView className="flex-1">
                <View className="p-6">
                    {/* Checklist Name */}
                    <View className="bg-gray-50 rounded-lg p-4 mb-6">
                        <Text className="text-sm text-gray-500 mb-1">Checklist</Text>
                        <Text className="text-base font-semibold">{draft.name}</Text>
                    </View>

                    {/* Species Selection */}
                    <Text className="text-sm text-gray-700 mb-2">Species Name*</Text>
                    <Pressable
                        onPress={() => setShowSpeciesDropdown(true)}
                        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
                    >
                        <Text className={selectedSpecies ? "text-black" : "text-gray-400"}>
                            {selectedSpecies || "Select species"}
                        </Text>
                    </Pressable>

                    {/* Count */}
                    <Text className="text-sm text-gray-700 mb-2">Count*</Text>
                    <TextInput
                        className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
                        value={count}
                        onChangeText={setCount}
                        placeholder="e.g., 3"
                        keyboardType="numeric"
                    />

                    {/* Location */}
                    <Text className="text-sm text-gray-700 mb-2">Location</Text>
                    <View className="border border-gray-300 rounded-lg p-4 mb-4">
                        {location ? (
                            <>
                                <Text className="text-sm font-mono mb-1">
                                    Lat: {location.latitude.toFixed(7)}
                                </Text>
                                <Text className="text-sm font-mono mb-2">
                                    Lng: {location.longitude.toFixed(7)}
                                </Text>
                            </>
                        ) : (
                            <Text className="text-gray-500 mb-2">No location set</Text>
                        )}
                        <Pressable
                            onPress={refreshLocation}
                            className="bg-gray-200 rounded-lg px-3 py-2 flex-row items-center justify-center"
                        >
                            <Ionicons name="location-outline" size={16} color="#134a86" />
                            <Text className="text-[#134a86] ml-2">
                                {location ? "Update Location" : "Get Current Location"}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Recorded Date & Time (Read-only) */}
                    <Text className="text-sm text-gray-700 mb-2">Recorded Date & Time</Text>
                    <View className="bg-gray-50 rounded-lg p-4 mb-6">
                        <Text className="text-sm text-gray-600">
                            {new Date(record.observedAt).toLocaleString()}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                            (Cannot be changed)
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Save & Cancel Buttons */}
            <View className="p-6 border-t border-gray-200">
                <View className="flex-row gap-3">
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
            </View>

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