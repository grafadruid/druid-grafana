import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

import {
  Arithmetic,
  Constant,
  DoubleGreatest,
  DoubleLeast,
  FieldAccess,
  FinalizingFieldAccess,
  HyperUniqueCardinality,
  Javascript,
  LongGreatest,
  LongLeast,
} from './';

import { QueryBuilderProps, QueryBuilderOptions } from '../types';

interface State {
  selectedOption: SelectableValue<string>;
}

export class PostAggregation extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    selectedOption: {},
  };

  constructor(props: QueryBuilderProps) {
    super(props);

    this.selectOptions = this.buildSelectOptions([
      'Arithmetic',
      'Constant',
      'DoubleGreatest',
      'DoubleLeast',
      'FieldAccess',
      'FinalizingFieldAccess',
      'HyperUniqueCardinality',
      'Javascript',
      'LongGreatest',
      'LongLeast',
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
          <label className="gf-form-label">Post aggregation</label>
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
          {selectedOption.value === 'arithmetic' && (
            <Arithmetic options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'constant' && (
            <Constant options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doublegreatest' && (
            <DoubleGreatest options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'doubleleast' && (
            <DoubleLeast options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'fieldaccess' && (
            <FieldAccess options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'finalizingfieldaccess' && (
            <FinalizingFieldAccess options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'hyperuniquecardinality' && (
            <HyperUniqueCardinality options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'javascript' && (
            <Javascript options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'longgreatest' && (
            <LongGreatest options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'longleast' && (
            <LongLeast options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
        </div>
      </>
    );
  }
}
