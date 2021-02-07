import React, { PureComponent } from 'react';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class Simple extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder([]);
  }

  resetBuilder = (properties: string[]) => {
    let { builder } = this.props.options;
    if (typeof builder !== 'object') {
      builder = {};
      return;
    }
    for (let key of Object.keys(builder)) {
      if (!properties.includes(key)) {
        delete builder[key];
      }
    }
  };

  selectOptions: Array<SelectableValue<string>> = [
    { label: 'All', value: 'all' },
    { label: 'None', value: 'none' },
    { label: 'Second', value: 'second' },
    { label: 'Minute', value: 'minute' },
    { label: 'Fifteen minutes', value: 'fifteen_minute' },
    { label: 'Thirty minutes', value: 'thirty_minute' },
    { label: 'Hour', value: 'hour' },
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  selectOptionByValue = (value: string): SelectableValue<string> | undefined => {
    if (undefined === value) {
      return undefined;
    }
    const options = this.selectOptions.filter((option) => option.value === value);
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
    let { builder, settings } = options;
    builder = option.value;
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
            <label className="gf-form-label">Granularity</label>
            <Select
              options={this.selectOptions}
              value={this.selectOptionByValue(builder)}
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
