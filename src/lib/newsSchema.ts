import { z } from "zod";

export const newsSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().nullable().or(z.literal("")).transform((val) => (val === "" ? null : val)),
  visibility: z.string(),
  publish_at: z.string().nullable().or(z.literal("")).transform((val) => (val === "" || !val ? null : new Date(val).toISOString())),
  course_id: z.string().nullable().or(z.literal("")).transform((val) => (val === "" ? null : val)),
});

export type NewsFormValues = z.infer<typeof newsSchema>;
