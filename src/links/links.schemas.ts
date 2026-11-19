import { z } from 'zod';

const targetUrl = z
  .url({ protocol: /^https?$/, error: 'Must be a valid http(s) URL' })
  .max(2048);

const expiresAt = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .refine((date) => date.getTime() > Date.now(), 'Must be in the future');

export const createLinkSchema = z.object({
  url: targetUrl,
  alias: z
    .string()
    .regex(
      /^[A-Za-z0-9_-]{3,32}$/,
      '3-32 characters: letters, numbers, "-" or "_"',
    )
    .optional(),
  expiresAt: expiresAt.optional(),
});
export type CreateLinkDto = z.infer<typeof createLinkSchema>;

export const updateLinkSchema = z
  .object({
    url: targetUrl.optional(),
    // null removes the expiry.
    expiresAt: expiresAt.nullable().optional(),
  })
  .refine(
    (body) => body.url !== undefined || body.expiresAt !== undefined,
    'Nothing to update',
  );
export type UpdateLinkDto = z.infer<typeof updateLinkSchema>;

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;

export const linkIdSchema = z.uuid();
