import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockFrom = vi.fn();
vi.mock("@/lib/db", () => ({
  db: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import {
  useEvaluationTypes,
  useCreateEvaluationType,
  useUpdateEvaluationType,
  useDeleteEvaluationType,
} from "./useEvaluationTypes";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

const fakeTypes = [
  { id: "1", name: "test", label: "Prueba", created_at: "2024-01-01" },
  { id: "2", name: "exam", label: "Examen", created_at: "2024-01-01" },
];

describe("useEvaluationTypes", () => {
  it("fetches evaluation types ordered by label", async () => {
    const order = vi.fn().mockResolvedValue({ data: fakeTypes, error: null });
    mockFrom.mockReturnValue({ select: () => ({ order }) });

    const { result } = renderHook(() => useEvaluationTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFrom).toHaveBeenCalledWith("evaluation_types");
    expect(result.current.data).toEqual(fakeTypes);
  });

  it("handles empty data", async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue({ select: () => ({ order }) });

    const { result } = renderHook(() => useEvaluationTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useCreateEvaluationType", () => {
  it("inserts and returns new type", async () => {
    const single = vi.fn().mockResolvedValue({ data: fakeTypes[0], error: null });
    const select = vi.fn().mockReturnValue({ single });
    mockFrom.mockReturnValue({ insert: () => ({ select }) });

    const { result } = renderHook(() => useCreateEvaluationType(), { wrapper: createWrapper() });

    const res = await result.current.mutateAsync({ name: "test", label: "Prueba" });
    expect(res).toEqual(fakeTypes[0]);
    expect(mockFrom).toHaveBeenCalledWith("evaluation_types");
  });
});

describe("useUpdateEvaluationType", () => {
  it("updates and returns type", async () => {
    const single = vi.fn().mockResolvedValue({ data: fakeTypes[0], error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    mockFrom.mockReturnValue({ update: () => ({ eq }) });

    const { result } = renderHook(() => useUpdateEvaluationType(), { wrapper: createWrapper() });

    const res = await result.current.mutateAsync({ id: "1", label: "Actualizado" });
    expect(res).toEqual(fakeTypes[0]);
    expect(mockFrom).toHaveBeenCalledWith("evaluation_types");
  });
});

describe("useDeleteEvaluationType", () => {
  it("deletes type by id", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ delete: () => ({ eq }) });

    const { result } = renderHook(() => useDeleteEvaluationType(), { wrapper: createWrapper() });

    await result.current.mutateAsync("1");
    expect(mockFrom).toHaveBeenCalledWith("evaluation_types");
  });
});
