import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ponypxhushxeskxgrmha.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function callEdgeFunction<T = any>(name: string, body?: Record<string, any>, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: supabaseAnonKey };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, { method: "POST", headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Edge function ${name} failed`);
  return data as T;
}

export async function callRPC<T = any>(fnName: string, params?: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.rpc(fnName, params || {});
  if (error) throw error;
  return data as T;
}
