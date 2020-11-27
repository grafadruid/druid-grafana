import React, { PureComponent, ChangeEvent } from 'react';
import { Select, LegacyForms } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class StringFormat extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'format', 'nullHandling']);
    const { builder } = props.options;
    builder.type = 'stringFormat';
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

  selectOptions: Array<SelectableValue<string>> = [
    { label: 'Null string', value: 'NULLSTRING' },
    { label: 'Empty string', value: 'EMPTYSTRING' },
    { label: 'Return null', value: 'RETURNNULL' },
  ];

  selectOptionByValue = (value: string): SelectableValue<string> | undefined => {
    if (undefined === value) {
      return undefined;
    }
    const options = this.selectOptions.filter(option => option.value === value);
    if (options.length > 0) {
      return options[0];
    }
    return undefined;
  };

  onSelectionChange = (option: SelectableValue<string>) => {
    this.selectOption(option);
  };

  onCustomSelection = (selection: string) => {
    const option: SelectableValue<string> = { value: selection.toLowerCase(), label: selection };
    this.selectOptions.push(option);
    this.selectOption(option);
  };

  selectOption = (option: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder.nullHandling = option.value;
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
              label="Format"
              name="format"
              type="text"
              placeholder="the sprintf expression."
              value={builder.format}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Null handling</label>
            <Select
              options={this.selectOptions}
              value={this.selectOptionByValue(builder.nullHandling)}
              allowCustomValue
              onChange={this.onSelectionChange}
              onCreateOption={this.onCustomSelection}
	      isClearable={true}
            />
          </div>
        </div>
      </>
    );
  }
}
