import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import type { Profile, UserRole } from "@/types";

export function useCreateUser() {
  const { createUser } = useAdminAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      full_name: string;
      email: string;
      role: UserRole;
      course_ids?: string[];
    }) => {
      return await createUser(params);
    },
    onMutate: async (newUserData) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await qc.cancelQueries({ queryKey: ["profiles"] });

      // Snapshot the previous value
      const previousProfiles = qc.getQueryData<Profile[]>(["profiles"]) ?? [];

      // Create a temporary user object with a temporary ID
      const tempId = `temp-${Date.now()}`;
      const optimisticUser: Profile = {
        id: tempId,
        full_name: newUserData.full_name,
        email: newUserData.email,
        role: newUserData.role,
        pin: null,
        pin_hash: null,
        setup_complete: false,
        is_blocked: false,
        avatar_url: null,
        avatar_icon: "",
        avatar_color: "#6366f1",
        created_at: new Date().toISOString(),
        permissions: [],
      };

      // Optimistically update to the new array
      qc.setQueryData<Profile[]>(["profiles"], (old = []) => [...old, optimisticUser]);

      // Return a context object with the snapshot and tempId
      return { previousProfiles, tempId };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous data
      if (context?.previousProfiles !== undefined) {
        qc.setQueryData<Profile[]>(["profiles"], context.previousProfiles);
      }
    },
    onSuccess: (data, variables, context) => {
      // Replace the temporary user with the actual user from server
      if (context?.tempId) {
        qc.setQueryData<Profile[]>(["profiles"], (old = []) =>
          old.map((user) =>
            user.id === context.tempId
              ? {
                  ...user,
                  id: data.user_id,
                  pin: null,
                  pin_hash: null,
                  setup_complete: false,
                  full_name: variables.full_name,
                  email: variables.email,
                  role: variables.role,
                  avatar_icon: "",
                  avatar_color: "#6366f1",
                }
              : user
          )
        );
      }
    },
    // Optionally, refetch after mutation to ensure server state
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}