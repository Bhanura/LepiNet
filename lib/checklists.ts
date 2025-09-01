import { db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDraftById, getDrafts, saveDrafts, upsertDraft } from "./storage";

export type GeoPoint = { latitude: number; longitude: number; accuracy?: number | null };
export type ChecklistEntry = {
    id: string;
    speciesName: string;
    count: number;
    observedAt: string; // ISO
    location?: GeoPoint | null;
};
export type ChecklistDraft = {
    id: string;
    name: string;
    createdAt: string; // ISO
    updatedAt: string; // ISO
    status: "draft" | "submitted";
    entries: ChecklistEntry[];
};

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function createDraft(name: string, uid?: string) {
    const now = new Date().toISOString();
    const draft: ChecklistDraft = {
        id: newId(),
        name: name.trim() || "Untitled Checklist",
        createdAt: now,
        updatedAt: now,
        status: "draft",
        entries: [],
    };
    await upsertDraft(draft, uid);
    return draft;
}

export async function addEntryToDraft(
    draftId: string,
    entry: Omit<ChecklistEntry, "id" | "observedAt"> & { observedAt?: string },
    uid?: string
) {
    const draft = await getDraftById(draftId, uid);
    if (!draft) throw new Error("Draft not found");
    const e: ChecklistEntry = {
        id: newId(),
        speciesName: entry.speciesName,
        count: entry.count,
        observedAt: entry.observedAt ?? new Date().toISOString(),
        location: entry.location ?? null,
    };
    draft.entries.unshift(e);
    draft.updatedAt = new Date().toISOString();
    await upsertDraft(draft, uid);
    return draft;
}

export async function getAllDrafts(uid?: string) {
    return (await getDrafts(uid)) as ChecklistDraft[];
}

export async function submitDraft(draftId: string, uid: string) {
    const draft = await getDraftById(draftId, uid);
    if (!draft) throw new Error("Draft not found");
    if (!uid) throw new Error("You must be signed in to submit.");
    if (!draft.entries.length) throw new Error("Add at least one observation.");

    // Persist to Firestore (users/{uid}/checklists/{id})
    const ref = doc(db, "users", uid, "checklists", draft.id);
    await setDoc(ref, {
        id: draft.id,
        name: draft.name,
        createdAt: draft.createdAt,
        updatedAt: new Date().toISOString(),
        status: "submitted",
        entries: draft.entries,
        submittedAt: serverTimestamp(),
    });

    // Mark local as submitted (keep it for history)
    draft.status = "submitted";
    draft.updatedAt = new Date().toISOString();

    // Save updated drafts list
    const list = await getDrafts(uid);
    const idx = list.findIndex((d: ChecklistDraft) => d.id === draft.id);
    if (idx >= 0) list[idx] = draft;
    await saveDrafts(list, uid);

    return draft;
}