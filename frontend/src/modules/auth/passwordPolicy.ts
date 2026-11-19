export interface PasswordRuleStatus {
  key: string;
  label: string;
  passed: boolean;
}

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,49}$/i;

export function evaluatePasswordRules(password: string): PasswordRuleStatus[] {
  return [
    {
      key: 'minLength',
      label: 'At least 8 characters',
      passed: password.length >= 8,
    },
    {
      key: 'uppercase',
      label: 'At least 1 uppercase letter (A-Z)',
      passed: /[A-Z]/.test(password),
    },
    {
      key: 'lowercase',
      label: 'At least 1 lowercase letter (a-z)',
      passed: /[a-z]/.test(password),
    },
    {
      key: 'digit',
      label: 'At least 1 digit (0-9)',
      passed: /[0-9]/.test(password),
    },
    {
      key: 'special',
      label: 'At least 1 special character (!@#$...)',
      passed: /[^A-Za-z0-9\s]/.test(password),
    },
  ];
}

export function validateStrongPassword(password: string): string | null {
  const failed = evaluatePasswordRules(password).find((rule) => !rule.passed);
  return failed ? `Password requirement not met: ${failed.label}.` : null;
}

export function validateUsernameFormat(username: string): string | null {
  const trimmed = username.trim();
  if (!USERNAME_RE.test(trimmed)) {
    return "Username must be 3-50 chars using letters, digits, '.', '_' or '-'.";
  }
  return null;
}
