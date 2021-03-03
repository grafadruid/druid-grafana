import React, { useState, ComponentType } from 'react';
import { QueryBuilderProps } from '../types';
import { InlineField, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { cloneDeep } from 'lodash';

const useComponentsRegistry = (
  components: Record<string, ComponentType<QueryBuilderProps>>
): Record<string, ComponentType<QueryBuilderProps>> => {
  let registry: Record<string, ComponentType<QueryBuilderProps>> = {};
  for (let key of Object.keys(components)) {
    registry[key.toLowerCase()] = components[key];
  }
  return registry;
};

const useComponentKey = (builder: any): string | undefined => {
  let key = builder === null ? undefined : builder.type || builder.queryType;
  if (undefined !== key) {
    key = key.toLowerCase();
  }
  return key;
};

const useSelectOptions = (
  components: Record<string, ComponentType<QueryBuilderProps>>,
  selectedComponentKey: string | undefined
): [SelectableValue<string> | undefined, Array<SelectableValue<string>>] => {
  const options = Object.keys(components).map((key, index) => {
    return { label: key, value: key.toLowerCase() };
  });
  let selectedOption = undefined;
  if (undefined !== selectedComponentKey) {
    const selectedOptions = options.filter((option) => option.value === selectedComponentKey.toLowerCase());
    if (selectedOptions.length > 0) {
      selectedOption = selectedOptions[0];
    }
  }
  return [selectedOption, options];
};

interface QueryBuilderComponentSelectorProps {
  name: string;
  components: Record<string, ComponentType<QueryBuilderProps>>;
  queryBuilderProps: QueryBuilderProps;
}

export const QueryBuilderComponentSelector = (props: QueryBuilderComponentSelectorProps) => {
  const components = useComponentsRegistry(props.components);
  const [selectedComponentKey, selectComponentKey] = useState(useComponentKey(props.queryBuilderProps.options.builder));
  const [selectedOption, options] = useSelectOptions(props.components, selectedComponentKey);
  const onSelection = (selection: SelectableValue<string>) => {
    let componentKey = undefined;
    if (null === selection) {
      let options = cloneDeep(props.queryBuilderProps.options);
      options.builder = null;
      props.queryBuilderProps.onOptionsChange(options);
    } else {
      componentKey = selection.value;
    }
    selectComponentKey(componentKey);
  };
  const Component = selectedComponentKey === undefined ? undefined : components[selectedComponentKey];

  return (
    <>
      <InlineField label={props.name} grow>
        <Select options={options} value={selectedOption} onChange={onSelection} isClearable={true} />
      </InlineField>
      {Component && <Component {...props.queryBuilderProps} />}
    </>
  );
};
