import React, { PureComponent, ChangeEvent } from 'react';
import { css } from 'emotion';
import { Select, LegacyForms } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Expression extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'name', 'expression', 'outputType']);
    const { builder } = props.options;
    builder.type = 'expression';
  }

  resetBuilder = (properties: string[]) => {
    const { builder } = this.props.options;
    for (let key of Object.keys(builder)) {
      if (!properties.includes(key)) {
        delete builder[key];
      }
    }
  };

  onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    let value: any = event.target.value;
    if ('number' === event.target.type) {
      value = Number(value);
    }
    builder[event.target.name] = value;
    onOptionsChange({ ...options, builder: builder });
  };

  selectOptions: Record<string, Array<SelectableValue<string>>> = {
    outputType: [
      { label: 'Long', value: 'LONG' },
      { label: 'Float', value: 'FLOAT' },
      { label: 'Double', value: 'DOUBLE' },
      { label: 'String', value: 'STRING' },
    ],
  };

  selectOptionByValue = (component: string, value: string): SelectableValue<string> | undefined => {
    if (undefined === value) {
      return undefined;
    }
    const options = this.selectOptions[component].filter((option) => option.value === value);
    if (options.length > 0) {
      return options[0];
    }
    return undefined;
  };

  onSelectionChange = (component: string, option: SelectableValue<string>) => {
    this.selectOption(component, option);
  };

  onCustomSelection = (component: string, selection: string) => {
    const option: SelectableValue<string> = { value: selection.toLowerCase(), label: selection };
    this.selectOptions[component].push(option);
    this.selectOption(component, option);
  };

  selectOption = (component: string, option: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder[component] = option.value;
    onOptionsChange({ ...options, builder, settings });
  };

  render() {
    const { builder } = this.props.options;
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 300px;
            `}
          >
            <FormField
              label="Name"
              name="name"
              type="text"
              placeholder="The name of the virtual column"
              value={builder.name}
              onChange={this.onInputChange}
            />
            <FormField
              label="Expression"
              name="expression"
              type="text"
              placeholder="Expr. that takes a row as input, outputs a value"
              value={builder.expression}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Output type</label>
            <Select
              options={this.selectOptions.outputType}
              value={this.selectOptionByValue('outputType', builder.outputType)}
              allowCustomValue
              onChange={this.onSelectionChange.bind(this, 'outputType')}
              onCreateOption={this.onCustomSelection.bind(this, 'outputType')}
              isClearable={true}
            />
          </div>
        </div>
      </>
    );
  }
}
