// Tests the shared parsing helpers used by scripts/generate-druid-sql-docs.mjs.
import {
  parseFunctionRow,
  parseDataTypeRow,
  parseNiladicRow,
  parseDruidSqlDocs,
  cleanDescription,
} from '../../../../scripts/druidSqlDocsParser.js';

const FIXTURE = [
  '| Function | Notes |',
  '| --- | --- |',
  '| `ABS(expr)` | Absolute value. |',
  '| `POWER(expr, power)` | Raises `expr` to the power of `power`. |',
  '| `TIME_FLOOR(timestamp_expr, period[, origin[, timezone]])` | Rounds down a timestamp, [see docs](https://x). |',
  '| `CURRENT_TIMESTAMP` | Current timestamp in UTC time. |',
  '| `channel` | An example column name, lowercase, must be ignored. |',
  '',
  '## Data types',
  '| Data type | Runtime | Default | Notes |',
  '|VARCHAR|STRING|`null`|SQL type for strings.|',
].join('\n');

describe('parseFunctionRow', () => {
  it('parses a simple function row', () => {
    expect(parseFunctionRow('| `ABS(expr)` | Absolute value. |')).toEqual({
      name: 'ABS',
      args: 'expr',
      description: 'Absolute value.',
    });
  });

  it('parses multi-argument signatures', () => {
    expect(parseFunctionRow('| `POWER(expr, power)` | desc |')).toEqual({
      name: 'POWER',
      args: 'expr, power',
      description: 'desc',
    });
  });

  it('does not parse a parenless row (e.g. PI)', () => {
    expect(parseFunctionRow('| PI | Constant pi. |')).toBeNull();
  });
});

describe('cleanDescription', () => {
  it('strips markdown links but keeps the text', () => {
    expect(cleanDescription('see [the docs](https://example.com) now')).toBe('see the docs now');
  });
  it('turns <br> variants into newlines', () => {
    expect(cleanDescription('a<br>b<br/>c<br />d')).toBe('a\nb\nc\nd');
  });
});

describe('parseDataTypeRow', () => {
  it('parses a data-type row', () => {
    expect(parseDataTypeRow('|VARCHAR|STRING|`null`|SQL type for strings.|')).toEqual({
      name: 'VARCHAR',
      runtime: 'STRING',
      description: 'SQL type for strings.',
    });
  });
});

describe('parseDruidSqlDocs', () => {
  it('collects functions and data types from a markdown blob', () => {
    const { functions, dataTypes } = parseDruidSqlDocs(FIXTURE);
    expect(Object.keys(functions).sort()).toEqual(['ABS', 'CURRENT_TIMESTAMP', 'POWER', 'TIME_FLOOR']);
    expect(functions.ABS).toEqual({ args: 'expr', description: 'Absolute value.' });
    expect(functions.TIME_FLOOR.description).toBe('Rounds down a timestamp, see docs.');
    expect(functions.CURRENT_TIMESTAMP).toEqual({ args: '', description: 'Current timestamp in UTC time.' });
    expect(functions.channel).toBeUndefined();
    expect(dataTypes.VARCHAR).toEqual({ runtime: 'STRING', description: 'SQL type for strings.' });
  });
});

describe('parseNiladicRow', () => {
  it('parses an uppercase parenless entry', () => {
    expect(parseNiladicRow('| `CURRENT_TIMESTAMP` | Current timestamp in UTC time. |')).toEqual({
      name: 'CURRENT_TIMESTAMP',
      args: '',
      description: 'Current timestamp in UTC time.',
    });
  });

  it('ignores lowercase names (example column names in the window-function docs)', () => {
    expect(parseNiladicRow('| `channel` | An example column. |')).toBeNull();
    expect(parseNiladicRow('| `time_hour` | An example column. |')).toBeNull();
  });

  it('ignores rows whose first cell has parens (those are functions)', () => {
    expect(parseNiladicRow('| `ROW_NUMBER()` | Row number. |')).toBeNull();
  });
});
