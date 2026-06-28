import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { Course } from "@/types";

export function useUserCourses() {
  const { user } = useAuth();

  return useQuery<Course[]>({
    queryKey: ["user-courses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase as any)
        .from("course_members")
        .select("course_id, courses:course_id(*)")
        .eq("user_id", user.id);

      if (error) throw error;

      return (data ?? []).reduce((acc: Course[], item: any) => {
        if (item.courses) acc.push(item.courses as Course);
        return acc;
      }, []);
    },
    enabled: !!user?.id,
  });
}
