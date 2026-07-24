jest.mock('@grafana/plugin-ui', () => ({
  getStandardSQLCompletionProvider: jest.fn(() => ({ triggerCharacters: ['.'] })),
  MacroType: { Value: 0, Filter: 1, Group: 2, Column: 3, Table: 4 },
}));

import {
  getDruidSqlCompletionProvider,
  wordPrefixBefore,
  hasTrailingContent,
  nearestPrecedingKeyword,
  tableInStatement,
  findEnclosingCall,
  splitArgs,
  findFunctionDoc,
  quoteIfNeeded,
  unquote,
  DRUID_GLOBAL_VARS,
  PLAIN_WORDS,
  functionSignature,
} from './completionProvider';
import { clearMetadataCache } from './metadata';
import { DruidDataSource } from '../../../DruidDataSource';

const monaco: any = {
  editor: { getModels: () => [] },
  languages: { registerHoverProvider: jest.fn(), registerSignatureHelpProvider: jest.fn() },
  Range: class {},
};

function providerFor(post?: jest.Mock) {
  const ds = post ? ({ uid: 'uid-test', postResource: post } as unknown as DruidDataSource) : undefined;
  return getDruidSqlCompletionProvider(ds)(monaco, undefined as any);
}

beforeEach(() => {
  clearMetadataCache();
});

describe('quoteIfNeeded / unquote', () => {
  it('leaves simple identifiers unquoted', () => {
    expect(quoteIfNeeded('wikipedia')).toBe('wikipedia');
    expect(quoteIfNeeded('_ok123')).toBe('_ok123');
  });
  it('quotes and escapes exotic names', () => {
    expect(quoteIfNeeded('my-table')).toBe('"my-table"');
    expect(quoteIfNeeded('a"b')).toBe('"a""b"');
  });
  it('unquotes and unescapes', () => {
    expect(unquote('"my-table"')).toBe('my-table');
    expect(unquote('"a""b"')).toBe('a"b');
    expect(unquote('plain')).toBe('plain');
  });
});

describe('tables.resolve', () => {
  it('maps druid-schema tables to bare names and others to schema.name', async () => {
    const post = jest.fn().mockResolvedValue([
      { schema: 'druid', name: 'wikipedia' },
      { schema: 'sys', name: 'segments' },
      { schema: 'druid', name: 'my-table' },
    ]);
    const tables = await providerFor(post).tables!.resolve!(null);
    expect(tables).toEqual([
      { name: 'wikipedia', completion: 'wikipedia' },
      { name: 'sys.segments', completion: 'sys.segments' },
      { name: 'my-table', completion: '"my-table"' },
    ]);
  });

  it('returns [] without a datasource', async () => {
    expect(await providerFor().tables!.resolve!(null)).toEqual([]);
  });

  it('returns [] when the fetch fails', async () => {
    const post = jest.fn().mockRejectedValue(new Error('dead druid'));
    expect(await providerFor(post).tables!.resolve!(null)).toEqual([]);
  });
});

describe('columns.resolve', () => {
  const cols = [{ name: '__time', type: 'TIMESTAMP' }];

  it('defaults schema to druid for a bare table', async () => {
    const post = jest.fn().mockResolvedValue(cols);
    const out = await providerFor(post).columns!.resolve!({ table: 'wikipedia' });
    expect(post).toHaveBeenCalledWith('metadata/columns', { schema: 'druid', table: 'wikipedia' });
    expect(out).toEqual([{ name: '__time', type: 'TIMESTAMP', description: 'TIMESTAMP' }]);
  });

  it('uses an explicit schema', async () => {
    const post = jest.fn().mockResolvedValue(cols);
    await providerFor(post).columns!.resolve!({ schema: 'sys', table: 'segments' });
    expect(post).toHaveBeenCalledWith('metadata/columns', { schema: 'sys', table: 'segments' });
  });

  it('splits a dotted table name into schema + table', async () => {
    const post = jest.fn().mockResolvedValue(cols);
    await providerFor(post).columns!.resolve!({ table: 'sys.segments' });
    expect(post).toHaveBeenCalledWith('metadata/columns', { schema: 'sys', table: 'segments' });
  });

  it('unquotes a quoted table name', async () => {
    const post = jest.fn().mockResolvedValue(cols);
    await providerFor(post).columns!.resolve!({ table: '"my-table"' });
    expect(post).toHaveBeenCalledWith('metadata/columns', { schema: 'druid', table: 'my-table' });
  });

  it('returns [] without a datasource or without a table', async () => {
    expect(await providerFor().columns!.resolve!({ table: 'wikipedia' })).toEqual([]);
    const post = jest.fn();
    expect(await providerFor(post).columns!.resolve!(undefined)).toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });

  it('returns [] when the fetch fails', async () => {
    const post = jest.fn().mockRejectedValue(new Error('boom'));
    expect(await providerFor(post).columns!.resolve!({ table: 'wikipedia' })).toEqual([]);
  });
});

