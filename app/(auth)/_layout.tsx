import { Stack } from "expo-router";

export default function AuthStack() {
    return (
        <Stack
            screenOptions={{
                headerTitle: "LepiNet",
            }}
        >
            <Stack.Screen name="sign-in" options={{ title: "Sign In" }} />
            <Stack.Screen name="sign-up" options={{ title: "Create Account" }} />
            <Stack.Screen name="forgot-password" options={{ title: "Reset Password" }} />
        </Stack>
    );
}