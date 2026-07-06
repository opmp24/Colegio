import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(1, "Título es requerido"),
  course_id: z.string().min(1, "Curso es requerido"),
  subject_id: z.string().nullable().or(z.literal("")).transform((val) => (val === "" ? null : val)),
  type: z.string().min(1, "Tipo de evaluación es requerido"),
  description: z.string().nullable().or(z.literal("")).transform((val) => (val === "" ? null : val)),
  due_date: z.string().min(1, "Fecha y hora requeridas"),
});

export type EventFormValues = z.infer<typeof eventSchema>;