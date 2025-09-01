import { Stack } from "expo-router";

export default function NewChecklistLayout() {
    return (
        <Stack screenOptions={{ headerTitle: "New Checklist" }}>
            <Stack.Screen name="index" options={{ title: "Name" }} />
            <Stack.Screen name="form" options={{ title: "Checklist Form" }} />
        </Stack>
    );
}