import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import type { EvaluationType } from "@/types";

type EvaluationTypeInsert = Omit<EvaluationType, "id" | "created_at">;

export function useEvaluationTypes() {
  return useQuery({
    queryKey: ["evaluation-types"],
    queryFn: async () => {
      const { data, error } = await db
        .from("evaluation_types")
        .select("*")
        .order("label");
      if (error) throw error;
      return (data ?? []) as EvaluationType[];
    },
  });
}

export function useCreateEvaluationType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evaluationType: EvaluationTypeInsert) => {
      const { data, error } = await db.from("evaluation_types").insert(evaluationType).select().single();
      if (error) throw error;
      return data as EvaluationType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluation-types"] }),
  });
}

export function useUpdateEvaluationType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...evaluationType }: { id: string } & Partial<EvaluationTypeInsert>) => {
      const { data, error } = await db.from("evaluation_types").update(evaluationType).eq("id", id).select().single();
      if (error) throw error;
      return data as EvaluationType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluation-types"] }),
  });
}

export function useDeleteEvaluationType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("evaluation_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluation-types"] }),
  });
}
