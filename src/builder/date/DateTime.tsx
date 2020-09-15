import React, { PureComponent } from 'react';
import { QueryBuilderProps } from '../types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Props extends QueryBuilderProps {
  label: string;
}

export class DateTime extends PureComponent<Props> {
  onDateTimeChange = (date: Date) => {
    const { options, onOptionsChange } = this.props;
    onOptionsChange({ ...options, builder: date.toISOString() });
  };

  parseDateTime = (date: string): Date | undefined => {
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
        <label className="gf-form-label">{label}</label>
        <DatePicker
          selected={this.parseDateTime(builder)}
          onChange={this.onDateTimeChange}
          showTimeSelect
          dateFormat="MMMM d, yyyy h:mm aa"
        />
      </>
    );
  }
}
