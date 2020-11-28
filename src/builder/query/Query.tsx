import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

import {
  DatasourceMetadata,
  GroupBy,
  Json,
  Scan,
  Search,
  SegmentMetadata,
  Sql,
  TimeBoundary,
  Timeseries,
  TopN,
} from './';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';

interface State {
  selectedOption: SelectableValue<string>;
}

export class Query extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    selectedOption: {},
  };

  constructor(props: QueryBuilderProps) {
    super(props);

    this.selectOptions = this.buildSelectOptions([
      'DatasourceMetadata',
      'GroupBy',
      'Json',
      'Scan',
      'Search',
      'SegmentMetadata',
      'Sql',
      'TimeBoundary',
      'Timeseries',
      'TopN',
    ]);

    const { builder } = props.options;

    if (undefined !== builder.queryType) {
      const selectedOption = this.selectOptionByValue(builder.queryType);
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
          <label className="gf-form-label">Query</label>
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
          {selectedOption.value === 'datasourcemetadata' && (
            <DatasourceMetadata options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'groupby' && (
            <GroupBy options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'json' && <Json options={builderOptions} onOptionsChange={this.onOptionsChange} />}
          {selectedOption.value === 'scan' && <Scan options={builderOptions} onOptionsChange={this.onOptionsChange} />}
          {selectedOption.value === 'search' && (
            <Search options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'segmentmetadata' && (
            <SegmentMetadata options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'sql' && <Sql options={builderOptions} onOptionsChange={this.onOptionsChange} />}
          {selectedOption.value === 'timeboundary' && (
            <TimeBoundary options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'timeseries' && (
            <Timeseries options={builderOptions} onOptionsChange={this.onOptionsChange} />
          )}
          {selectedOption.value === 'topn' && <TopN options={builderOptions} onOptionsChange={this.onOptionsChange} />}
        </div>
      </>
    );
  }
}
