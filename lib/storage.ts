import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@supabase/supabase-js";
import { decode } from 'base64-arraybuffer';
// Note: Using legacy API - consider migrating to current FileSystem API in future updates
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from "react-native";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from "uuid";

// --- All your AsyncStorage functions remain unchanged ---
export const draftsKey = (uid?: string) => `lepinet:drafts:${uid ?? "anon"}`;

export async function getDrafts(uid?: string) {
    const raw = await AsyncStorage.getItem(draftsKey(uid));
    return raw ? (JSON.parse(raw) as any[]) : [];
}

export async function saveDrafts(drafts: any[], uid?: string) {
    await AsyncStorage.setItem(draftsKey(uid), JSON.stringify(drafts));
}

export async function upsertDraft(draft: any, uid?: string) {
    const list = await getDrafts(uid);
    const idx = list.findIndex((d) => d.id === draft.id);
    if (idx >= 0) list[idx] = draft;
    else list.unshift(draft);
    await saveDrafts(list, uid);
    return draft;
}

export async function getDraftById(id: string, uid?: string) {
    const list = await getDrafts(uid);
    return list.find((d) => d.id === id) ?? null;
}

export async function removeDraft(id: string, uid?: string) {
    const list = await getDrafts(uid);
    const next = list.filter((d) => d.id !== id);
    await saveDrafts(next, uid);
}

/**
 * Uploads an image to Supabase Storage and returns the public URL.
 * Note: Currently uses legacy FileSystem API. Consider migrating to current API.
 */
export const uploadImageAndGetURL = async (
    uri: string, 
    bucketName: string, 
    user: User
): Promise<string | null> => {
    try {
        if (!user) {
            throw new Error("User not authenticated");
        }
        
        console.log("Starting image upload for user:", user.id);
        
        // 1. Create a unique file path
        const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        console.log("Reading file from:", uri);

        // 2. Read the file as a Base64 string (using legacy API, consider updating)
        const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log("File read successfully, size:", base64.length, "characters");

        // 3. Upload the file
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, decode(base64), {
                contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
                upsert: false,
            });

        if (uploadError) {
            console.error("Supabase upload error:", uploadError);
            throw uploadError;
        }

        console.log("Upload successful:", uploadData.path);

        // 4. Get the public URL
        const { data: publicUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(uploadData.path);

        if (!publicUrlData) {
            throw new Error("Could not get public URL for uploaded image.");
        }
        
        console.log("Public URL generated:", publicUrlData.publicUrl);
        return publicUrlData.publicUrl;

    } catch (e: any) {
        console.error("Image upload failed:", e);
        Alert.alert("Upload Error", "Failed to upload profile image. Please try again.");
        return null;
    }
};