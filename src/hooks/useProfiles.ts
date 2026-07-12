import { useQuery, useMutation } from "@tanstack/react-query";
import { db } from "@/lib/db";
import type { Profile } from "@/types";

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await db.from("profiles").update(data).eq("id", id);
      if (error) throw error;
    },
  });
}
