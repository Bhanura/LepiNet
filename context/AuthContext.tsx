import { uploadImageAndGetURL } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type UserProfileData = {
    firstName: string;
    lastName: string;
    mobile?: string;
    birthday?: string;
    gender?: string;
    educationalLevel?: string;
};

type UserProfile = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile?: string;
    birthday?: string;
    gender?: string;
    educational_level?: string;
    profile_photo_url?: string;
    created_at?: string;
    updated_at?: string;
};

type AuthContextType = {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (
        email: string,
        password: string,
        imageUri: string | null,
        profileData: UserProfileData
    ) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateProfilePhoto: (imageUri: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (userId: string, silentFail = false) => {
        try {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) {
                // Only log if not a "no rows" error or if not in silent mode
                if (!silentFail && error.code !== 'PGRST116') {
                    console.error("Error fetching profile:", error);
                }
                return null;
            }

            return data as UserProfile;
        } catch (e) {
            if (!silentFail) {
                console.error("Exception fetching profile:", e);
            }
            return null;
        }
    };

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log("Auth state changed:", event);
                setSession(session);
                setUser(session?.user ?? null);
                
                if (session?.user) {
                    // For SIGNED_IN events during signup, wait longer and retry with silent fails
                    if (event === 'SIGNED_IN') {
                        let attempts = 0;
                        let profileData = null;
                        
                        // Wait 1 second before first attempt
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        while (attempts < 5 && !profileData) {
                            profileData = await fetchUserProfile(session.user.id, true); // Silent fail
                            if (!profileData) {
                                await new Promise(resolve => setTimeout(resolve, 800));
                                attempts++;
                            }
                        }
                        
                        setProfile(profileData);
                    } else if (event === 'INITIAL_SESSION') {
                        // For initial session, try with retries but allow normal errors
                        let attempts = 0;
                        let profileData = null;
                        
                        while (attempts < 3 && !profileData) {
                            profileData = await fetchUserProfile(session.user.id, attempts > 0); // Silent after first attempt
                            if (!profileData) {
                                await new Promise(resolve => setTimeout(resolve, 500));
                                attempts++;
                            }
                        }
                        
                        setProfile(profileData);
                    } else {
                        // For other events, just fetch normally
                        const profileData = await fetchUserProfile(session.user.id);
                        setProfile(profileData);
                    }
                } else {
                    setProfile(null);
                }
                
                setLoading(false);
            }
        );

        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                let attempts = 0;
                let profileData = null;
                
                while (attempts < 3 && !profileData) {
                    profileData = await fetchUserProfile(session.user.id, attempts > 0);
                    if (!profileData) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        attempts++;
                    }
                }
                
                setProfile(profileData);
            }
            
            setLoading(false);
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    const refreshProfile = async () => {
        if (user) {
            const profileData = await fetchUserProfile(user.id);
            setProfile(profileData);
        }
    };

    const value = useMemo(
        () => ({
            user,
            profile,
            session,
            loading,
            
            async signIn(email: string, password: string) {
                console.log("Attempting sign in for:", email);
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password,
                });
                if (error) throw error;
                console.log("Sign in successful");
            },

            async signUp(
                email: string,
                password: string,
                imageUri: string | null,
                profileData: UserProfileData
            ) {
                console.log("Creating auth user for:", email);
                
                const { data, error: authError } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password,
                });

                if (authError) {
                    console.error("Auth signup error:", authError);
                    throw authError;
                }
                
                if (!data.user) {
                    throw new Error("Sign up failed: No user returned");
                }

                const newUser = data.user;
                console.log("Auth user created:", newUser.id);
                
                // Photo upload - optional
                let profilePhotoUrl = "";
                if (imageUri) {
                    try {
                        const url = await uploadImageAndGetURL(imageUri, "profile_photos", newUser);
                        if (url) profilePhotoUrl = url;
                    } catch (e) {
                        console.error("Photo upload failed during signup:", e);
                    }
                }

                console.log("Creating user profile in database...");
                
                // Insert profile with retry logic
                let insertSuccess = false;
                let attempts = 0;
                
                while (!insertSuccess && attempts < 3) {
                    const { error: userError } = await supabase
                        .from("users")
                        .insert({
                            id: newUser.id,
                            first_name: profileData.firstName,
                            last_name: profileData.lastName,
                            mobile: profileData.mobile || "",
                            birthday: profileData.birthday || "",
                            gender: profileData.gender || "",
                            educational_level: profileData.educationalLevel || "",
                            profile_photo_url: profilePhotoUrl,
                            email: newUser.email!
                        });

                    if (!userError) {
                        insertSuccess = true;
                        console.log("User profile created successfully");
                    } else if (userError.code !== '23505') { // Not a duplicate key error
                        console.error("Error saving user profile:", userError);
                        throw new Error(`Failed to save user profile: ${userError.message}`);
                    } else {
                        // Profile already exists (race condition), that's ok
                        insertSuccess = true;
                        console.log("User profile already exists");
                    }
                    
                    attempts++;
                    if (!insertSuccess && attempts < 3) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
                
                // Wait a bit to ensure the profile is fully committed
                await new Promise(resolve => setTimeout(resolve, 1000));
            },

            async resetPassword(email: string) {
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
                if (error) throw error;
            },
            
            async signOut() {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                setProfile(null);
            },
            
            refreshProfile,

            async updateProfilePhoto(imageUri: string) {
                if (!user) throw new Error("User not authenticated");

                console.log("Uploading new profile photo...");
                
                const url = await uploadImageAndGetURL(imageUri, "profile_photos", user);
                if (!url) {
                    throw new Error("Failed to upload image");
                }

                console.log("Updating profile with new photo URL...");
                const { error } = await supabase
                    .from("users")
                    .update({ 
                        profile_photo_url: url,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", user.id);

                if (error) {
                    throw error;
                }

                await refreshProfile();
                console.log("Profile photo updated successfully");
            },
        }),
        [user, profile, session, loading, refreshProfile]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}