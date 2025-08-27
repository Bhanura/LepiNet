import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut as fbSignOut,
    updateProfile,
} from "firebase/auth";

type AuthContextType = {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName?: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const value = useMemo(
        () => ({
            user,
            loading,
            async signIn(email: string, password: string) {
                await signInWithEmailAndPassword(auth, email.trim(), password);
            },
            async signUp(email: string, password: string, displayName?: string) {
                const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
                if (displayName) {
                    await updateProfile(cred.user, { displayName });
                }
            },
            async resetPassword(email: string) {
                await sendPasswordResetEmail(auth, email.trim());
            },
            async signOut() {
                await fbSignOut(auth);
            },
        }),
        [user, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}