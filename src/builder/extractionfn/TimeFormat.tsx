import React, { PureComponent, ChangeEvent } from 'react';
import { Checkbox, LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { Granularity } from '../granularity';

const { FormField } = LegacyForms;

export class TimeFormat extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'format', 'timeZone', 'locale', 'granularity', 'asMillis']);
    const { builder } = props.options;
    builder.type = 'timeFormat';
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
    console.log(event.currentTarget);
    builder.asMillis = event.currentTarget.checked;
    onOptionsChange({ ...options, builder });
  };

  onOptionsChange = (component: string, componentBuilderOptions: QueryBuilderOptions) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder[component] = componentBuilderOptions.builder;
    onOptionsChange({ ...options, builder, settings });
  };

  builderOptions = (component: string): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    return { builder: builder[component] || {}, settings: settings || {} };
  };

  render() {
    const { builder } = this.props.options;
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 500px;
            `}
          >
            <FormField
              label="Format"
              name="format"
              type="text"
              placeholder="The format"
              value={builder.format}
              onChange={this.onInputChange}
            />
            <FormField
              label="Time zone"
              name="timeZone"
              type="text"
              placeholder="The time zone"
              value={builder.timeZone}
              onChange={this.onInputChange}
            />
            <FormField
              label="Locale"
              name="locale"
              type="text"
              placeholder="The locale"
              value={builder.locale}
              onChange={this.onInputChange}
            />
            <Checkbox
              value={builder.asMillis}
              onChange={this.onCheckboxChange}
              label="As millis"
              description="Treat input strings as millis rather than ISO8601 strings"
            />
            <Granularity
              options={this.builderOptions('granularity')}
              onOptionsChange={this.onOptionsChange.bind(this, 'granularity')}
            />
          </div>
        </div>
      </>
    );
  }
}
