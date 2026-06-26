import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Subject } from "@/types";

type SubjectInsert = Omit<Subject, "id" | "created_at">;

export function useSubjects(courseId?: string) {
  return useQuery({
    queryKey: ["subjects", courseId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("subjects")
        .select("*")
        .order("name");

      if (courseId) query = query.eq("course_id", courseId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Subject[];
    },
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subject: SubjectInsert) => {
      const { data, error } = await (supabase as any).from("subjects").insert(subject).select().single();
      if (error) throw error;
      return data as Subject;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...subject }: { id: string } & Partial<SubjectInsert>) => {
      const { data, error } = await (supabase as any).from("subjects").update(subject).eq("id", id).select().single();
      if (error) throw error;
      return data as Subject;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}
