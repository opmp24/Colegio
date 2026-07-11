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
  const callFunction = async <T>(body: Record<string, unknown>): Promise<T> => {
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
  };

  const createUser = (params: CreateUserParams) =>
    callFunction<CreateUserResult>({ action: "create-user", ...params });

  const resetPin = (userId: string) =>
    callFunction<ResetPinResult>({ action: "reset-pin", user_id: userId });

  const toggleBlock = (userId: string) =>
    callFunction<ToggleBlockResult>({ action: "toggle-block", user_id: userId });

  const sendInfo = (userId: string) =>
    callFunction<{ ok: boolean }>({ action: "send-info", user_id: userId });

  const deleteUser = (userId: string) =>
    callFunction<{ ok: boolean }>({ action: "delete-user", user_id: userId });

  const updatePermissions = (userId: string, permissions: string[]) =>
    callFunction<{ ok: boolean }>({ action: "update-permissions", user_id: userId, permissions });

  const updateCourses = (userId: string, courseIds: string[]) =>
    callFunction<{ ok: boolean }>({ action: "update-courses", user_id: userId, course_ids: courseIds });

  const sendSetupLink = (userId: string) =>
    callFunction<{ ok: boolean }>({ action: "send-setup-link", user_id: userId });

  const verifySetupToken = (token: string) =>
    callFunction<VerifyTokenResult>({ action: "verify-setup-token", token });

  const completeSetup = (token: string, pin: string) =>
    callFunction<CompleteSetupResult>({ action: "complete-setup", token, pin });

  const changePin = (currentPin: string, newPin: string) =>
    callFunction<{ ok: boolean }>({ action: "change-pin", current_pin: currentPin, new_pin: newPin });

  const migrateAll = () =>
    callFunction<MigrateAllResult>({ action: "migrate-all" });

  return {
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
  };
}
