import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Email is required').email('Enter a valid email');

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(128, 'Password is too long');

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Invalid date');

export const timeHmSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24h)');

export const careNoteBodySchema = z
  .string()
  .trim()
  .min(1, 'Note cannot be empty')
  .max(2000, 'Note is too long');

export const connectionIntroSchema = z
  .string()
  .trim()
  .min(1, 'Add a short intro')
  .max(500, 'Intro is too long');

export const meetupProposalSchema = z.object({
  when: z.string().trim().min(3, 'Add when you want to meet'),
  where: z.string().trim().min(2, 'Add a location or link'),
});

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join('\n');
}
