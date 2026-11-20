import type { CreateWorkspaceRequest, ModuleKey } from '../../../types/workspace.types';

export interface WizardValues {
  name: string;
  description: string;
  avatarUrl: string;
  modules: ModuleKey[];
  emails: string[];
}

export const MAX_INVITES = 50;
export const EMPTY_WIZARD_VALUES: WizardValues = {
  name: '',
  description: '',
  avatarUrl: '',
  modules: [],
  emails: [],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 255 && EMAIL_PATTERN.test(value);
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface InfoErrors {
  name?: string;
  description?: string;
  avatarUrl?: string;
}

export function validateInfo(values: WizardValues): InfoErrors {
  const errors: InfoErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Workspace name is required.';
  else if (name.length > 100) errors.name = 'Workspace name must be at most 100 characters.';
  if (values.description.length > 500) errors.description = 'Description must be at most 500 characters.';
  const avatar = values.avatarUrl.trim();
  if (avatar && (!isHttpUrl(avatar) || avatar.length > 500)) {
    errors.avatarUrl = 'Avatar must be an http or https URL.';
  }
  return errors;
}

/** BR-03: at least one module is mandatory. */
export function validateModules(values: WizardValues): string | null {
  return values.modules.length === 0 ? 'Select at least one module.' : null;
}

export type AddEmailResult = { ok: true; emails: string[] } | { ok: false; error: string };

export function addEmail(current: string[], raw: string): AddEmailResult {
  const email = raw.trim().toLowerCase();
  if (!isValidEmail(email)) return { ok: false, error: 'Enter a valid email address.' };
  if (current.includes(email)) return { ok: false, error: 'This email is already in the list.' };
  if (current.length >= MAX_INVITES) {
    return { ok: false, error: `You can invite at most ${MAX_INVITES} people here.` };
  }
  return { ok: true, emails: [...current, email] };
}

export function buildCreateRequest(values: WizardValues): CreateWorkspaceRequest {
  const description = values.description.trim();
  const avatarUrl = values.avatarUrl.trim();
  return {
    name: values.name.trim(),
    ...(description ? { description } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    moduleKeys: values.modules,
    ...(values.emails.length > 0 ? { inviteEmails: values.emails } : {}),
  };
}
