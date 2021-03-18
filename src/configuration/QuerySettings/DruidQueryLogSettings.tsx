import React, { PureComponent, ChangeEvent } from 'react';
import { FieldSet, LegacyForms, Collapse } from '@grafana/ui';
import { QuerySettingsProps } from './types';

const { FormField } = LegacyForms;

export class DruidQueryLogSettings extends PureComponent<QuerySettingsProps> {
  constructor(props: QuerySettingsProps) {
    super(props);

    const { settings } = this.props.options;

    if (settings.logColumnTime === undefined) {
      settings.logColumnTime = '__time';
    }
    if (settings.logColumnLevel === undefined) {
      settings.logColumnLevel = 'level';
    }
    if (settings.logColumnMessage === undefined) {
      settings.logColumnMessage = 'message';
    }
  }

  onInputChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { settings } = options;
    const value = event.target.value;
    switch (event.target.name) {
      case 'time': {
        settings.logColumnTime = value;
        break;
      }
      case 'level': {
        settings.logColumnLevel = value;
        break;
      }
      case 'message': {
        settings.logColumnMessage = value;
        break;
      }
    }
    onOptionsChange({ ...options, settings: settings });
  };

  render() {
    const { settings } = this.props.options;
    return (
      <Collapse label="Log column settings" isOpen={true}>
        <FieldSet>
          <FormField
            label="Time"
            name="time"
            type="text"
            tooltip="Set the column logs will use as the time for each row"
            value={settings.logColumnTime}
            onChange={this.onInputChanged}
          />
          <FormField
            label="Level"
            name="level"
            type="text"
            tooltip="Set the column logs will use as the level for each row"
            value={settings.logColumnLevel}
            onChange={this.onInputChanged}
          />
          <FormField
            label="Message"
            name="message"
            type="text"
            tooltip="Set the column logs will use as the message for each row"
            value={settings.logColumnMessage}
            onChange={this.onInputChanged}
          />
        </FieldSet>
      </Collapse>
    );
  }
}
