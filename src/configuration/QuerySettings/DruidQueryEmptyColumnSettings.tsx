import React, { PureComponent, ChangeEvent } from 'react';
import { InlineField, Switch } from '@grafana/ui';
import { QuerySettingsProps } from './types';

export class DruidQueryEmptyColumnSettings extends PureComponent<QuerySettingsProps> {
  constructor(props: QuerySettingsProps) {
    super(props);

    const { settings } = this.props.options;

    if (settings.hideEmptyColumns === undefined) {
      settings.hideEmptyColumns = true;
    }
  }

  onSettingChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { settings } = options;
    settings.hideEmptyColumns = event!.currentTarget.checked;
    onOptionsChange({ ...options, settings: settings });
  };

  render() {
    const { settings } = this.props.options;
    return (
      <div className={'gf-form-group'}>
        <h3 className="page-heading">Column Options</h3>
        <InlineField label="Hide empty columns">
          <Switch value={settings.hideEmptyColumns} onChange={this.onSettingChange} />
        </InlineField>
      </div>
    );
  }
}
