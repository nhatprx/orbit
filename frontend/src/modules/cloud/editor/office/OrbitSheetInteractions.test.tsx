import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OrbitSheetEditor } from './OrbitSheetEditor';
import type { OfficeSheetContentDto } from './officeTypes';

function SheetHarness({ initialRows, cellStyles = {} }: { initialRows: string[][]; cellStyles?: Record<string, Record<string, unknown>> }) {
  const [doc, setDoc] = useState<OfficeSheetContentDto>({
    sheets: [{ name: 'Sheet1', rows: initialRows, cellStyles }],
  });
  return <OrbitSheetEditor value={doc} onChange={setDoc} />;
}

describe('OrbitSheetEditor UX interactions', () => {
  it('supports arrow navigation from cell & grid container, quick-typing arrow commit, Shift+Arrow range, and F2/double-click caret editing', () => {
    const { container } = render(
      <SheetHarness initialRows={[['10', '20'], ['30', '40']]} cellStyles={{ '1:1': { wrap: true } }} />
    );
    const byLabel = <T extends HTMLElement = HTMLElement>(label: string) =>
      container.querySelector(`[aria-label="${label}"]`) as T;

    const cellA1 = byLabel<HTMLInputElement>('Cell A1');
    const cellA2 = byLabel<HTMLInputElement>('Cell A2');
    const cellB1 = byLabel<HTMLInputElement>('Cell B1');
    const cellB2 = byLabel<HTMLTextAreaElement>('Cell B2');
    const scrollSpy = vi.fn();
    cellA2.scrollIntoView = scrollSpy;

    // 1. Arrow navigation from selected cell focuses & scrolls target cell
    fireEvent.click(cellA1);
    fireEvent.keyDown(cellA1, { key: 'ArrowDown' });
    expect(byLabel('Active cell address').textContent).toBe('A2');
    expect(document.activeElement).toBe(cellA2);
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });

    fireEvent.keyDown(cellA2, { key: 'ArrowRight' });
    expect(byLabel('Active cell address').textContent).toBe('B2');
    fireEvent.keyDown(cellB2, { key: 'ArrowUp' });
    expect(byLabel('Active cell address').textContent).toBe('B1');
    fireEvent.keyDown(cellB1, { key: 'ArrowLeft' });
    expect(byLabel('Active cell address').textContent).toBe('A1');

    // 2. Grid container arrow navigation works even when focus is on grid container
    const grid = byLabel<HTMLDivElement>('Spreadsheet grid');
    grid.focus();
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    expect(byLabel('Active cell address').textContent).toBe('B1');
    expect(document.activeElement).toBe(cellB1);

    // 3. Typing mode: quick-typing a value + ArrowDown commits & moves down
    fireEvent.click(cellA1);
    fireEvent.keyDown(cellA1, { key: '1' });
    fireEvent.change(cellA1, { target: { value: '123' } });
    fireEvent.keyDown(cellA1, { key: 'ArrowDown' });
    expect(cellA1.value).toBe('123');
    expect(byLabel('Active cell address').textContent).toBe('A2');

    // 4. Shift+Arrow extends selection range
    fireEvent.click(cellA1);
    fireEvent.keyDown(cellA1, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(cellA1, { key: 'ArrowDown', shiftKey: true });
    expect(byLabel('Active cell address').textContent).toBe('A1:B2');

    // 5. F2 / double-click caret mode: ArrowLeft/Right stay in cell, Escape restores original value
    fireEvent.click(cellA1);
    fireEvent.keyDown(cellA1, { key: 'F2' });
    fireEvent.keyDown(cellA1, { key: 'ArrowLeft' });
    expect(byLabel('Active cell address').textContent).toBe('A1');
    fireEvent.change(cellA1, { target: { value: '999' } });
    fireEvent.keyDown(cellA1, { key: 'Escape' });
    expect(cellA1.value).toBe('123');

    // Double-click single-line cell -> ArrowRight stays in cell, ArrowDown commits & moves down
    fireEvent.doubleClick(cellB1);
    fireEvent.keyDown(cellB1, { key: 'ArrowRight' });
    expect(byLabel('Active cell address').textContent).toBe('B1');
    fireEvent.keyDown(cellB1, { key: 'ArrowDown' });
    expect(byLabel('Active cell address').textContent).toBe('B2');

    // Double-click wrapped textarea -> ArrowDown stays inside textarea
    fireEvent.doubleClick(cellB2);
    fireEvent.keyDown(cellB2, { key: 'ArrowDown' });
    expect(byLabel('Active cell address').textContent).toBe('B2');
  }, 15000);

  it('shows formula suggestion dropdown on = and =su with keyboard nav, Tab/Enter/click accept, and Escape dismiss', () => {
    const { container } = render(<SheetHarness initialRows={[['10'], ['20'], ['']]} />);
    const byLabel = <T extends HTMLElement = HTMLElement>(label: string) =>
      container.querySelector(`[aria-label="${label}"]`) as T;

    const cellA3 = byLabel<HTMLInputElement>('Cell A3');
    fireEvent.click(cellA3);
    fireEvent.change(cellA3, { target: { value: '=' } });

    const listbox = screen.getByRole('listbox', { name: 'Formula suggestions' });
    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(6);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');

    // ArrowDown cycles to AVERAGE, ArrowUp returns to SUM
    fireEvent.keyDown(cellA3, { key: 'ArrowDown' });
    expect(within(listbox).getAllByRole('option')[1]?.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(cellA3, { key: 'ArrowUp' });
    expect(within(listbox).getAllByRole('option')[0]?.getAttribute('aria-selected')).toBe('true');

    // Escape closes popup without exiting edit mode
    fireEvent.keyDown(cellA3, { key: 'Escape' });
    expect(screen.queryByRole('listbox', { name: 'Formula suggestions' })).toBeNull();
    expect(cellA3.value).toBe('=');

    // Filter with =su and accept with Tab -> =SUM(
    fireEvent.change(cellA3, { target: { value: '=su' } });
    const filtered = screen.getByRole('listbox', { name: 'Formula suggestions' });
    expect(within(filtered).getAllByRole('option')).toHaveLength(1);
    fireEvent.keyDown(cellA3, { key: 'Tab' });
    expect(cellA3.value).toBe('=SUM(');
    expect(screen.queryByRole('listbox', { name: 'Formula suggestions' })).toBeNull();

    // Mouse click (mouseDown) acceptance in Formula Bar
    const formulaBar = byLabel<HTMLInputElement>('Formula bar');
    fireEvent.focus(formulaBar);
    fireEvent.change(formulaBar, { target: { value: '=av' } });
    const barBox = screen.getByRole('listbox', { name: 'Formula suggestions' });
    fireEvent.mouseDown(within(barBox).getByText('AVERAGE'));
    expect(formulaBar.value).toBe('=AVERAGE(');
    expect(screen.queryByRole('listbox', { name: 'Formula suggestions' })).toBeNull();
  }, 15000);

  it('supports formula click-and-drag range selection from both cell and Formula Bar with auto-closed parens and 1-step undo', () => {
    const { container } = render(<SheetHarness initialRows={[['10', ''], ['20', ''], ['30', '']]} />);
    const byLabel = <T extends HTMLElement = HTMLElement>(label: string) =>
      container.querySelector(`[aria-label="${label}"]`) as T;

    const cellA1 = byLabel<HTMLInputElement>('Cell A1');
    const cellA2 = byLabel<HTMLInputElement>('Cell A2');
    const cellA3 = byLabel<HTMLInputElement>('Cell A3');
    const cellB1 = byLabel<HTMLInputElement>('Cell B1');
    const cellB2 = byLabel<HTMLInputElement>('Cell B2');
    const formulaBar = byLabel<HTMLInputElement>('Formula bar');

    // 1. Bare '=' + drag A1 -> A3 produces =A1:A3
    fireEvent.click(cellB1);
    fireEvent.change(cellB1, { target: { value: '=' } });
    fireEvent.mouseDown(cellA1);
    fireEvent.mouseEnter(cellA2);
    fireEvent.mouseEnter(cellA3);
    fireEvent.mouseUp(window);
    expect(formulaBar.value).toBe('=A1:A3');
    expect(cellA1.parentElement?.className).toContain('outline-dashed');
    expect(cellA2.parentElement?.className).toContain('outline-dashed');
    expect(cellA3.parentElement?.className).toContain('outline-dashed');

    // 2. '=SUM(' + drag A1 -> A3 + Enter auto-closes to '=SUM(A1:A3)' and evaluates to 60
    fireEvent.change(cellB1, { target: { value: '=SUM(' } });
    fireEvent.mouseDown(cellA1);
    fireEvent.mouseEnter(cellA2);
    fireEvent.mouseEnter(cellA3);
    fireEvent.mouseUp(window);
    expect(cellB1.value).toBe('=SUM(A1:A3');
    fireEvent.keyDown(cellB1, { key: 'Enter' });
    expect(cellB1.value).toBe('60');
    expect(byLabel('Active cell address').textContent).toBe('B2');

    // Undo reverts the whole drag in 1 step back to '=SUM('
    fireEvent.click(byLabel('Undo'));
    fireEvent.click(cellB1);
    expect(formulaBar.value).toBe('=SUM(');

    // 3. Formula Bar '=SUM(' + drag A1 -> A3 + Enter works identically
    fireEvent.click(cellB2);
    fireEvent.focus(formulaBar);
    fireEvent.change(formulaBar, { target: { value: '=SUM(' } });
    fireEvent.mouseDown(cellA1);
    fireEvent.mouseEnter(cellA2);
    fireEvent.mouseEnter(cellA3);
    fireEvent.mouseUp(window);
    expect(formulaBar.value).toBe('=SUM(A1:A3');
    fireEvent.keyDown(formulaBar, { key: 'Enter' });
    expect(cellB2.value).toBe('60');
  }, 15000);
});
