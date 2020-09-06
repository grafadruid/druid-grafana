import React, { PureComponent, ChangeEvent } from 'react';
import { Checkbox, LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Time extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'timeFormat', 'resultFormat', 'joda']);
    const { builder } = props.options;
    builder.type = 'time';
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

  onCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.joda = event.currentTarget.checked;
    onOptionsChange({ ...options, builder });
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
              label="Time format"
              name="timeFormat"
              type="text"
              placeholder="the time format"
              value={builder.timeFormat}
              onChange={this.onInputChange}
            />
            <FormField
              label="Result format"
              name="resultFormat"
              type="text"
              placeholder="the result format"
              value={builder.resultFormat}
              onChange={this.onInputChange}
            />
            <Checkbox
              value={builder.joda}
              onChange={this.onCheckboxChange}
              label="Joda"
              description="Specifies if joda format is used."
            />
          </div>
        </div>
      </>
    );
  }
}
