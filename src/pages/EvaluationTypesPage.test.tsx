import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockConfirm = vi.fn();
vi.mock("@/hooks/useConfirm", () => ({
  useConfirm: () => ({ confirm: mockConfirm, dialog: <div /> }),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const mockEvaluationTypes = vi.fn();
const mockCreate = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));
const mockUpdate = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));
const mockDelete = vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false }));

vi.mock("@/hooks/useEvaluationTypes", () => ({
  useEvaluationTypes: () => mockEvaluationTypes(),
  useCreateEvaluationType: () => mockCreate(),
  useUpdateEvaluationType: () => mockUpdate(),
  useDeleteEvaluationType: () => mockDelete(),
}));

import EvaluationTypesPage from "./EvaluationTypesPage";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

const fakeTypes = [
  { id: "1", name: "test", label: "Prueba", created_at: "2024-01-01" },
  { id: "2", name: "exam", label: "Examen", created_at: "2024-01-01" },
];

describe("EvaluationTypesPage", () => {
  it("shows loading state", () => {
    mockEvaluationTypes.mockReturnValue({ data: undefined, isLoading: true });

    render(<EvaluationTypesPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Cargando tipos de evaluación...")).toBeTruthy();
  });

  it("shows empty state when no types", () => {
    mockEvaluationTypes.mockReturnValue({ data: [], isLoading: false });

    render(<EvaluationTypesPage />, { wrapper: createWrapper() });

    expect(screen.getByText("No hay tipos de evaluación. Crea el primero.")).toBeTruthy();
  });

  it("renders list of evaluation types", () => {
    mockEvaluationTypes.mockReturnValue({ data: fakeTypes, isLoading: false });

    render(<EvaluationTypesPage />, { wrapper: createWrapper() });

    expect(screen.getByText("Prueba")).toBeTruthy();
    expect(screen.getByText("Examen")).toBeTruthy();
    expect(screen.getByText("test")).toBeTruthy();
    expect(screen.getByText("exam")).toBeTruthy();
  });

  it("shows form when clicking + Nuevo Tipo", async () => {
    mockEvaluationTypes.mockReturnValue({ data: fakeTypes, isLoading: false });

    render(<EvaluationTypesPage />, { wrapper: createWrapper() });

    const btn = screen.getByText("+ Nuevo Tipo");
    await userEvent.click(btn);

    expect(screen.getByText("Crear Tipo")).toBeTruthy();
    expect(screen.getByPlaceholderText("ej. test, exam, homework")).toBeTruthy();
    expect(screen.getByPlaceholderText("ej. Prueba, Examen, Trabajo")).toBeTruthy();
  });
});