describe('macros / global variables', () => {
  it('advertises $__from but not $__timeFilter', () => {
    const ids = DRUID_GLOBAL_VARS.map((m) => m.id);
    expect(ids).toContain('$__from');
    expect(ids).toContain('$__to');
    expect(ids).not.toContain('$__timeFilter');
  });

  it('exposes the same macros through supportedMacros()', () => {
    const macros = providerFor().supportedMacros!();
    expect(macros.map((m) => m.id)).toContain('$__from');
    expect(macros.map((m) => m.id)).not.toContain('$__timeFilter');
  });
});

describe('supportedFunctions', () => {
  it('includes documented functions with signature in the description', () => {
    const fns = providerFor().supportedFunctions!();
    const abs = fns.find((f) => f.name === 'ABS');
    expect(abs).toBeDefined();
    expect(abs!.description).toContain('ABS(');
  });

  it('excludes niladic functions (the engine would insert CURRENT_TIMESTAMP())', () => {
    const names = providerFor().supportedFunctions!().map((f) => f.name);
    expect(names).not.toContain('CURRENT_TIMESTAMP');
    expect(names).not.toContain('PI');
    // zero-argument window functions DO need parens, so they stay
    expect(names).toContain('ROW_NUMBER');
  });
});

describe('keyword / constant / niladic vocabulary (PLAIN_WORDS)', () => {
  const byLabel = (label: string) => PLAIN_WORDS.find((w) => w.label === label);

  it('offers CURRENT_TIMESTAMP with its Druid documentation', () => {
    const entry = byLabel('CURRENT_TIMESTAMP');
    expect(entry).toBeDefined();
    expect(entry!.isKeyword).toBe(false);
    expect(entry!.documentation).toMatch(/current timestamp/i);
  });

  it('offers the other niladic date/time functions', () => {
    for (const name of ['CURRENT_DATE', 'CURRENT_TIME', 'LOCALTIME', 'LOCALTIMESTAMP', 'PI']) {
      expect(byLabel(name)).toBeDefined();
    }
  });

  it('offers constants and multi-word keywords', () => {
    expect(byLabel('NULL')).toBeDefined();
    expect(byLabel('TRUE')).toBeDefined();
    expect(byLabel('GROUP BY')?.isKeyword).toBe(true);
    expect(byLabel('UNION ALL')?.isKeyword).toBe(true);
    expect(byLabel('CASE')?.isKeyword).toBe(true);
  });

  it('does not duplicate a label between categories', () => {
    const labels = PLAIN_WORDS.map((w) => w.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('keeps niladic functions out of the keyword category so they are not double-listed', () => {
    expect(byLabel('CURRENT_TIMESTAMP')!.isKeyword).toBe(false);
  });
});

describe('findFunctionDoc', () => {
  it('is case-insensitive', () => {
    expect(findFunctionDoc('time_floor')).toBe(findFunctionDoc('TIME_FLOOR'));
    expect(findFunctionDoc('TIME_FLOOR')).toBeDefined();
  });
  it('returns undefined for non-functions', () => {
    expect(findFunctionDoc('not_a_druid_function_xyz')).toBeUndefined();
  });
});

describe('splitArgs', () => {
  it('splits simple lists', () => {
    expect(splitArgs('expr, power')).toEqual(['expr', 'power']);
  });
  it('treats optional brackets as separators, not nesting', () => {
    expect(splitArgs('expr[, digits]')).toEqual(['expr', 'digits']);
  });
  it('respects nested parens', () => {
    expect(splitArgs('a, POW(b, c)')).toEqual(['a', 'POW(b, c)']);
  });
  it('handles empty and single args', () => {
    expect(splitArgs('')).toEqual([]);
    expect(splitArgs('expr')).toEqual(['expr']);
  });
});

describe('mid-statement completion helpers', () => {
  describe('wordPrefixBefore', () => {
    it('returns the partial word before the caret', () => {
      // `SELECT diff| FROM wikipedia` (caret at column 12)
      expect(wordPrefixBefore('SELECT diff FROM wikipedia', 12)).toBe('diff');
    });
    it('returns empty when the caret does not follow a word', () => {
      expect(wordPrefixBefore('SELECT  FROM wikipedia', 8)).toBe('');
      expect(wordPrefixBefore('SELECT * FROM x', 9)).toBe('');
    });
    it('handles the start of a line and identifier characters', () => {
      expect(wordPrefixBefore('abc', 1)).toBe('');
      expect(wordPrefixBefore('SELECT __ti', 12)).toBe('__ti');
    });
  });

  describe('hasTrailingContent', () => {
    it('is true when text follows the caret on the line', () => {
      expect(hasTrailingContent('SELECT d FROM wikipedia', 9)).toBe(true);
    });
    it('is false at the end of the line (plugin-ui handles that itself)', () => {
      expect(hasTrailingContent('SELECT d', 9)).toBe(false);
      expect(hasTrailingContent('SELECT d   ', 9)).toBe(false);
    });
  });

  describe('nearestPrecedingKeyword', () => {
    it('finds the clause the caret sits in', () => {
      expect(nearestPrecedingKeyword('SELECT d')).toBe('select');
      expect(nearestPrecedingKeyword('SELECT * FROM wik')).toBe('from');
      expect(nearestPrecedingKeyword('SELECT * FROM w WHERE chan')).toBe('where');
      expect(nearestPrecedingKeyword('SELECT * FROM w WHERE a AND b')).toBe('and');
    });
    it('ignores keywords inside string literals and comments', () => {
      expect(nearestPrecedingKeyword("SELECT * FROM w WHERE x = 'from' AND y")).toBe('and');
      expect(nearestPrecedingKeyword('SELECT a -- from here\n')).toBe('select');
    });
    it('returns undefined without a clause keyword', () => {
      expect(nearestPrecedingKeyword('abc')).toBeUndefined();
    });
  });

  describe('tableInStatement', () => {
    it('parses a bare table as the druid schema', () => {
      expect(tableInStatement('SELECT d FROM wikipedia')).toEqual({ schema: 'druid', table: 'wikipedia' });
    });
    it('parses a schema-qualified table', () => {
      expect(tableInStatement('SELECT * FROM sys.segments')).toEqual({ schema: 'sys', table: 'segments' });
    });
    it('parses quoted names', () => {
      expect(tableInStatement('SELECT * FROM "my-table"')).toEqual({ schema: 'druid', table: 'my-table' });
      expect(tableInStatement('SELECT * FROM sys."odd name"')).toEqual({ schema: 'sys', table: 'odd name' });
    });
    it('is case-insensitive about FROM', () => {
      expect(tableInStatement('select * from wikipedia')).toEqual({ schema: 'druid', table: 'wikipedia' });
    });
    it('returns undefined without a FROM clause', () => {
      expect(tableInStatement('SELECT 1')).toBeUndefined();
    });
  });
});

describe('findEnclosingCall', () => {
  it('finds the enclosing function and arg index', () => {
    expect(findEnclosingCall('SELECT TIME_FLOOR(__time, ')).toEqual({ name: 'TIME_FLOOR', argIndex: 1 });
  });
  it('counts commas up to the cursor', () => {
    expect(findEnclosingCall('SELECT FOO(a, b, ')).toEqual({ name: 'FOO', argIndex: 2 });
  });
  it('ignores commas and parens inside strings', () => {
    expect(findEnclosingCall("SELECT FOO('a, b(', ")).toEqual({ name: 'FOO', argIndex: 1 });
  });
  it('handles nested calls (innermost wins)', () => {
    expect(findEnclosingCall('SELECT FOO(a, BAR(b, ')).toEqual({ name: 'BAR', argIndex: 1 });
  });
  it('returns undefined when not inside a call', () => {
    expect(findEnclosingCall('SELECT * FROM wikipedia ')).toBeUndefined();
    expect(findEnclosingCall('SELECT (a + b) ')).toBeUndefined();
  });
});

describe('functionSignature', () => {
  it('shows an argument list for ordinary functions', () => {
    expect(functionSignature('time_floor', findFunctionDoc('TIME_FLOOR')!)).toBe(
      `TIME_FLOOR(${findFunctionDoc('TIME_FLOOR')!.args})`
    );
  });

  it('shows niladic functions without parens', () => {
    expect(functionSignature('CURRENT_TIMESTAMP', findFunctionDoc('CURRENT_TIMESTAMP')!)).toBe('CURRENT_TIMESTAMP');
    expect(functionSignature('PI', findFunctionDoc('PI')!)).toBe('PI');
  });

  it('keeps parens for zero-argument functions that require them', () => {
    expect(functionSignature('ROW_NUMBER', findFunctionDoc('ROW_NUMBER')!)).toBe('ROW_NUMBER()');
  });

  it('shows plain vocabulary without parens', () => {
    expect(functionSignature('NULL', findFunctionDoc('NULL')!)).toBe('NULL');
  });
});

describe('findFunctionDoc for undocumented vocabulary', () => {
  it('falls back to the hand-written descriptions', () => {
    expect(findFunctionDoc('CURRENT_TIME')?.description).toMatch(/current time/i);
    expect(findFunctionDoc('null')?.description).toMatch(/null literal/i);
  });
});
