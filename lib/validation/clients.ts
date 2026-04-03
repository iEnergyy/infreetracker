import { z } from "zod";

const externalIdRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const clientCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  externalId: z
    .string()
    .trim()
    .transform((s) => s.toLowerCase())
    .pipe(
      z
        .string()
        .regex(
          externalIdRegex,
          "Use lowercase letters, numbers, and hyphens only (e.g. acme-corp)",
        ),
    ),
  contact: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t === "" || t === undefined ? undefined : t;
    }),
  notes: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t === "" || t === undefined ? undefined : t;
    }),
});

export const clientUpdateSchema = z.object({
  clientId: z.uuid(),
  name: z.string().trim().min(1, "Name is required"),
  contact: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t === "" || t === undefined ? undefined : t;
    }),
  notes: z
    .string()
    .optional()
    .transform((v) => {
      const t = v?.trim();
      return t === "" || t === undefined ? undefined : t;
    }),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
