import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWizardState } from './useWizardState';

function setup(onCreate = vi.fn().mockResolvedValue(undefined)) {
  return { onCreate, hook: renderHook(() => useWizardState(onCreate)) };
}

function advanceToIntegrations(hook: ReturnType<typeof setup>['hook']) {
  act(() => hook.result.current.update({ name: 'Acme' }));
  act(() => hook.result.current.next());
  act(() => hook.result.current.toggleModule('git'));
  act(() => hook.result.current.next());
}

describe('useWizardState', () => {
  it('blocks the first step until a name is entered', () => {
    const { hook } = setup();
    act(() => hook.result.current.next());
    expect(hook.result.current.step.id).toBe('info');
    expect(hook.result.current.infoErrors.name).toBeDefined();

    act(() => hook.result.current.update({ name: 'Acme' }));
    act(() => hook.result.current.next());
    expect(hook.result.current.step.id).toBe('modules');
  });

  it('cannot leave the modules step without a module (BR-03)', () => {
    const { hook } = setup();
    act(() => hook.result.current.update({ name: 'Acme' }));
    act(() => hook.result.current.next());

    act(() => hook.result.current.next());
    expect(hook.result.current.step.id).toBe('modules');
    expect(hook.result.current.moduleError).toBe('Select at least one module.');

    act(() => hook.result.current.toggleModule('docs'));
    act(() => hook.result.current.next());
    expect(hook.result.current.step.id).toBe('integrations');
  });

  it('keeps selected modules in catalog order and toggles them off again', () => {
    const { hook } = setup();
    act(() => hook.result.current.toggleModule('chat'));
    act(() => hook.result.current.toggleModule('git'));
    expect(hook.result.current.values.modules).toEqual(['git', 'chat']);
    act(() => hook.result.current.toggleModule('git'));
    expect(hook.result.current.values.modules).toEqual(['chat']);
  });

  it('lets both optional steps be skipped and still creates the workspace', async () => {
    const { hook, onCreate } = setup();
    advanceToIntegrations(hook);
    expect(hook.result.current.step.optional).toBe(true);

    act(() => hook.result.current.skip());
    expect(hook.result.current.step.id).toBe('invites');
    act(() => hook.result.current.skip());
    expect(hook.result.current.step.id).toBe('review');
    expect(hook.result.current.isLast).toBe(true);

    await act(async () => hook.result.current.create());
    expect(onCreate).toHaveBeenCalledWith({ name: 'Acme', moduleKeys: ['git'] });
  });

  it('drops half-collected invitations when the invite step is skipped', () => {
    const { hook } = setup();
    advanceToIntegrations(hook);
    act(() => hook.result.current.skip());
    act(() => {
      hook.result.current.addEmail('a@x.com');
    });
    expect(hook.result.current.values.emails).toEqual(['a@x.com']);

    act(() => hook.result.current.skip());
    expect(hook.result.current.values.emails).toEqual([]);
  });

  it('sends collected emails and reports invalid ones without adding them', () => {
    const { hook } = setup();
    let added = true;
    act(() => {
      added = hook.result.current.addEmail('nope');
    });
    expect(added).toBe(false);
    expect(hook.result.current.emailError).toBe('Enter a valid email address.');
    act(() => {
      hook.result.current.addEmail('b@x.com');
    });
    expect(hook.result.current.emailError).toBeNull();
    act(() => hook.result.current.removeEmail('b@x.com'));
    expect(hook.result.current.values.emails).toEqual([]);
  });

  it('stays on the review step and shows the server error when creation fails', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Workspace name is taken.'));
    const { hook } = setup(onCreate);
    advanceToIntegrations(hook);
    act(() => hook.result.current.skip());
    act(() => hook.result.current.skip());

    await act(async () => hook.result.current.create());

    expect(hook.result.current.step.id).toBe('review');
    expect(hook.result.current.submitError).toBe('Workspace name is taken.');
    expect(hook.result.current.submitting).toBe(false);
  });

  it('goes back without losing entered data and never underflows', () => {
    const { hook } = setup();
    act(() => hook.result.current.update({ name: 'Acme' }));
    act(() => hook.result.current.next());
    act(() => hook.result.current.back());
    act(() => hook.result.current.back());
    expect(hook.result.current.step.id).toBe('info');
    expect(hook.result.current.values.name).toBe('Acme');
  });
});
