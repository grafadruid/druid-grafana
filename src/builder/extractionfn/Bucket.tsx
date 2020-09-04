import React, { PureComponent, ChangeEvent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Bucket extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'size', 'offset']);
    const { builder } = props.options;
    builder.type = 'bucket';
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
    builder[event.target.name] = event.target.value;
    onOptionsChange({ ...options, builder: builder });
  };

  render() {
    const { builder } = this.props.options;
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 250px;
            `}
          >
            <FormField
              label="Size"
              name="size"
              type="number"
              placeholder="the size of the buckets"
              value={builder.size}
              onChange={this.onInputChange}
            />
            <FormField
              label="Offset"
              name="offset"
              type="number"
              placeholder="the offset for the buckets"
              value={builder.offset}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
