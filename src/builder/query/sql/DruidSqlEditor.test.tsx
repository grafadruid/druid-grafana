import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Stand-in for @grafana/plugin-ui's SQLEditor: renders the received `query` into a
// textarea and exposes onChange(value, processQuery) / onBlur(value), so the wiring can be
// asserted without booting Monaco under jsdom. `data-query` records the value the real
// editor would be forced to (a change of it is what replaces Monaco's buffer).
jest.mock('@grafana/plugin-ui', () => ({
  SQLEditor: ({ query, onChange, onBlur, children }: any) => (
    <>
      <textarea
        data-testid="sql-editor"
        data-query={query}
        defaultValue={query}
        onChange={(e) => onChange(e.target.value, false)}
        onBlur={(e) => onBlur(e.target.value)}
      />
      {/* Stands in for Monaco's format action: rewrites the buffer via a plain onChange. */}
      {children?.({ formatQuery: () => onChange('FORMATTED SQL', false) })}
    </>
  ),
}));

jest.mock('./language', () => ({
  getDruidSqlLanguageDefinition: () => ({ id: 'druid-sql' }),
  // Stand-in formatter: uppercasing makes "already formatted" easy to express in tests.
  formatDruidSql: (q: string) => q.toUpperCase(),
}));

import { DruidSqlEditor } from './DruidSqlEditor';

function setup(initial = '') {
  const onOptionsChange = jest.fn();
  const props: any = {
    name: 'query',
    label: undefined,
    description: '',
    options: { builder: initial, settings: {} },
    onOptionsChange,
  };
  const view = render(<DruidSqlEditor {...props} />);
  const rerenderWith = (builder: string) =>
    view.rerender(<DruidSqlEditor {...{ ...props, options: { builder, settings: {} } }} />);
  return { onOptionsChange, editor: () => screen.getByTestId('sql-editor'), rerenderWith };
}

describe('DruidSqlEditor', () => {
  it('does not commit while typing (no query run per keystroke)', () => {
    const { onOptionsChange, editor } = setup('');
    fireEvent.change(editor(), { target: { value: 'SELECT * FROM w' } });
    fireEvent.change(editor(), { target: { value: 'SELECT * FROM wikipedia' } });
    expect(onOptionsChange).not.toHaveBeenCalled();
  });

  it('commits on blur', () => {
    const { onOptionsChange, editor } = setup('');
    fireEvent.blur(editor(), { target: { value: 'SELECT * FROM wikipedia' } });
    expect(onOptionsChange).toHaveBeenCalledTimes(1);
    expect(onOptionsChange.mock.calls[0][0].builder).toBe('SELECT * FROM wikipedia');
  });

  it('does not re-push the editor value when a commit is echoed back through props', () => {
    // Reproduces the caret-jump/lost-characters bug: DruidQueryBuilder debounces
    // onOptionsChange by 250ms, so a committed value returns via props later. If that echo
    // reached SQLEditor, @monaco-editor/react would replace the whole model.
    const { editor, rerenderWith } = setup('');
    fireEvent.blur(editor(), { target: { value: 'SELECT * FROM w' } });
    rerenderWith('SELECT * FROM w');
    // The value forced onto the editor must stay untouched, so Monaco keeps its buffer
    // (which by now may contain further typing).
    expect(editor().getAttribute('data-query')).toBe('');
  });

  it('adopts a genuine external change', () => {
    const { editor, rerenderWith } = setup('');
    rerenderWith('SELECT 1');
    expect(editor().getAttribute('data-query')).toBe('SELECT 1');
  });

  it('renders the initial query on mount', () => {
    const { editor } = setup('SELECT 42');
    expect(editor().getAttribute('data-query')).toBe('SELECT 42');
  });

  it('commits the reformatted query when the format button is used', () => {
    const { onOptionsChange } = setup('select * from wikipedia');
    fireEvent.click(screen.getByRole('button', { name: /format query/i }));
    expect(onOptionsChange).toHaveBeenCalledTimes(1);
    expect(onOptionsChange.mock.calls[0][0].builder).toBe('FORMATTED SQL');
  });

  it('does nothing when the query is already formatted', () => {
    const { onOptionsChange } = setup('SELECT 1');
    fireEvent.click(screen.getByRole('button', { name: /format query/i }));
    expect(onOptionsChange).not.toHaveBeenCalled();
  });

  it('does not keep committing later edits after a format', () => {
    const { onOptionsChange, editor } = setup('select * from wikipedia');
    fireEvent.click(screen.getByRole('button', { name: /format query/i }));
    onOptionsChange.mockClear();
    fireEvent.change(editor(), { target: { value: 'select 1' } });
    expect(onOptionsChange).not.toHaveBeenCalled();
  });

  it('can be expanded and collapsed', () => {
    setup('SELECT 1');
    expect(screen.getByRole('button', { name: /expand editor/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /expand editor/i }));
    expect(screen.getByRole('button', { name: /collapse editor/i })).toBeInTheDocument();
  });
});
