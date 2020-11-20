import React, { PureComponent, ChangeEvent } from 'react';
import { QueryBuilderProps } from '../types';
import { css } from 'emotion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface State {
  start: Date | undefined;
  startPlaceholder: string;
  stop: Date | undefined;
  stopPlaceholder: string;
}

interface Props extends QueryBuilderProps {
  label: string;
}

export class Interval extends PureComponent<Props, State> {
  state: State = {
    start: undefined,
    startPlaceholder: '',
    stop: undefined,
    stopPlaceholder: '',
  };

  constructor(props: Props) {
    super(props);
    this.initializeState();
  }

  initializeState = () => {
    const [start, startPlaceholder] = this.parseDateTimeRange('start', this.props.options.builder);
    const [stop, stopPlaceholder] = this.parseDateTimeRange('stop', this.props.options.builder);
    this.state = {
      start: start,
      startPlaceholder: startPlaceholder,
      stop: stop,
      stopPlaceholder: stopPlaceholder,
    };
  };

  onDateTimeChangeRaw = (position: string, event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value && value.indexOf('$') !== -1) {
      this.updateRange(position, value);
      this.setState({ ...this.state, [position + 'Placeholder']: value, [position]: undefined });
    }
  };

  onDateTimeChange = (position: string, date: Date) => {
    if (null == date) {
      return;
    }
    this.setState({ ...this.state, [position + 'Placeholder']: '', [position]: date });
    this.updateRange(position, date.toISOString());
  };

  updateRange = (position: string, value: string) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    const index = Number(position !== 'start');
    let range = builder.split('/');
    if (1 === range.length) {
      range.push('');
    }
    range[index] = value;
    onOptionsChange({ ...options, builder: range.join('/') });
  };

  parseDateTimeRange = (position: string, dateRange: string): [Date | undefined, string] => {
    const index = Number(position !== 'start');
    let range = dateRange.split('/');
    if (1 === range.length) {
      range.push('');
    }
    const date = range[index];
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
    const { start, startPlaceholder, stop, stopPlaceholder } = this.state;
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
              selected={start}
              placeholderText={startPlaceholder}
              onChangeRaw={this.onDateTimeChangeRaw.bind(this, 'start')}
              onChange={this.onDateTimeChange.bind(this, 'start')}
              showTimeSelect
              dateFormat="MMMM d, yyyy h:mm aa"
            />
            <label className="gf-form-label">Stop</label>
            <DatePicker
              selected={stop}
              placeholderText={stopPlaceholder}
              onChangeRaw={this.onDateTimeChangeRaw.bind(this, 'stop')}
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
