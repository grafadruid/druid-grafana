import React, { PureComponent } from 'react';
import { QueryBuilderProps } from '../types';
import { css } from 'emotion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Props extends QueryBuilderProps {
  label: string;
}

export class Interval extends PureComponent<Props> {
  onDateTimeChange = (position: string, date: Date) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    const index = Number(position !== 'start');
    let range = builder.split('/');
    if (1 === range.length) {
      range.push('');
    }
    range[index] = date.toISOString();
    onOptionsChange({ ...options, builder: range.join('/') });
  };

  parseDateTimeRange = (position: string, dateRange: string): Date | undefined => {
    const index = Number(position !== 'start');
    let range = dateRange.split('/');
    if (1 === range.length) {
      range.push('');
    }
    const date = range[index];
    let d = new Date(date);
    if (d instanceof Date && !isNaN(d.getFullYear())) {
      return d;
    }
    return undefined;
  };

  render() {
    const { label, options } = this.props;
    const { builder } = options;

    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 300px;
            `}
          >
            <label className="gf-form-label">{label}</label>
            <label className="gf-form-label">Start</label>
            <DatePicker
              selected={this.parseDateTimeRange('start', builder)}
              onChange={this.onDateTimeChange.bind(this, 'start')}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
            />
            <label className="gf-form-label">Stop</label>
            <DatePicker
              selected={this.parseDateTimeRange('stop', builder)}
              onChange={this.onDateTimeChange.bind(this, 'stop')}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
            />
          </div>
        </div>
      </>
    );
  }
}
