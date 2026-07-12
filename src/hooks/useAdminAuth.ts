import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types";

const ADMIN_FUNCTION = "admin-auth";

interface CreateUserParams {
  full_name: string;
  email: string;
  role: UserRole;
  course_ids?: string[];
}

interface CreateUserResult {
  ok: boolean;
  user_id: string;
}

interface ResetPinResult {
  ok: boolean;
}

interface ToggleBlockResult {
  ok: boolean;
  is_blocked: boolean;
}

interface VerifyTokenResult {
  ok: boolean;
  user_id: string;
  email: string;
  full_name: string;
}

interface CompleteSetupResult {
  ok: boolean;
}

interface MigrateAllResult {
  ok: boolean;
  count: number;
}

export function useAdminAuth() {
  const callFunction = useCallback(async <T>(body: Record<string, unknown>): Promise<T> => {
    const { data, error } = await supabase.functions.invoke(ADMIN_FUNCTION, {
      body: { site_url: window.location.origin, ...body },
    });
    if (error) {
      let msg = error.message ?? "Error desconocido";
      try {
        if (error.context && typeof error.context.json === "function") {
          const body = await error.context.json();
          if (body?.error) msg = body.error;
        }
      } catch {}
      throw new Error(msg);
    }
    if (!data.ok) throw new Error(data.error ?? "Error desconocido");
    return data as T;
  }, []);

  const createUser = useCallback((params: CreateUserParams) =>
    callFunction<CreateUserResult>({ action: "create-user", ...params }), [callFunction]);

  const resetPin = useCallback((userId: string) =>
    callFunction<ResetPinResult>({ action: "reset-pin", user_id: userId }), [callFunction]);

  const toggleBlock = useCallback((userId: string) =>
    callFunction<ToggleBlockResult>({ action: "toggle-block", user_id: userId }), [callFunction]);

  const sendInfo = useCallback((userId: string) =>
    callFunction<{ ok: boolean }>({ action: "send-info", user_id: userId }), [callFunction]);

  const deleteUser = useCallback((userId: string) =>
    callFunction<{ ok: boolean }>({ action: "delete-user", user_id: userId }), [callFunction]);

  const updatePermissions = useCallback((userId: string, permissions: string[]) =>
    callFunction<{ ok: boolean }>({ action: "update-permissions", user_id: userId, permissions }), [callFunction]);

  const updateCourses = useCallback((userId: string, courseIds: string[]) =>
    callFunction<{ ok: boolean }>({ action: "update-courses", user_id: userId, course_ids: courseIds }), [callFunction]);

  const sendSetupLink = useCallback((userId: string) =>
    callFunction<{ ok: boolean }>({ action: "send-setup-link", user_id: userId }), [callFunction]);

  const verifySetupToken = useCallback((token: string) =>
    callFunction<VerifyTokenResult>({ action: "verify-setup-token", token }), [callFunction]);

  const completeSetup = useCallback((token: string, pin: string) =>
    callFunction<CompleteSetupResult>({ action: "complete-setup", token, pin }), [callFunction]);

  const changePin = useCallback((currentPin: string, newPin: string) =>
    callFunction<{ ok: boolean }>({ action: "change-pin", current_pin: currentPin, new_pin: newPin }), [callFunction]);

  const migrateAll = useCallback(() =>
    callFunction<MigrateAllResult>({ action: "migrate-all" }), [callFunction]);

  return useMemo(() => ({
    createUser,
    resetPin,
    toggleBlock,
    sendInfo,
    deleteUser,
    updatePermissions,
    updateCourses,
    sendSetupLink,
    verifySetupToken,
    completeSetup,
    changePin,
    migrateAll,
  }), [createUser, resetPin, toggleBlock, sendInfo, deleteUser, updatePermissions, updateCourses, sendSetupLink, verifySetupToken, completeSetup, changePin, migrateAll]);
}
