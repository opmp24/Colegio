import { useQuery } from "@tanstack/react-query";
import { db } from "@/lib/db";

export function useUpcomingCount(courseIds?: string[]) {
  return useQuery({
    queryKey: ["events", "upcoming", "count", courseIds],
    queryFn: async () => {
      if (courseIds && courseIds.length === 0) return 0;
      let query = db
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("due_date", new Date().toISOString());
      if (courseIds?.length) query = query.in("course_id", courseIds);
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}
