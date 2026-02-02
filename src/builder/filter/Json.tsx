import React, { useMemo } from 'react';
import { InlineField, Select, useStyles2 } from '@grafana/ui';
import { SelectableValue, GrafanaTheme2 } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { css } from '@emotion/css';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, onBuilderChange } from '../abstract';

const getInputStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    minWidth: 0,
  }),
  input: css({
    flex: 1,
    minWidth: 0,
    height: 32,
    padding: '0 12px',
    fontSize: 14,
    background: theme.colors.background.canvas,
    border: `1px solid ${theme.colors.border.medium}`,
    borderRadius: theme.shape.radius.default,
    color: theme.colors.text.primary,
    '&:focus': {
      outline: 'none',
      borderColor: theme.colors.primary.border,
      boxShadow: `0 0 0 1px ${theme.colors.primary.border}`,
    },
    '&::placeholder': {
      color: theme.colors.text.disabled,
    },
  }),
});

export const Json = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Json);
  const valueProps = scopedProps('value');
  const styles = useStyles2(getInputStyles);

  const variableOptions = useMemo(() => {
    const templateSrv = getTemplateSrv();
    const variables = (templateSrv as { getVariables?: () => Array<{ name?: string }> }).getVariables?.() ?? [];
    return variables
      .map((v) => {
        const name = v?.name ?? '';
        return name ? { value: `$${name}`, label: `$${name}` } : null;
      })
      .filter((o): o is SelectableValue<string> => o != null);
  }, []);

  const currentValue = (valueProps.options.builder ?? '') as string;

  return (
    <InlineField label={valueProps.label} tooltip={valueProps.description} grow>
      <div className={styles.wrapper}>
        <input
          type="text"
          className={styles.input}
          value={currentValue}
          onChange={(e) => onBuilderChange(valueProps, e.target.value)}
          placeholder="JSON filter or variable (e.g. $variable_name)"
          spellCheck={false}
        />
        {variableOptions.length > 0 && (
          <Select
            options={variableOptions}
            value={null}
            onChange={(option: SelectableValue<string> | null) => {
              if (option?.value != null) {
                onBuilderChange(valueProps, option.value);
              }
            }}
            placeholder="Insert variable..."
            width={24}
            isClearable={false}
          />
        )}
      </div>
    </InlineField>
  );
};
Json.type = 'json';
Json.fields = ['value'];
