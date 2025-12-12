import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View
} from 'react-native';
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';

type DateFilter = 'last3days' | 'last7days' | 'custom';
type DistanceFilter = '5km' | '10km' | 'custom';

type Hotspot = {
    lat: number;
    lng: number;
    recordCount: number;
    species: string[];
};

export default function Explore() {
    const mapRef = useRef<MapView>(null);
    
    // Map state
    const [region, setRegion] = useState<Region>({
        latitude: 7.8731,
        longitude: 80.7718,
        latitudeDelta: 5,
        longitudeDelta: 5,
    });
    const [markerPosition, setMarkerPosition] = useState({
        latitude: 7.8731,
        longitude: 80.7718,
    });

    // Filter states
    const [searchText, setSearchText] = useState('');
    const [dateFilter, setDateFilter] = useState<DateFilter>('last7days');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [speciesFilter, setSpeciesFilter] = useState('all');
    const [allSpecies, setAllSpecies] = useState<string[]>([]);
    const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('10km');
    const [customDistance, setCustomDistance] = useState('');

    // Data states
    const [hotspots, setHotspots] = useState<Hotspot[]>([]);
    const [heatmapPoints, setHeatmapPoints] = useState<Array<{latitude: number, longitude: number, weight?: number}>>([]);
    const [hotspotCount, setHotspotCount] = useState(0);
    const [speciesCount, setSpeciesCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Modal states
    const [showSpeciesModal, setShowSpeciesModal] = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [showDistanceModal, setShowDistanceModal] = useState(false);

    // Load all species for dropdown
    useEffect(() => {
        loadAllSpecies();
        getCurrentLocation();
    }, []);

    const loadAllSpecies = async () => {
        const { data, error } = await supabase
            .from('records')
            .select('species_name')
            .not('species_name', 'is', null);

        if (!error && data) {
            const unique = [...new Set(data.map(r => r.species_name))].sort();
            setAllSpecies(unique);
        }
    };

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Location permission is required.');
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            const newPos = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            
            setMarkerPosition(newPos);
            setRegion({
                ...newPos,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            });
            
            mapRef.current?.animateToRegion({
                ...newPos,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            });
        } catch (error) {
            console.error('Error getting location:', error);
        }
    };

    const searchLocation = async () => {
        if (!searchText.trim()) return;

        try {
            const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchText)}&key=${apiKey}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                const newPos = {
                    latitude: location.lat,
                    longitude: location.lng,
                };

                setMarkerPosition(newPos);
                mapRef.current?.animateToRegion({
                    ...newPos,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                });
            } else {
                Alert.alert('Not found', 'Location not found. Try a different search.');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            Alert.alert('Error', 'Failed to search location.');
        }
    };

    const fetchHotspots = async () => {
        setLoading(true);
        try {
            // Calculate date range
            let start = '';
            let end = new Date().toISOString().split('T')[0];

            if (dateFilter === 'last3days') {
                const d = new Date();
                d.setDate(d.getDate() - 3);
                start = d.toISOString().split('T')[0];
            } else if (dateFilter === 'last7days') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                start = d.toISOString().split('T')[0];
            } else if (dateFilter === 'custom' && startDate && endDate) {
                start = startDate;
                end = endDate;
            }

            // Calculate radius
            let radius = 10;
            if (distanceFilter === '5km') {
                radius = 5;
            } else if (distanceFilter === '10km') {
                radius = 10;
            } else if (distanceFilter === 'custom' && customDistance) {
                radius = parseFloat(customDistance);
            }

            console.log('Fetching hotspots with params:', {
                centerLat: markerPosition.latitude,
                centerLng: markerPosition.longitude,
                radiusKm: radius,
                species: speciesFilter,
                startDate: start,
                endDate: end
            });

            // Call edge function
            const functionUrl = process.env.EXPO_PUBLIC_HOTSPOT_FUNCTION_URL;
            const { data: { session } } = await supabase.auth.getSession();
            
            const response = await fetch(functionUrl!, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    centerLat: markerPosition.latitude,
                    centerLng: markerPosition.longitude,
                    radiusKm: radius,
                    species: speciesFilter,
                    startDate: start,
                    endDate: end
                })
            });

            const result = await response.json();
            console.log('Hotspots result:', result);

            setHotspots(result.hotspots || []);
            setHotspotCount(result.hotspotCount || 0);
            setSpeciesCount(result.speciesCount || 0);
            
            // Set heatmap points
            if (result.allRecords && result.allRecords.length > 0) {
                setHeatmapPoints(
                    result.allRecords.map((r: any) => ({
                        latitude: r.lat,
                        longitude: r.lng,
                        weight: 1
                    }))
                );
            }

        } catch (error) {
            console.error('Error fetching hotspots:', error);
            Alert.alert('Error', 'Failed to load hotspots. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch on filter change
    useEffect(() => {
        fetchHotspots();
    }, [markerPosition, dateFilter, speciesFilter, distanceFilter, customDistance, startDate, endDate]);

    const getDistanceText = () => {
        if (distanceFilter === '5km') return '5 km';
        if (distanceFilter === '10km') return '10 km';
        if (distanceFilter === 'custom' && customDistance) return `${customDistance} km`;
        return '10 km';
    };

    const getDateText = () => {
        if (dateFilter === 'last3days') return 'Last 3 Days';
        if (dateFilter === 'last7days') return 'Last 7 Days';
        if (dateFilter === 'custom' && startDate && endDate) {
            return `${startDate} to ${endDate}`;
        }
        return 'Last 7 Days';
    };

    return (
        <View className="flex-1 bg-white">
            <ScrollView className="flex-1">
                {/* Search Bar */}
                <View className="p-4">
                    <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                        <Ionicons name="search" size={20} color="#666" />
                        <TextInput
                            className="flex-1 ml-2 text-base"
                            placeholder="Search location..."
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={searchLocation}
                        />
                        {searchText.length > 0 && (
                            <Pressable onPress={() => setSearchText('')}>
                                <Ionicons name="close-circle" size={20} color="#666" />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Map */}
                <View className="h-80 mx-4 mb-4 rounded-lg overflow-hidden">
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={{ flex: 1 }}
                        region={region}
                        onRegionChangeComplete={setRegion}
                    >
                        {/* Heatmap */}
                        {heatmapPoints.length > 0 && (
                            <Heatmap
                                points={heatmapPoints}
                                opacity={0.7}
                                radius={50}
                                gradient={{
                                    colors: ['#00FF00', '#FFFF00', '#FF0000'],
                                    startPoints: [0.1, 0.5, 1.0],
                                    colorMapSize: 256
                                }}
                            />
                        )}

                        {/* Center Marker */}
                        <Marker
                            coordinate={markerPosition}
                            draggable
                            onDragEnd={(e) => setMarkerPosition(e.nativeEvent.coordinate)}
                        >
                            <View className="bg-[#134a86] p-2 rounded-full">
                                <Ionicons name="location" size={24} color="white" />
                            </View>
                        </Marker>

                        {/* Hotspot Markers */}
                        {hotspots.map((hotspot, index) => (
                            <Marker
                                key={index}
                                coordinate={{ latitude: hotspot.lat, longitude: hotspot.lng }}
                                onPress={() => {
                                    Alert.alert(
                                        'Hotspot Details',
                                        `Records: ${hotspot.recordCount}\nSpecies: ${hotspot.species.join(', ')}`
                                    );
                                }}
                            >
                                <View className="bg-red-500 p-2 rounded-full items-center justify-center">
                                    <Ionicons name="flame" size={20} color="white" />
                                </View>
                            </Marker>
                        ))}
                    </MapView>

                    {/* Current Location Button */}
                    <Pressable
                        onPress={getCurrentLocation}
                        className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-lg"
                    >
                        <Ionicons name="locate" size={24} color="#134a86" />
                    </Pressable>
                </View>

                {/* Filters */}
                <View className="px-4 space-y-3 mb-4">
                    {/* Date Range Filter */}
                    <View>
                        <Text className="text-sm text-gray-700 mb-2 font-semibold">Date Range</Text>
                        <Pressable
                            onPress={() => setShowDateModal(true)}
                            className="bg-gray-100 rounded-lg px-4 py-3 flex-row justify-between items-center"
                        >
                            <Text className="text-gray-800">{getDateText()}</Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </Pressable>
                    </View>

                    {/* Species Filter */}
                    <View>
                        <Text className="text-sm text-gray-700 mb-2 font-semibold">Species</Text>
                        <Pressable
                            onPress={() => setShowSpeciesModal(true)}
                            className="bg-gray-100 rounded-lg px-4 py-3 flex-row justify-between items-center"
                        >
                            <Text className="text-gray-800">
                                {speciesFilter === 'all' ? 'All Species' : speciesFilter}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </Pressable>
                    </View>

                    {/* Distance Range Filter */}
                    <View>
                        <Text className="text-sm text-gray-700 mb-2 font-semibold">Area Range</Text>
                        <Pressable
                            onPress={() => setShowDistanceModal(true)}
                            className="bg-gray-100 rounded-lg px-4 py-3 flex-row justify-between items-center"
                        >
                            <Text className="text-gray-800">Within {getDistanceText()}</Text>
                            <Ionicons name="chevron-down" size={20} color="#666" />
                        </Pressable>
                    </View>
                </View>

                {/* Results */}
                <View className="px-4 mb-6">
                    <View className="bg-[#134a86] rounded-lg p-4 mb-3">
                        <Text className="text-white text-sm mb-1">Number of Hotspots Nearby</Text>
                        <Text className="text-white text-3xl font-bold">
                            {loading ? '...' : hotspotCount}
                        </Text>
                    </View>

                    <View className="bg-green-600 rounded-lg p-4">
                        <Text className="text-white text-sm mb-1">Number of Species Found</Text>
                        <Text className="text-white text-3xl font-bold">
                            {loading ? '...' : speciesCount}
                        </Text>
                    </View>
                </View>

                {loading && (
                    <View className="items-center py-4">
                        <ActivityIndicator size="large" color="#134a86" />
                        <Text className="text-gray-600 mt-2">Loading data...</Text>
                    </View>
                )}
            </ScrollView>

            {/* Species Selection Modal */}
            <Modal
                visible={showSpeciesModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowSpeciesModal(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl" style={{ height: '60%' }}>
                        <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
                            <Text className="text-lg font-semibold">Select Species</Text>
                            <Pressable onPress={() => setShowSpeciesModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </Pressable>
                        </View>
                        <ScrollView>
                            <Pressable
                                onPress={() => {
                                    setSpeciesFilter('all');
                                    setShowSpeciesModal(false);
                                }}
                                className="px-4 py-3 border-b border-gray-100"
                            >
                                <Text className={`text-base ${speciesFilter === 'all' ? 'font-bold text-[#134a86]' : ''}`}>
                                    All Species
                                </Text>
                            </Pressable>
                            {allSpecies.map((species) => (
                                <Pressable
                                    key={species}
                                    onPress={() => {
                                        setSpeciesFilter(species);
                                        setShowSpeciesModal(false);
                                    }}
                                    className="px-4 py-3 border-b border-gray-100"
                                >
                                    <Text className={`text-base ${speciesFilter === species ? 'font-bold text-[#134a86]' : ''}`}>
                                        {species}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Date Range Modal */}
            <Modal
                visible={showDateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDateModal(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-semibold">Date Range</Text>
                            <Pressable onPress={() => setShowDateModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={() => {
                                setDateFilter('last3days');
                                setShowDateModal(false);
                            }}
                            className="py-3 border-b border-gray-100"
                        >
                            <Text className={`text-base ${dateFilter === 'last3days' ? 'font-bold text-[#134a86]' : ''}`}>
                                Last 3 Days
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                setDateFilter('last7days');
                                setShowDateModal(false);
                            }}
                            className="py-3 border-b border-gray-100"
                        >
                            <Text className={`text-base ${dateFilter === 'last7days' ? 'font-bold text-[#134a86]' : ''}`}>
                                Last 7 Days
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setDateFilter('custom')}
                            className="py-3 border-b border-gray-100"
                        >
                            <Text className={`text-base ${dateFilter === 'custom' ? 'font-bold text-[#134a86]' : ''}`}>
                                Custom Range
                            </Text>
                        </Pressable>

                        {dateFilter === 'custom' && (
                            <View className="mt-4">
                                <Text className="text-sm text-gray-700 mb-2">Start Date</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
                                    placeholder="YYYY-MM-DD"
                                    value={startDate}
                                    onChangeText={setStartDate}
                                />
                                <Text className="text-sm text-gray-700 mb-2">End Date</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
                                    placeholder="YYYY-MM-DD"
                                    value={endDate}
                                    onChangeText={setEndDate}
                                />
                                <Pressable
                                    onPress={() => setShowDateModal(false)}
                                    className="bg-[#134a86] rounded-lg px-4 py-3"
                                >
                                    <Text className="text-white text-center font-semibold">Apply</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Distance Range Modal */}
            <Modal
                visible={showDistanceModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDistanceModal(false)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-semibold">Area Range</Text>
                            <Pressable onPress={() => setShowDistanceModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={() => {
                                setDistanceFilter('5km');
                                setShowDistanceModal(false);
                            }}
                            className="py-3 border-b border-gray-100"
                        >
                            <Text className={`text-base ${distanceFilter === '5km' ? 'font-bold text-[#134a86]' : ''}`}>
                                Within 5 km
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => {
                                setDistanceFilter('10km');
                                setShowDistanceModal(false);
                            }}
                            className="py-3 border-b border-gray-100"
                        >
                            <Text className={`text-base ${distanceFilter === '10km' ? 'font-bold text-[#134a86]' : ''}`}>
                                Within 10 km
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => setDistanceFilter('custom')}
                            className="py-3 border-b border-gray-100"
                        >
                            <Text className={`text-base ${distanceFilter === 'custom' ? 'font-bold text-[#134a86]' : ''}`}>
                                Custom Range
                            </Text>
                        </Pressable>

                        {distanceFilter === 'custom' && (
                            <View className="mt-4">
                                <Text className="text-sm text-gray-700 mb-2">Distance (km)</Text>
                                <TextInput
                                    className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
                                    placeholder="Enter distance"
                                    keyboardType="numeric"
                                    value={customDistance}
                                    onChangeText={setCustomDistance}
                                />
                                <Pressable
                                    onPress={() => setShowDistanceModal(false)}
                                    className="bg-[#134a86] rounded-lg px-4 py-3"
                                >
                                    <Text className="text-white text-center font-semibold">Apply</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}