import { ArrowLeft, ArrowRight, Check, SkipForward } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { CreateWorkspaceRequest } from '../../types/workspace.types';
import { StepIntegrations, StepInfo, StepInvites, StepModules, StepReview } from './wizard/WizardSteps';
import { WIZARD_STEPS, useWizardState } from './wizard/useWizardState';

interface CreateWorkspaceWizardProps {
  open: boolean;
  onClose: () => void;
  onCreate: (request: CreateWorkspaceRequest) => Promise<void>;
}

function Stepper({ index }: { index: number }) {
  return (
    <ol className="mb-5 flex flex-wrap gap-x-4 gap-y-1" aria-label="Wizard progress">
      {WIZARD_STEPS.map((step, i) => (
        <li
          key={step.id}
          aria-current={i === index ? 'step' : undefined}
          className={`flex items-center gap-1.5 text-xs ${
            i === index ? 'text-[#22C55E]' : i < index ? 'text-[#E6EDF3]' : 'text-[#7D8590]'
          }`}
        >
          <span
            className={`flex h-4 w-4 items-center justify-center border font-mono text-[10px] ${
              i === index ? 'border-[#22C55E]' : 'border-[#3B434B]'
            }`}
          >
            {i < index ? <Check className="h-2.5 w-2.5" strokeWidth={2} /> : i + 1}
          </span>
          {step.label}
          {step.optional && <span className="text-[#7D8590]">(optional)</span>}
        </li>
      ))}
    </ol>
  );
}

/** Five-step creation wizard (D-04): only name and at least one module are mandatory. */
export function CreateWorkspaceWizard({ open, onClose, onCreate }: CreateWorkspaceWizardProps) {
  const wizard = useWizardState(async (request) => {
    await onCreate(request);
    onClose();
  });
  const { step } = wizard;

  if (!open) return null;

  return (
    <Modal open title="Create Workspace" subtitle={`Step ${wizard.index + 1} of ${WIZARD_STEPS.length}`} size="lg" onClose={onClose}>
      <Stepper index={wizard.index} />

      <div className="min-h-56">
        {step.id === 'info' && <StepInfo values={wizard.values} errors={wizard.infoErrors} onChange={wizard.update} />}
        {step.id === 'modules' && (
          <StepModules selected={wizard.values.modules} error={wizard.moduleError} onToggle={wizard.toggleModule} />
        )}
        {step.id === 'integrations' && <StepIntegrations />}
        {step.id === 'invites' && (
          <StepInvites
            emails={wizard.values.emails}
            error={wizard.emailError}
            onAdd={wizard.addEmail}
            onRemove={wizard.removeEmail}
          />
        )}
        {step.id === 'review' && <StepReview values={wizard.values} />}
      </div>

      {wizard.submitError && (
        <p role="alert" className="mt-3 text-xs text-[#EF4444]">
          {wizard.submitError}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-[#30363D] pt-4">
        <Button type="button" variant="ghost" disabled={wizard.isFirst || wizard.submitting} onClick={wizard.back}>
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {step.optional && !wizard.isLast && (
            <Button type="button" variant="secondary" onClick={wizard.skip}>
              <SkipForward className="h-3.5 w-3.5" strokeWidth={1.5} />
              Skip
            </Button>
          )}
          {wizard.isLast ? (
            <Button type="button" variant="primary" disabled={wizard.submitting} onClick={wizard.create}>
              <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
              {wizard.submitting ? 'Creating...' : 'Create workspace'}
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={wizard.next}>
              Next
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
