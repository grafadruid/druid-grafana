import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class All extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type']);
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.type = 'all';
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
            All columns should be included in the result
          </div>
        </div>
      </>
    );
  }
}
