import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import {
  Bucket,
  Cascade,
  Identity,
  Javascript,
  Lookup,
  Lower,
  Partial,
  Regex,
  StringFormat,
  StrLen,
  Substring,
  TimeFormat,
  Time,
  Upper,
} from './';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';

interface State {
  selectedOption: SelectableValue<string>;
}

export class ExtractionFn extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    selectedOption: {},
  };

  constructor(props: QueryBuilderProps) {
    super(props);

    this.selectOptions = this.buildSelectOptions([
      'Bucket',
      'Cascade',
      'Identity',
      'Javascript',
      'Lookup',
      'Lower',
      'Partial',
      'Regex',
      'StringFormat',
      'StrLen',
      'Substring',
      'TimeFormat',
      'Time',
      'Upper',
    ]);

    const { builder } = props.options;

    if (undefined !== builder.type) {
      const selectedOption = this.selectOptionByValue(builder.type);
      if (null !== selectedOption) {
        this.state.selectedOption = selectedOption;
      }
    }
  }

  onSelectionChange = (option: SelectableValue<string>) => {
    this.selectOption(option);
  };

  onCustomSelection = (selection: string) => {
    const option: SelectableValue<string> = { value: selection.toLowerCase(), label: selection };
    this.selectOptions.push(option);
    this.selectOption(option);
  };

  selectOption = (option: SelectableValue<string>) => {
    this.setState({ selectedOption: option });
  };

  onOptionsChange = (options: QueryBuilderOptions) => {
    const { onOptionsChange } = this.props;
    onOptionsChange(options);
  };

  selectOptions: Array<SelectableValue<string>> = [];

  buildSelectOptions = (values: string[]): Array<SelectableValue<string>> => {
    return values.map((key, index) => {
      return { label: key, value: key.toLowerCase() };
    });
  };

  selectOptionByValue = (value: string): SelectableValue<string> | null => {
    const options = this.selectOptions.filter(option => option.value === value.toLowerCase());
    if (options.length > 0) {
      return options[0];
    }
    return null;
  };

  builderOptions = (): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    return { builder: builder || {}, settings: settings || {} };
  };

  render() {
    const { selectedOption } = this.state;
    const builderOptions = this.builderOptions();
    return (
      <>
        <div className="gf-form">
          <label className="gf-form-label">Extraction function</label>
          <div
            className={css`
              width: 250px;
            `}
          >
            <Select
              options={this.selectOptions}
              value={selectedOption}
              allowCustomValue
              onChange={this.onSelectionChange}
              onCreateOption={this.onCustomSelection}
            />
          </div>
        </div>
        <div>
          {selectedOption.value === 'bucket' && (
            <Bucket options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'cascade' && (
            <Cascade options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'identity' && (
            <Identity options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'javascript' && (
            <Javascript options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'lookup' && (
            <Lookup options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'lower' && (
            <Lower options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'partial' && (
            <Partial options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'regex' && (
            <Regex options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'stringformat' && (
            <StringFormat options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'strlen' && (
            <StrLen options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'substring' && (
            <Substring options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'timeformat' && (
            <TimeFormat options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'time' && <Time options={builderOptions} onOptionsChange={this.onOptionsChange} />}
          {selectedOption.value === 'upper' && (
            <Upper options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
        </div>
      </>
    );
  }
}
