jest.mock('@grafana/plugin-ui', () => ({
  grafanaStandardSQLLanguage: { id: 'sql', tokenPostfix: '.sql', tokenizer: {} },
  grafanaStandardSQLLanguageConf: {},
  getStandardSQLCompletionProvider: jest.fn(() => ({})),
  MacroType: { Value: 0 },
}));

import { formatDruidSql, druidSqlLanguage, getDruidSqlLanguageDefinition } from './language';

describe('formatDruidSql', () => {
  it('pretty-prints a query', () => {
    const out = formatDruidSql('select channel, count(*) from wikipedia group by channel');
    expect(out).toContain('SELECT');
    expect(out).toContain('FROM');
    expect(out.split('\n').length).toBeGreaterThan(1);
  });

  it('upper-cases keywords', () => {
    expect(formatDruidSql('select 1')).toMatch(/^SELECT/);
  });

  it('returns a half-written query unchanged instead of throwing', () => {
    const partial = 'SELECT * FROM';
    expect(() => formatDruidSql(partial)).not.toThrow();
    expect(formatDruidSql('')).toBe('');
  });
});

describe('language definition', () => {
  it('registers the formatter so the format action and button work', () => {
    expect(getDruidSqlLanguageDefinition().formatter).toBe(formatDruidSql);
  });

  it('keeps the Druid vocabulary for highlighting', () => {
    expect(druidSqlLanguage.builtinFunctions).toContain('TIME_FLOOR');
    expect(druidSqlLanguage.keywords).toContain('SELECT');
    // multi-word keywords are split for the tokenizer
    expect(druidSqlLanguage.keywords).toContain('GROUP');
    expect(druidSqlLanguage.keywords).not.toContain('GROUP BY');
  });
});

describe('formatDruidSql and Grafana template variables', () => {
  // sql-formatter cannot parse `$__from` on its own; without the custom param types it throws and the
  // formatter silently returns the query unchanged, so the button looks broken on the standard
  // Druid time filter.
  it('formats the canonical Druid time filter and preserves the variables', () => {
    const out = formatDruidSql(
      'select * from wikipedia where __time >= MILLIS_TO_TIMESTAMP($__from) and __time <= MILLIS_TO_TIMESTAMP($__to)'
    );
    expect(out).toContain('$__from');
    expect(out).toContain('$__to');
    expect(out.split('\n').length).toBeGreaterThan(1); // actually reformatted
  });

  it('preserves every supported variable syntax verbatim', () => {
    const out = formatDruidSql(
      "select * from wikipedia where cityName in (${city:sqlstring}) and channel = '[[chan]]' and c = ${n} and d = $env"
    );
    for (const v of ['${city:sqlstring}', '[[chan]]', '${n}', '$env']) {
      expect(out).toContain(v);
    }
  });

  it('does not leave a space between a Druid function and its arguments', () => {
    const out = formatDruidSql("select TIME_FLOOR(__time, 'PT1H') from wikipedia");
    expect(out).toContain('TIME_FLOOR(');
    expect(out).not.toContain('TIME_FLOOR (');
  });

  it('keeps the space after keywords that are followed by a parenthesis', () => {
    const out = formatDruidSql('select * from wikipedia where cityName in (1, 2)');
    expect(out).toContain('IN (');
  });
});
