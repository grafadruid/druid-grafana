import React, { useMemo, useState, useEffect } from 'react';
import { InlineField, AsyncSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { getTemplateSrv } from '@grafana/runtime';
import { QueryBuilderProps } from '../types';
import { useScopedQueryBuilderFieldProps, onBuilderChange } from '../abstract';

export const Json = (props: QueryBuilderProps) => {
  const scopedProps = useScopedQueryBuilderFieldProps(props, Json);
  const valueProps = scopedProps('value');
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

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

  const loadOptions = (search: string): Promise<SelectableValue[]> => {
    const q = (search ?? '').toLowerCase();
    const filtered = variableOptions.filter(
      (o) => !q || (o.label ?? o.value ?? '').toString().toLowerCase().includes(q)
    );
    return Promise.resolve(filtered.slice(0, 20));
  };

  useEffect(() => {
    if (valueProps.options.builder != null && valueProps.options.builder !== '') {
      setInputValue(String(valueProps.options.builder));
    } else {
      setInputValue('');
    }
  }, [valueProps.options.builder]);

  const onChange = (option: SelectableValue<string> | null) => {
    if (option !== null) {
      onBuilderChange(valueProps, option.value);
      setInputValue(option.value ?? '');
      requestAnimationFrame(() => setIsFocused(false));
    } else {
      onBuilderChange(valueProps, '');
      setInputValue('');
    }
  };

  const onBlur = () => {
    setIsFocused(false);
    const currentBuilder = valueProps.options.builder ? String(valueProps.options.builder) : '';
    if (inputValue.trim() !== currentBuilder) {
      onBuilderChange(valueProps, inputValue.trim());
    }
  };

  const currentValue =
    valueProps.options.builder != null && valueProps.options.builder !== ''
      ? { value: valueProps.options.builder, label: valueProps.options.builder }
      : null;

  return (
    <InlineField label={valueProps.label} tooltip={valueProps.description} grow>
      <AsyncSelect
        value={currentValue}
        {...(isFocused
          ? {
              inputValue,
              onInputChange: (value: string) => {
                const next = value ?? '';
                if (next === '' && valueProps.options.builder) {
                  setInputValue(String(valueProps.options.builder));
                  return;
                }
                setInputValue(next);
              },
            }
          : {})}
        onFocus={() => {
          setIsFocused(true);
          if (valueProps.options.builder) {
            setInputValue(String(valueProps.options.builder));
          }
        }}
        onBlur={onBlur}
        loadOptions={loadOptions}
        onChange={onChange}
        placeholder="JSON filter or variable (e.g. $variable_name)"
        defaultOptions={true}
        allowCustomValue={true}
        isClearable={true}
        cacheOptions={true}
        noOptionsMessage={variableOptions.length === 0 ? 'No variables defined' : 'No matching variables'}
      />
    </InlineField>
  );
};
Json.type = 'json';
Json.fields = ['value'];
