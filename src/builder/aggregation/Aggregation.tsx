import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

import {
  Cardinality,
  Count,
  DoubleAny,
  DoubleFirst,
  DoubleLast,
  DoubleMax,
  DoubleMean,
  DoubleMin,
  DoubleSum,
  Filtered,
  FloatAny,
  FloatFirst,
  FloatLast,
  FloatMax,
  FloatMin,
  FloatSum,
  Histogram,
  HyperUnique,
  Javascript,
  LongAny,
  LongFirst,
  LongLast,
  LongMax,
  LongMin,
  LongSum,
  StringAny,
  StringFirstFolding,
  StringFirst,
  StringLastFolding,
  StringLast,
} from './';

import { QueryBuilderProps, QueryBuilderOptions } from '../types';

interface State {
  selectedOption: SelectableValue<string>;
}

export class Aggregation extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    selectedOption: {},
  };

  constructor(props: QueryBuilderProps) {
    super(props);

    this.selectOptions = this.buildSelectOptions([
      'Cardinality',
      'Count',
      'DoubleAny',
      'DoubleFirst',
      'DoubleLast',
      'DoubleMax',
      'DoubleMean',
      'DoubleMin',
      'DoubleSum',
      'Filtered',
      'FloatAny',
      'FloatFirst',
      'FloatLast',
      'FloatMax',
      'FloatMin',
      'FloatSum',
      'Histogram',
      'HyperUnique',
      'Javascript',
      'LongAny',
      'LongFirst',
      'LongLast',
      'LongMax',
      'LongMin',
      'LongSum',
      'StringAny',
      'StringFirstFolding',
      'StringFirst',
      'StringLastFolding',
      'StringLast',
    ]);

    const { builder } = props.options;

    if (undefined !== builder.type) {
      const selectedOption = this.selectOptionByValue(builder.type);
      if (null !== selectedOption) {
        this.state.selectedOption = selectedOption;
      }
    }
  }

  resetBuilder = () => {
    const { options, onOptionsChange } = this.props;
    options.builder = null;
    onOptionsChange(options);
  };

  onSelectionChange = (option: SelectableValue<string>) => {
    this.selectOption(option);
  };

  onCustomSelection = (selection: string) => {
    const option: SelectableValue<string> = { value: selection.toLowerCase(), label: selection };
    this.selectOptions.push(option);
    this.selectOption(option);
  };

  selectOption = (option: SelectableValue<string>) => {
    if (option === null) {
      option = {} as SelectableValue;
      this.resetBuilder();
    }
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
    const options = this.selectOptions.filter((option) => option.value === value.toLowerCase());
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
          <label className="gf-form-label">Aggregation</label>
          <div
            className={css`
              width: 300px;
            `}
          >
            <Select
              options={this.selectOptions}
              value={selectedOption}
              allowCustomValue
              onChange={this.onSelectionChange}
              onCreateOption={this.onCustomSelection}
              isClearable={true}
            />
          </div>
        </div>
        <div>
          {selectedOption.value === 'cardinality' && (
            <Cardinality options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'count' && (
            <Count options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doubleany' && (
            <DoubleAny options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doublefirst' && (
            <DoubleFirst options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doublelast' && (
            <DoubleLast options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doublemax' && (
            <DoubleMax options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doublemean' && (
            <DoubleMean options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doublemin' && (
            <DoubleMin options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doublesum' && (
            <DoubleSum options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'filtered' && (
            <Filtered options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'floatany' && (
            <FloatAny options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'floatfirst' && (
            <FloatFirst options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'floatlast' && (
            <FloatLast options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'floatmax' && (
            <FloatMax options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'floatmin' && (
            <FloatMin options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'floatsum' && (
            <FloatSum options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'histogram' && (
            <Histogram options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'hyperunique' && (
            <HyperUnique options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'javascript' && (
            <Javascript options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'longany' && (
            <LongAny options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'longfirst' && (
            <LongFirst options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'longlast' && (
            <LongLast options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'longmax' && (
            <LongMax options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'longmin' && (
            <LongMin options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'longsum' && (
            <LongSum options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'stringany' && (
            <StringAny options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'stringfirstfolding' && (
            <StringFirstFolding options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'stringfirst' && (
            <StringFirst options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'stringlastfolding' && (
            <StringLastFolding options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'stringlast' && (
            <StringLast options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
        </div>
      </>
    );
  }
}
