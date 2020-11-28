import React, { PureComponent, ChangeEvent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { DateTime } from '../date';

const { FormField } = LegacyForms;

export class Period extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'period', 'timeZone', 'origin']);
    const { builder } = props.options;
    builder.type = 'period';
  }

  resetBuilder = (properties: string[]) => {
    let { builder } = this.props.options;
    if ('string' === typeof builder) {
      builder = null;
    } else {
      for (let key of Object.keys(builder)) {
        if (!properties.includes(key)) {
          delete builder[key];
        }
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
              width: 300px;
            `}
          >
            <FormField
              label="Period"
              name="period"
              type="text"
              placeholder="The period in ISO8601 format (e.g. P2W, P3M, PT1H30M, PT0.750S)"
              value={builder.period}
              onChange={this.onInputChange}
            />
            <FormField
              label="Timezone"
              name="timeZone"
              type="text"
              placeholder="The timezone (e.g. Europe/Paris)"
              value={builder.timeZone}
              onChange={this.onInputChange}
            />
            <DateTime
              label="Origin"
              options={this.builderOptions('origin')}
              onOptionsChange={this.onOptionsChange.bind(this, 'origin')}
            />
          </div>
        </div>
      </>
    );
  }
}
