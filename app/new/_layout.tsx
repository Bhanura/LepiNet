import { Stack } from "expo-router";

export default function NewChecklistLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen 
                name="index"
                options={{ headerShown: false }} 
            />
            <Stack.Screen 
                name="form"
                options={{ headerShown: false }} 
            />
            <Stack.Screen 
                name="record-view"
                options={{ headerShown: false }} 
            />
            <Stack.Screen 
                name="edit-record"
                options={{ headerShown: false }} 
            />
        </Stack>
    );
}