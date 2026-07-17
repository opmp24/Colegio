import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import type { News } from "@/types";

export function useNews() {
  return useQuery({
    queryKey: ["news"],
    queryFn: async () => {
      const { data, error } = await db
        .from("news")
        .select("*, creator:created_by(full_name, avatar_icon, avatar_color), courses:course_id(grade, name, section)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as News[];
    },
  });
}

export function useLatestNews() {
  return useQuery({
    queryKey: ["news", "latest"],
    queryFn: async () => {
      const { data, error } = await db
        .from("news")
        .select("title")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { title: string } | null;
    },
    staleTime: 60_000,
  });
}

export function useCreateNews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (news: Omit<News, "id" | "created_at" | "created_by"> & Partial<Pick<News, "id" | "created_at" | "created_by">>) => {
      const { data, error } = await db.from("news").insert(news).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news"] }),
  });
}

export function useUpdateNews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<News> & { id: string }) => {
      const { error } = await db.from("news").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news"] }),
  });
}

export function useDeleteNews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("news").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["news"] }),
  });
}
