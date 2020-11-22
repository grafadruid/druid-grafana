import React, { PureComponent, ChangeEvent } from 'react';
import { QueryBuilderProps } from '../types';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface State {
  date: Date | undefined;
  datePlaceholder: string;
}

interface Props extends QueryBuilderProps {
  label: string;
}

export class DateTime extends PureComponent<Props, State> {
  state: State = {
    date: undefined,
    datePlaceholder: '',
  };

  constructor(props: Props) {
    super(props);
    this.initializeState();
  }

  initializeState = () => {
    const { builder } = this.props.options;
    let dateTime = '';
    if (typeof builder === 'string') {
      dateTime = builder;
    }
    const [date, datePlaceholder] = this.parseDateTime(dateTime);
    this.state = {
      date: date,
      datePlaceholder: datePlaceholder,
    };
  };

  onDateTimeChangeRaw = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value && value.indexOf('$') !== -1) {
      this.updateDate(value);
      this.setState({ ...this.state, datePlaceholder: value, date: undefined });
    }
  };

  onDateTimeChange = (date: Date) => {
    if (null == date) {
      return;
    }
    this.setState({ ...this.state, datePlaceholder: '', date: date });
    this.updateDate(date.toISOString());
  };

  updateDate = (value: string) => {
    const { options, onOptionsChange } = this.props;
    onOptionsChange({ ...options, builder: value });
  };

  parseDateTime = (date: string): [Date | undefined, string] => {
    if (date.indexOf('$') !== -1) {
      return [undefined, date];
    } else {
      let d = new Date(date);
      if (d instanceof Date && !isNaN(d.getFullYear())) {
        return [d, ''];
      }
    }
    return [undefined, ''];
  };

  render() {
    const { label } = this.props;
    const { date, datePlaceholder } = this.state;

    return (
      <>
        <label className="gf-form-label">{label}</label>
        <DatePicker
          selected={date}
          placeholderText={datePlaceholder}
          onChangeRaw={this.onDateTimeChangeRaw}
          onChange={this.onDateTimeChange}
          showTimeSelect
          dateFormat="MMMM d, yyyy h:mm aa"
        />
      </>
    );
  }
}
