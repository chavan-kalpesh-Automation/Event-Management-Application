import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const API = process.env.EXPO_PUBLIC_BACKEND_URL as string;
const KEY = "mauli.session.v1";

export type Role = "owner" | "worker";
export type User = { id: string; username: string; full_name?: string | null; role: Role; active: boolean };
export type Session = { access_token: string; refresh_token: string; token_type: string; user: User };

async function save(v: string | null) {
  if (Platform.OS === "web") {
    if (v === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, v);
  } else {
    if (v === null) await SecureStore.deleteItemAsync(KEY);
    else await SecureStore.setItemAsync(KEY, v);
  }
}
async function load(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(KEY);
  return await SecureStore.getItemAsync(KEY);
}

export async function getSession(): Promise<Session | null> {
  const raw = await load();
  return raw ? (JSON.parse(raw) as Session) : null;
}

export async function setSession(s: Session | null) {
  await save(s ? JSON.stringify(s) : null);
}

export async function login(username: string, password: string): Promise<Session> {
  const r = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({} as any));
    throw new Error(j.detail || "Invalid username or password");
  }
  const s: Session = await r.json();
  await setSession(s);
  return s;
}

export async function logout() {
  const s = await getSession();
  if (s) {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
    } catch {}
  }
  await setSession(null);
}

async function refresh(s: Session): Promise<Session> {
  const r = await fetch(`${API}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (!r.ok) {
    await setSession(null);
    throw new Error("Session expired");
  }
  const n: Session = await r.json();
  await setSession(n);
  return n;
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  let s = await getSession();
  if (!s) throw new Error("Not signed in");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${s.access_token}`,
  };
  let r = await fetch(`${API}${path}`, { ...init, headers });
  if (r.status === 401) {
    s = await refresh(s);
    headers.Authorization = `Bearer ${s.access_token}`;
    r = await fetch(`${API}${path}`, { ...init, headers });
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({} as any));
    throw new Error(j.detail || `HTTP ${r.status}`);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}
