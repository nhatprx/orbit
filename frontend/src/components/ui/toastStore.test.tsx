import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastViewport } from './ToastViewport';
import { clearToasts, toast } from './toastStore';

afterEach(() => {
  cleanup();
  clearToasts();
  vi.useRealTimers();
});

describe('ToastViewport & toastStore', () => {
  it('renders success and error toasts, deduplicates repeats, and dismisses manually', () => {
    render(<ToastViewport />);

    act(() => {
      toast.success('Saved successfully.');
      toast.success('Saved successfully.');
      toast.error('Network request failed.');
    });

    expect(screen.getAllByText('Saved successfully.')).toHaveLength(1);
    expect(screen.getByRole('alert').textContent).toContain('Network request failed.');

    const dismissBtns = screen.getAllByLabelText('Dismiss notification');
    fireEvent.click(dismissBtns[0]!);
    expect(screen.queryByText('Saved successfully.')).toBeNull();
  });

  it('auto-dismisses toasts after their timeout elapses', () => {
    vi.useFakeTimers();
    render(<ToastViewport />);

    act(() => {
      toast.info('Synced workspace.', 2000);
    });
    expect(screen.getByText('Synced workspace.')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.queryByText('Synced workspace.')).toBeNull();
  });
});
