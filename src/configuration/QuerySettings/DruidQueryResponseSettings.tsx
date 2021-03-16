import React, { PureComponent, ChangeEvent } from 'react';
import { InlineFieldRow, InlineField, InlineSwitch, Select, Input, Collapse } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { QuerySettingsProps } from './types';

export class DruidQueryResponseSettings extends PureComponent<QuerySettingsProps> {
  constructor(props: QuerySettingsProps) {
    super(props);

    const { settings } = this.props.options;

    if (settings.format === undefined) {
      settings.format = 'long';
    }
    if (settings.hideEmptyColumns === undefined) {
      settings.hideEmptyColumns = false;
    }
  }

  formatSelectOptions: Array<SelectableValue<string>> = [
    { label: 'Long', value: 'long' },
    { label: 'Wide', value: 'wide' },
    { label: 'Log', value: 'log' },
  ];

  selectFormatOptionByValue = (value?: string): SelectableValue<string> | undefined => {
    if (undefined === value) {
      return undefined;
    }
    const options = this.formatSelectOptions.filter((option) => option.value === value);
    if (options.length > 0) {
      return options[0];
    }
    return undefined;
  };

  onFormatSelectionChange = (option: SelectableValue<string>) => {
    const { options, onOptionsChange } = this.props;
    const { settings } = options;
    settings.format = option.value;
    onOptionsChange({ ...options, settings });
  };

  onHideEmptyColumnsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { settings } = options;
    settings.hideEmptyColumns = event!.currentTarget.checked;
    onOptionsChange({ ...options, settings: settings });
  };

  render() {
    const { settings } = this.props.options;
    return (
      <div className={'gf-form-group'}>
        <h3 className="page-heading">Response options</h3>
        <InlineFieldRow>
          <InlineField label="Format" tooltip="Changes the data frame format used to return results">
            <Select
              width={30}
              onChange={this.onFormatSelectionChange}
              options={this.formatSelectOptions}
              value={this.selectFormatOptionByValue(settings.format)}
            />
          </InlineField>
        </InlineFieldRow>
        {settings.format === 'log' && (
          <Collapse label="Log Settings" isOpen={true}>
            <InlineFieldRow>
              <InlineField label="Time column" tooltip="Use this column as the time for logs">
                <Input value={'__time'} />
              </InlineField>
              <InlineField label="Level column" tooltip="Use this column as the level for logs">
                <Input value={'level'} />
              </InlineField>
              <InlineField label="Message column" tooltip="Use this column as the message for logs">
                <Input value={'message'} />
              </InlineField>
            </InlineFieldRow>
          </Collapse>
        )}
        <InlineFieldRow>
          <InlineField
            label="Hide empty columns"
            tooltip="Hide columns from the response where no row has a value for those columns"
          >
            <InlineSwitch value={settings.hideEmptyColumns} disabled={false} onChange={this.onHideEmptyColumnsChange} />
          </InlineField>
        </InlineFieldRow>
      </div>
    );
  }
}
