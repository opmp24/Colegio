import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import type { Event } from "@/types";

export function useEvents(courseIds?: string[]) {
  return useQuery({
    queryKey: ["events", courseIds],
    queryFn: async () => {
      if (courseIds && courseIds.length === 0) return [];

      let query = db
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
      if (courseIds && courseIds.length === 0) return [];

      let query = db
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
    mutationFn: async (event: Omit<Event, "id" | "created_at" | "created_by"> & Partial<Pick<Event, "id" | "created_at" | "created_by">>) => {
      const { data, error } = await db.from("events").insert(event).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (newEvent: any) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await qc.cancelQueries({ queryKey: ["events"] });

      // Snapshot the previous value
      const previousEvents = qc.getQueryData<Event[]>(["events"]) ?? [];

      // Create a temporary ID for the optimistic record
      const tempId = `temp-${Date.now()}`;
      const optimisticEvent: Event = {
        id: tempId,
        course_id: newEvent.course_id,
        subject_id: newEvent.subject_id ?? null,
        title: newEvent.title,
        description: newEvent.description ?? null,
        type: newEvent.type,
        due_date: newEvent.due_date,
        created_by: newEvent.created_by ?? "",
        created_at: new Date().toISOString(), // temporary
        courses: undefined,
      };

      // Optimistically update to the new array
      qc.setQueryData<Event[]>(["events"], (old = []) => [...old, optimisticEvent]);

      // Return a context object with the snapshot and tempId
      return { previousEvents, tempId };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous data
      if (context?.previousEvents !== undefined) {
        qc.setQueryData<Event[]>(["events"], context.previousEvents);
      }
    },
    onSuccess: (_data, _variables, context) => {
      // Replace the optimistic temporary ID with the real ID from the server
      if (context?.tempId) {
        qc.setQueryData<Event[]>(["events"], (old = []) =>
          old.map((item) => (item.id === context.tempId ? _data : item))
        );
      }
    },
    // Optionally, refetch after mutation to ensure server state
    onSettled: () => {
      // refetch to be safe
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}