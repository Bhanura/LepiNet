import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import * as Location from 'expo-location';
import { addEntryToDraft, ChecklistDraft, submitDraft } from "@/lib/checklists";
import { getDraftById } from "@/lib/storage";
import { SPECIES } from "@/constants/species";
import { auth } from "@/lib/firebase";

type LocState = {
    hasPermission: boolean;
    coords?: { latitude: number; longitude: number; accuracy?: number | null } | null;
};

export default function ChecklistForm() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const uid = auth.currentUser?.uid;

    const [draft, setDraft] = useState<ChecklistDraft | null>(null);
    const [speciesQuery, setSpeciesQuery] = useState("");
    const [selectedSpecies, setSelectedSpecies] = useState<string>("");
    const [count, setCount] = useState<string>("");
    const [loc, setLoc] = useState<LocState>({ hasPermission: false, coords: null });
    const [submitting, setSubmitting] = useState(false);

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

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            const granted = status === "granted";
            if (!granted) {
                setLoc({ hasPermission: false, coords: null });
                return;
            }
            setLoc((s) => ({ ...s, hasPermission: true }));
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setLoc({ hasPermission: true, coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy ?? null } });
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
        } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Unable to add record.");
        }
    };

    const onSubmit = async () => {
        if (!uid) {
            Alert.alert("Sign in required", "Please sign in to submit your checklist.");
            return;
        }
        try {
            setSubmitting(true);
            await submitDraft(id!, uid);
            Alert.alert("Submitted", "Your checklist has been submitted.", [
                { text: "OK", onPress: () => router.replace("/(tabs)") },
            ]);
        } catch (e: any) {
            Alert.alert("Submit failed", e?.message ?? "Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View className="flex-1 bg-white p-6">
            {!draft ? (
                <Text>Loading...</Text>
            ) : (
                <>
                    <Text className="text-xl font-semibold mb-1">{draft.name}</Text>
                    <Text className="text-gray-600 mb-4">
                        Created: {new Date(draft.createdAt).toLocaleString()}
                    </Text>

                    <View className="border border-gray-200 rounded-lg p-4 mb-4">
                        <Text className="text-base font-medium mb-2">Add observation</Text>

                        <Text className="text-sm text-gray-700 mb-1">Species</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg px-3 py-3 mb-2"
                            value={speciesQuery}
                            onChangeText={(t) => {
                                setSpeciesQuery(t);
                                setSelectedSpecies("");
                            }}
                            placeholder="Type to search species"
                            autoCapitalize="none"
                        />
                        {speciesQuery.length > 0 || !selectedSpecies ? (
                            <View className="max-h-40 border border-gray-200 rounded-md mb-2">
                                <FlatList
                                    data={filteredSpecies}
                                    keyExtractor={(item) => item}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item }) => (
                                        <Pressable
                                            onPress={() => {
                                                setSelectedSpecies(item);
                                                setSpeciesQuery(item);
                                            }}
                                            className="px-3 py-2"
                                        >
                                            <Text>{item}</Text>
                                        </Pressable>
                                    )}
                                />
                            </View>
                        ) : null}

                        <Text className="text-sm text-gray-700 mb-1">Number of observations</Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg px-3 py-3 mb-3"
                            value={count}
                            onChangeText={setCount}
                            placeholder="e.g., 3"
                            keyboardType="numeric"
                        />

                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-sm text-gray-700">
                                Location:{" "}
                                {loc.coords
                                    ? `${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`
                                    : loc.hasPermission
                                        ? "Locating..."
                                        : "Permission needed"}
                            </Text>
                            <Pressable
                                onPress={async () => {
                                    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                                    setLoc({
                                        hasPermission: true,
                                        coords: {
                                            latitude: pos.coords.latitude,
                                            longitude: pos.coords.longitude,
                                            accuracy: pos.coords.accuracy ?? null,
                                        },
                                    });
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <Text>Refresh</Text>
                            </Pressable>
                        </View>

                        <Pressable onPress={addRecord} className="bg-[#134a86] rounded-lg px-4 py-3 items-center">
                            <Text className="text-white font-medium">Add record</Text>
                        </Pressable>
                    </View>

                    <Text className="text-base font-medium mb-2">Records ({draft.entries.length})</Text>
                    <FlatList
                        data={draft.entries}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <View className="border border-gray-200 rounded-lg p-3 mb-2">
                                <Text className="font-medium">{item.speciesName}</Text>
                                <Text className="text-gray-700">Count: {item.count}</Text>
                                <Text className="text-gray-500 text-xs">
                                    {new Date(item.observedAt).toLocaleString()}
                                    {item.location
                                        ? ` • ${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)}`
                                        : ""}
                                </Text>
                            </View>
                        )}
                    />

                    <Pressable
                        onPress={onSubmit}
                        disabled={submitting || !draft.entries.length}
                        className={`rounded-lg px-4 py-3 items-center ${draft.entries.length ? "bg-green-600" : "bg-gray-300"}`}
                    >
                        <Text className="text-white font-medium">
                            {submitting ? "Submitting..." : "Submit Checklist"}
                        </Text>
                    </Pressable>
                </>
            )}
        </View>
    );
}