import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWizardState } from './useWizardState';

function setup(onCreate = vi.fn().mockResolvedValue(undefined)) {
  return { onCreate, hook: renderHook(() => useWizardState(onCreate)) };
}

function advanceToInvites(hook: ReturnType<typeof setup>['hook']) {
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

  it('allows skipping the modules step with zero modules selected', () => {
    const { hook } = setup();
    act(() => hook.result.current.update({ name: 'Acme' }));
    act(() => hook.result.current.next());
    expect(hook.result.current.step.optional).toBe(true);

    act(() => hook.result.current.skip());
    expect(hook.result.current.step.id).toBe('invites');
    expect(hook.result.current.values.modules).toEqual([]);
  });

  it('keeps selected modules in catalog order and toggles them off again', () => {
    const { hook } = setup();
    act(() => hook.result.current.toggleModule('chat'));
    act(() => hook.result.current.toggleModule('git'));
    expect(hook.result.current.values.modules).toEqual(['git', 'chat']);
    act(() => hook.result.current.toggleModule('git'));
    expect(hook.result.current.values.modules).toEqual(['chat']);
  });

  it('lets optional steps be skipped and places integrations as the final step', async () => {
    const { hook, onCreate } = setup();
    advanceToInvites(hook);
    expect(hook.result.current.step.id).toBe('invites');
    expect(hook.result.current.step.optional).toBe(true);

    act(() => hook.result.current.skip());
    expect(hook.result.current.step.id).toBe('review');
    act(() => hook.result.current.next());
    expect(hook.result.current.step.id).toBe('integrations');
    expect(hook.result.current.isLast).toBe(true);

    await act(async () => hook.result.current.create());
    expect(onCreate).toHaveBeenCalledWith({ name: 'Acme', moduleKeys: ['git'] });
  });

  it('drops half-collected invitations when the invite step is skipped', () => {
    const { hook } = setup();
    advanceToInvites(hook);
    act(() => {
      hook.result.current.addEmail('a@x.com');
    });
    expect(hook.result.current.values.emails).toEqual(['a@x.com']);

    act(() => hook.result.current.skip());
    expect(hook.result.current.values.emails).toEqual([]);
  });

  it('accepts emails and usernames and rejects malformed values', () => {
    const { hook } = setup();
    let added = true;
    act(() => {
      added = hook.result.current.addEmail('a b@x.com');
    });
    expect(added).toBe(false);
    expect(hook.result.current.emailError).toBe('Enter a valid email address or username.');
    act(() => {
      hook.result.current.addEmail('@duynn');
    });
    expect(hook.result.current.emailError).toBeNull();
    expect(hook.result.current.values.emails).toEqual(['duynn']);
    act(() => hook.result.current.removeEmail('duynn'));
    expect(hook.result.current.values.emails).toEqual([]);
  });

  it('stays on the last step and shows the server error when creation fails', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Workspace name is taken.'));
    const { hook } = setup(onCreate);
    advanceToInvites(hook);
    act(() => hook.result.current.skip());
    act(() => hook.result.current.next());

    await act(async () => hook.result.current.create());

    expect(hook.result.current.step.id).toBe('integrations');
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
