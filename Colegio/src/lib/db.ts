import { supabase } from "./supabase";

function from(table: string) {
  return supabase.from(table) as any;
}

function rpc(name: string, params?: Record<string, unknown>) {
  return (supabase as any).rpc(name, params);
}

export const db = { from, rpc };
