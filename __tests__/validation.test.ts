import {
  credentialsSchema,
  emailSchema,
  formatZodError,
  isoDateSchema,
  meetupProposalSchema,
  passwordSchema,
} from '@/src/lib/validation';

describe('validation', () => {
  it('accepts valid email', () => {
    expect(emailSchema.safeParse('a@b.co').success).toBe(true);
  });

  it('rejects invalid email', () => {
    const r = emailSchema.safeParse('not-an-email');
    expect(r.success).toBe(false);
    if (!r.success) expect(formatZodError(r.error).length).toBeGreaterThan(0);
  });

  it('enforces password length', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('longenough1').success).toBe(true);
  });

  it('validates credentials together', () => {
    const ok = credentialsSchema.safeParse({ email: 'u@x.com', password: 'password1' });
    expect(ok.success).toBe(true);
  });

  it('validates ISO date', () => {
    expect(isoDateSchema.safeParse('2026-03-29').success).toBe(true);
    expect(isoDateSchema.safeParse('99-99-99').success).toBe(false);
  });

  it('validates meet-up fields', () => {
    expect(meetupProposalSchema.safeParse({ when: 'Tue 3pm', where: 'Cafe' }).success).toBe(true);
    expect(meetupProposalSchema.safeParse({ when: 'ab', where: 'x' }).success).toBe(false);
  });
});
