import 'react-native-get-random-values';
import { v4 as uuidv4 } from "uuid";
import { getDraftById, getDrafts, removeDraft as removeDraftFromStorage, upsertDraft } from "./storage";
import { supabase } from "./supabase";

// --- TYPE DEFINITIONS ---

export type GeoPoint = { 
    latitude: number; 
    longitude: number; 
    accuracy?: number | null 
};

export type ChecklistEntry = {
    id: string;
    speciesName: string;
    count: number;
    location?: GeoPoint;
    observedAt: number; // Stored as timestamp
};

export type ChecklistDraft = {
    id: string;
    name: string;
    createdAt: number; // Stored as timestamp
    status: "draft" | "submitted";
    entries: ChecklistEntry[];
};

// --- LOCAL DRAFT FUNCTIONS ---

export async function createDraft(name: string, uid?: string): Promise<ChecklistDraft> {
    const draft: ChecklistDraft = {
        id: uuidv4(),
        name: name || "Untitled Checklist",
        createdAt: Date.now(),
        status: "draft",
        entries: [],
    };
    await upsertDraft(draft, uid);
    return draft;
}

export async function getAllDrafts(uid?: string): Promise<ChecklistDraft[]> {
    return await getDrafts(uid) as ChecklistDraft[];
}

export async function addEntryToDraft(
    draftId: string, 
    entryData: { speciesName: string; count: number; location?: GeoPoint },
    uid?: string
): Promise<ChecklistDraft> {
    const draft = await getDraftById(draftId, uid);
    if (!draft) {
        throw new Error("Draft not found");
    }

    const newEntry: ChecklistEntry = {
        id: uuidv4(),
        ...entryData,
        observedAt: Date.now(),
    };

    draft.entries.push(newEntry);
    await upsertDraft(draft, uid);
    return draft;
}

export async function updateEntryInDraft(
    draftId: string,
    entryId: string,
    entryData: { speciesName: string; count: number; location?: GeoPoint },
    uid?: string
): Promise<ChecklistDraft> {
    const draft = await getDraftById(draftId, uid);
    if (!draft) {
        throw new Error("Draft not found");
    }

    const entryIndex = draft.entries.findIndex(e => e.id === entryId);
    if (entryIndex === -1) {
        throw new Error("Entry not found");
    }

    draft.entries[entryIndex] = {
        ...draft.entries[entryIndex],
        ...entryData,
    };

    await upsertDraft(draft, uid);
    return draft;
}

export async function deleteEntryFromDraft(
    draftId: string,
    entryId: string,
    uid?: string
): Promise<ChecklistDraft> {
    const draft = await getDraftById(draftId, uid);
    if (!draft) {
        throw new Error("Draft not found");
    }

    draft.entries = draft.entries.filter(e => e.id !== entryId);
    await upsertDraft(draft, uid);
    return draft;
}

export async function deleteDraft(draftId: string, uid?: string): Promise<void> {
    await removeDraftFromStorage(draftId, uid);
}

// --- SUBMIT TO SUPABASE ---

export async function submitDraft(draftId: string, userId: string): Promise<void> {
    console.log("--- Submitting checklist to Supabase ---");
    
    const draft = await getDraftById(draftId, userId);
    if (!draft) {
        throw new Error("Draft not found");
    }
    if (draft.entries.length === 0) {
        throw new Error("Cannot submit an empty checklist.");
    }

    const now = new Date();
    const submittedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const submittedTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // 1. Insert into submissions table
    const { data: submission, error: submissionError } = await supabase
        .from('submissions')
        .insert({
            checklist_id: draft.id,
            user_id: userId,
            submitted_date: submittedDate,
            submitted_time: submittedTime,
            checklist_name: draft.name,
        })
        .select()
        .single();

    if (submissionError) {
        console.error("Error inserting submission:", submissionError);
        throw new Error(`Failed to submit checklist: ${submissionError.message}`);
    }

    console.log("Submission created:", submission.checklist_id);

    // 2. Insert all records
    const recordsToInsert = draft.entries.map(entry => {
        const entryDate = new Date(entry.observedAt);
        return {
            species_name: entry.speciesName,
            species_count: entry.count,
            recorded_date: entryDate.toISOString().split('T')[0],
            recorded_time: entryDate.toTimeString().split(' ')[0],
            recorded_location_longitude: entry.location?.longitude || null,
            recorded_location_latitude: entry.location?.latitude || null,
            checklist_id: draft.id,
        };
    });

    const { error: recordsError } = await supabase
        .from('records')
        .insert(recordsToInsert);

    if (recordsError) {
        console.error("Error inserting records:", recordsError);
        throw new Error(`Failed to submit records: ${recordsError.message}`);
    }

    console.log(`${recordsToInsert.length} records inserted successfully`);

    // 3. Delete draft from local storage
    await removeDraftFromStorage(draftId, userId);
    console.log("Draft removed from local storage");
}