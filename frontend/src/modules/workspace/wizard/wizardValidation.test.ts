import { describe, expect, it } from 'vitest';
import {
  EMPTY_WIZARD_VALUES,
  MAX_INVITES,
  addEmail,
  buildCreateRequest,
  isHttpUrl,
  isValidEmail,
  validateInfo,
  validateModules,
  type WizardValues,
} from './wizardValidation';

const values = (patch: Partial<WizardValues> = {}): WizardValues => ({ ...EMPTY_WIZARD_VALUES, ...patch });

describe('validateInfo', () => {
  it('requires a non-blank name', () => {
    expect(validateInfo(values()).name).toBe('Workspace name is required.');
    expect(validateInfo(values({ name: '   ' })).name).toBeDefined();
    expect(validateInfo(values({ name: 'Acme' }))).toEqual({});
  });

  it('enforces the 100 character name limit at the boundary', () => {
    expect(validateInfo(values({ name: 'a'.repeat(100) })).name).toBeUndefined();
    expect(validateInfo(values({ name: 'a'.repeat(101) })).name).toBeDefined();
  });

  it('enforces the 500 character description limit at the boundary', () => {
    expect(validateInfo(values({ name: 'A', description: 'd'.repeat(500) })).description).toBeUndefined();
    expect(validateInfo(values({ name: 'A', description: 'd'.repeat(501) })).description).toBeDefined();
  });

  it('accepts only http and https avatar URLs', () => {
    const avatar = (avatarUrl: string) => validateInfo(values({ name: 'A', avatarUrl })).avatarUrl;
    expect(avatar('')).toBeUndefined();
    expect(avatar('https://example.com/a.png')).toBeUndefined();
    for (const bad of ['javascript:alert(1)', 'data:image/png;base64,AA', 'ftp://x.dev/a', 'not a url', '/relative.png']) {
      expect(avatar(bad), bad).toBeDefined();
    }
    expect(avatar(`https://example.com/${'a'.repeat(500)}`)).toBeDefined();
  });
});

describe('validateModules (BR-03)', () => {
  it('requires at least one module', () => {
    expect(validateModules(values())).toBe('Select at least one module.');
    expect(validateModules(values({ modules: ['git'] }))).toBeNull();
  });
});

describe('addEmail', () => {
  it('normalizes and appends a valid address', () => {
    const result = addEmail([], '  Alice@Example.COM ');
    expect(result).toEqual({ ok: true, emails: ['alice@example.com'] });
  });

  it('rejects malformed and duplicate addresses', () => {
    for (const bad of ['', 'plain', 'a@b', '@x.com', 'a b@x.com']) {
      expect(addEmail([], bad).ok, bad).toBe(false);
    }
    expect(addEmail(['a@x.com'], 'A@x.com')).toEqual({ ok: false, error: 'This email is already in the list.' });
  });

  it('caps the list at the invitation limit', () => {
    const full = Array.from({ length: MAX_INVITES }, (_, i) => `u${i}@x.com`);
    const result = addEmail(full, 'extra@x.com');
    expect(result.ok).toBe(false);
    expect(addEmail(full.slice(1), 'extra@x.com').ok).toBe(true);
  });

  it('exposes the same checks as standalone helpers', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail(`${'a'.repeat(250)}@b.co`)).toBe(true);
    expect(isValidEmail(`${'a'.repeat(251)}@b.co`)).toBe(false);
    expect(isHttpUrl('http://localhost:5173')).toBe(true);
  });
});

describe('buildCreateRequest', () => {
  it('omits empty optional fields', () => {
    const request = buildCreateRequest(values({ name: ' Acme ', modules: ['git', 'chat'] }));
    expect(request).toEqual({ name: 'Acme', moduleKeys: ['git', 'chat'] });
  });

  it('includes trimmed optional fields and invitations when present', () => {
    const request = buildCreateRequest(
      values({ name: 'Acme', description: ' Core ', avatarUrl: ' https://x.dev/a.png ', modules: ['docs'], emails: ['a@x.com'] })
    );
    expect(request).toEqual({
      name: 'Acme', description: 'Core', avatarUrl: 'https://x.dev/a.png', moduleKeys: ['docs'], inviteEmails: ['a@x.com'],
    });
  });
});
