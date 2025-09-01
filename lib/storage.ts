import AsyncStorage from "@react-native-async-storage/async-storage";

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