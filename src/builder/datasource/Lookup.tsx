import React, { PureComponent, ChangeEvent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

const { FormField } = LegacyForms;

export class Lookup extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'lookup']);
    const { builder } = props.options;
    builder.type = 'lookup';
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
    const value = event.target.value;
    switch (event.target.name) {
      case 'lookup': {
        builder.lookup = value;
        break;
      }
    }
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
              label="Lookup"
              name="lookup"
              type="text"
              placeholder="the lookup table name"
              value={builder.lookup}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
