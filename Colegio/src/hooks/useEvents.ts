import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Event } from "@/types";

export function useEvents(courseId?: string) {
  return useQuery({
    queryKey: ["events", courseId],
    queryFn: async () => {
      let query = supabase
        .from("events")
        .select("*")
        .order("due_date", { ascending: true });

      if (courseId) query = query.eq("course_id", courseId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });
}

export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: ["events", "upcoming", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*, courses:course_id(*)")
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(limit);

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
