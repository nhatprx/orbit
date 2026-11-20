import { useState } from 'react';
import { useAsyncAction } from '../../../hooks/useAsyncAction';
import type { CreateWorkspaceRequest, ModuleKey } from '../../../types/workspace.types';
import { MODULE_ORDER } from '../moduleMeta';
import {
  EMPTY_WIZARD_VALUES,
  addEmail,
  buildCreateRequest,
  validateInfo,
  validateModules,
  type InfoErrors,
  type WizardValues,
} from './wizardValidation';

export type WizardStep = 'info' | 'modules' | 'integrations' | 'invites' | 'review';

export const WIZARD_STEPS: { id: WizardStep; label: string; optional: boolean }[] = [
  { id: 'info', label: 'Information', optional: false },
  { id: 'modules', label: 'Modules', optional: false },
  { id: 'integrations', label: 'Integrations', optional: true },
  { id: 'invites', label: 'Teammates', optional: true },
  { id: 'review', label: 'Initialize', optional: false },
];

/** Nothing is persisted until the final submit, so abandoning the wizard leaves no partial Workspace. */
export function useWizardState(onCreate: (request: CreateWorkspaceRequest) => Promise<void>) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<WizardValues>(EMPTY_WIZARD_VALUES);
  const [touched, setTouched] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const submit = useAsyncAction(async () => onCreate(buildCreateRequest(values)));

  const step = WIZARD_STEPS[index] ?? WIZARD_STEPS[0]!;
  const infoErrors: InfoErrors = touched && step.id === 'info' ? validateInfo(values) : {};
  const moduleError = touched && step.id === 'modules' ? validateModules(values) : null;

  function currentStepValid(): boolean {
    if (step.id === 'info') return Object.keys(validateInfo(values)).length === 0;
    if (step.id === 'modules') return validateModules(values) === null;
    return true;
  }

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(next, WIZARD_STEPS.length - 1)));
    setTouched(false);
  }

  return {
    step,
    index,
    values,
    infoErrors,
    moduleError,
    emailError,
    submitting: submit.pending,
    submitError: submit.error,
    isFirst: index === 0,
    isLast: index === WIZARD_STEPS.length - 1,
    update: (patch: Partial<WizardValues>) => setValues((v) => ({ ...v, ...patch })),
    toggleModule: (key: ModuleKey) =>
      setValues((v) => ({
        ...v,
        modules: MODULE_ORDER.filter((m) => (m === key ? !v.modules.includes(m) : v.modules.includes(m))),
      })),
    addEmail: (raw: string): boolean => {
      const result = addEmail(values.emails, raw);
      setEmailError(result.ok ? null : result.error);
      if (result.ok) setValues((v) => ({ ...v, emails: result.emails }));
      return result.ok;
    },
    removeEmail: (email: string) =>
      setValues((v) => ({ ...v, emails: v.emails.filter((e) => e !== email) })),
    next: () => {
      setTouched(true);
      if (currentStepValid()) goTo(index + 1);
    },
    /** Skipping the optional invite step also discards any half-typed list. */
    skip: () => {
      if (step.id === 'invites') setValues((v) => ({ ...v, emails: [] }));
      goTo(index + 1);
    },
    back: () => goTo(index - 1),
    create: () => void submit.run(),
  };
}
