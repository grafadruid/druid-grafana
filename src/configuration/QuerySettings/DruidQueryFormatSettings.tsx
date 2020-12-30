import React, { PureComponent } from 'react';
import { InlineField, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QuerySettingsProps } from './types';

export class DruidQueryFormatSettings extends PureComponent<QuerySettingsProps> {
  constructor(props: QuerySettingsProps) {
    super(props);

    const { settings } = this.props.options;

    if (settings.format === undefined) {
      settings.format = 'long';
    }
  }

  selectOptions: Array<SelectableValue<string>> = [
    { label: 'Long', value: 'long' },
    { label: 'Wide', value: 'wide' },
  ];

  selectOptionByValue = (value?: string): SelectableValue<string> | undefined => {
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

  selectOption = (option: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    const { settings } = options;
    settings.format = option.value;
    onOptionsChange({ ...options, settings });
  };

  render() {
    const { settings } = this.props.options;
    return (
      <div className={'gf-form-group'}>
        <h3 className="page-heading">Query format</h3>
        <InlineField label="Format">
          <Select
            width={30}
            onChange={this.onSelectionChange}
            options={this.selectOptions}
            value={this.selectOptionByValue(settings.format)}
          />
        </InlineField>
      </div>
    );
  }
}
