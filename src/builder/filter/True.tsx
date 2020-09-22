import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class True extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type']);
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.type = 'true';
    onOptionsChange({ ...options, builder: builder });
  }

  resetBuilder = (properties: string[]) => {
    const { builder } = this.props.options;
    for (let key of Object.keys(builder)) {
      if (!properties.includes(key)) {
        delete builder[key];
      }
    }
  };

  render() {
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 300px;
            `}
          >
            The true filter is a filter which matches all values. It can be used to temporarily disable other filters
            without removing the filter.
          </div>
        </div>
      </>
    );
  }
}
