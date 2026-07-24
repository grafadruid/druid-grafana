import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { Icon, IconButton, Tooltip, useTheme2 } from '@grafana/ui';
import { SQLEditor } from '@grafana/plugin-ui';
import { QueryBuilderFieldProps } from '../../abstract/types';
import { onBuilderChange } from '../../abstract';
import { DruidDatasourceContext } from '../../../DruidDatasourceContext';
import { formatDruidSql, getDruidSqlLanguageDefinition } from './language';

const COLLAPSED_HEIGHT = 300;
const EXPANDED_HEIGHT = 600;

export const DruidSqlEditor = (props: QueryBuilderFieldProps) => {
  const theme = useTheme2();
  const styles = useMemo(
    () => ({
      toolbar: css({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: theme.spacing(1),
        padding: theme.spacing(0.5),
        border: `1px solid ${theme.colors.border.medium}`,
        borderTop: 'none',
      }),
      hint: css({ color: theme.colors.text.disabled, cursor: 'help' }),
    }),
    [theme]
  );
  const datasource = useContext(DruidDatasourceContext);
  // Monaco's callbacks close over mount-time props; route through a ref so a commit
  // always writes into the current builder object (grafana-sql uses the same trick).
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });

  const externalQuery: string = props.options.builder || '';

  // The value handed to SQLEditor. Monaco owns the buffer while the user types: we only
  // push a new value when the query changes from *outside* this editor.
  //
  // Why: SQLEditor is a controlled component, and @grafana/plugin-ui renders it through
  // @monaco-editor/react, which reacts to a changed `value` prop by replacing the whole
  // model (`executeEdits` over getFullModelRange()). Because DruidQueryBuilder debounces
  // onOptionsChange by 250ms, a committed value is echoed back through props a moment
  // later — if the user kept typing in the meantime, that echo would overwrite the buffer
  // and move the caret, silently discarding the characters typed since the commit.
  // Ignoring echoes of our own commits keeps Monaco authoritative while still honouring
  // genuine external updates.
  const [expanded, setExpanded] = useState(false);
  const [editorQuery, setEditorQuery] = useState(externalQuery);
  const lastEmitted = useRef(externalQuery);

  useEffect(() => {
    if (externalQuery !== lastEmitted.current) {
      // Changed from the outside (query loaded, panel/query switched, ...) — adopt it.
      lastEmitted.current = externalQuery;
      setEditorQuery(externalQuery);
    }
  }, [externalQuery]);

  const language = useMemo(() => getDruidSqlLanguageDefinition(datasource), [datasource]);

  // Commit (persist + run) only on blur or Cmd/Ctrl+Enter — the same UX as Grafana's own
  // SQL datasources. Running on every keystroke would execute half-typed SQL (e.g. the
  // `SELECT ... FROM ` intermediate state), which Druid rejects. onBuilderChange no-ops
  // when the value is unchanged, so a blur with no edits is free. SQLEditor passes
  // processQuery=true only on Cmd/Ctrl+Enter; blur arrives via the separate onBlur.
  const commit = (q: string) => {
    lastEmitted.current = q;
    onBuilderChange(propsRef.current, q);
  };

  // Formatting goes through Monaco's own action (SQLEditor registers the formatter from the language
  // definition), which keeps the caret and the undo stack intact. It reaches us as an ordinary,
  // non-committing change though, so the result would only be persisted on the next blur — hence the
  // next change is committed. Checking first whether formatting changes anything keeps that flag
  // from surviving into a later keystroke, which would run a query mid-typing.
  const buffer = useRef(externalQuery);
  const commitNextChange = useRef(false);
  const onFormat = (formatQuery: () => void) => {
    if (formatDruidSql(buffer.current) === buffer.current) {
      return; // already formatted (or unformattable) — nothing to commit
    }
    commitNextChange.current = true;
    formatQuery();
  };

  return (
    <div style={{ width: '100%' }}>
      <SQLEditor
        query={editorQuery}
        onChange={(q, processQuery) => {
          buffer.current = q;
          if (processQuery || commitNextChange.current) {
            commitNextChange.current = false;
            commit(q);
          }
        }}
        onBlur={(q) => commit(q)}
        language={language}
        height={expanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT}
      >
        {({ formatQuery }) => (
          <div className={styles.toolbar}>
            <IconButton name="brackets-curly" size="xs" tooltip="Format query" onClick={() => onFormat(formatQuery)} />
            <IconButton
              name={expanded ? 'angle-up' : 'angle-down'}
              size="xs"
              tooltip={expanded ? 'Collapse editor' : 'Expand editor'}
              onClick={() => setExpanded(!expanded)}
            />
            <Tooltip content="Hit CTRL/CMD+Return to run the query">
              <Icon name="keyboard" className={styles.hint} />
            </Tooltip>
          </div>
        )}
      </SQLEditor>
    </div>
  );
};
