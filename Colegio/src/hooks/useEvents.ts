import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Event } from "@/types";

export function useEvents(courseIds?: string[]) {
  return useQuery({
    queryKey: ["events", courseIds],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, courses:course_id(*)")
        .order("due_date", { ascending: true });

      if (courseIds?.length) query = query.in("course_id", courseIds);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });
}

export function useUpcomingEvents(limit = 5, courseIds?: string[]) {
  return useQuery({
    queryKey: ["events", "upcoming", limit, courseIds],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*, courses:course_id(*)")
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(limit);

      if (courseIds?.length) query = query.in("course_id", courseIds);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: any) => {
      const { data, error } = await supabase.from("events").insert(event).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
