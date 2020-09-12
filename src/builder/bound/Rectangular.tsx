import React, { PureComponent } from 'react';
import { MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class Rectangular extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'minCoords', 'maxCoords']);
    const { builder } = props.options;
    builder.type = 'rectangular';
    if (undefined === builder.minCoords) {
      builder.minCoords = [];
    } else {
      this.multiSelectOptions.minCoords = this.buildMultiSelectOptions(builder.minCoords);
    }
    if (undefined === builder.maxCoords) {
      builder.maxCoords = [];
    } else {
      this.multiSelectOptions.maxCoords = this.buildMultiSelectOptions(builder.maxCoords);
    }
  }

  resetBuilder = (properties: string[]) => {
    const { builder } = this.props.options;
    for (let key of Object.keys(builder)) {
      if (!properties.includes(key)) {
        delete builder[key];
      }
    }
  };

  multiSelectOptions: Record<string, Array<SelectableValue<number>>> = { minCoords: [], maxCoords: [] };

  buildMultiSelectOptions = (values: number[]): Array<SelectableValue<number>> => {
    return values.map((key, index) => {
      return { value: key, label: String(key) };
    });
  };

  onSelectionChange = (component: string, options: Array<SelectableValue<number>>) => {
    this.selectOptions(component, options);
  };

  onCustomSelection = (component: string, selection: string) => {
    const value = Number(selection);
    if (isNaN(value)) {
      return;
    }
    const option: SelectableValue<number> = { value: value, label: selection };
    this.multiSelectOptions[component].push(option);
    this.selectOptions(component, this.multiSelectOptions[component]);
  };

  selectOptions = (component: string, opts: Array<SelectableValue<number>>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[component] = opts.map(o => o.value);
    this.multiSelectOptions[component] = this.buildMultiSelectOptions(builder[component]);
    onOptionsChange({ ...options, builder });
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
            <label className="gf-form-label">Minimum coordinates</label>
            <MultiSelect
              onChange={this.onSelectionChange.bind(this, 'minCoords')}
              onCreateOption={this.onCustomSelection.bind(this, 'minCoords')}
              options={this.multiSelectOptions.minCoords}
              value={builder.minCoords}
              allowCustomValue
            />
            <label className="gf-form-label">Maximum coordinates</label>
            <MultiSelect
              onChange={this.onSelectionChange.bind(this, 'maxCoords')}
              onCreateOption={this.onCustomSelection.bind(this, 'maxCoords')}
              options={this.multiSelectOptions.maxCoords}
              value={builder.maxCoords}
              allowCustomValue
            />
          </div>
        </div>
      </>
    );
  }
}
