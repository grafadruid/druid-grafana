import React, { PureComponent, ChangeEvent } from 'react';
import { MultiSelect, LegacyForms } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Radius extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'coords', 'radius']);
    const { builder } = props.options;
    builder.type = 'radius';
    if (undefined === builder.coords) {
      builder.coords = [];
    } else {
      this.multiSelectOptions.coords = this.buildMultiSelectOptions(builder.coords);
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

  multiSelectOptions: Record<string, Array<SelectableValue<number>>> = { coords: [] };

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
    builder[component] = opts.map((o) => o.value);
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
            <label className="gf-form-label">Coordinates</label>
            <MultiSelect
              onChange={this.onSelectionChange.bind(this, 'coords')}
              onCreateOption={this.onCustomSelection.bind(this, 'coords')}
              options={this.multiSelectOptions.coords}
              value={builder.coords}
              allowCustomValue
            />
            <FormField
              label="Radius"
              name="radius"
              type="number"
              placeholder="The float radius value"
              value={builder.radius}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
