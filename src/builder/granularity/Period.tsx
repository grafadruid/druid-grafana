import React, { PureComponent, ChangeEvent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const { FormField } = LegacyForms;

export class Period extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'period', 'timeZone', 'origin']);
    const { builder } = props.options;
    builder.type = 'period';
  }

  resetBuilder = (properties: string[]) => {
    const { builder } = this.props.options;
    if ('string' === typeof builder) {
      this.props.options.builder = {};
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

  onDateTimeChange = (date: Date) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder.origin = date.toISOString();
    onOptionsChange({ ...options, builder, settings });
  };

  parseDateTime = (date: string): Date | undefined => {
    let d = new Date(date);
    if (d instanceof Date && !isNaN(d.getFullYear())) {
      return d;
    }
    return undefined;
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
            <label className="gf-form-label">Origin</label>
            <DatePicker
              selected={this.parseDateTime(builder.origin)}
              onChange={this.onDateTimeChange}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
            />
          </div>
        </div>
      </>
    );
  }
}
