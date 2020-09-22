import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class False extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type']);
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.type = 'false';
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
            The false filter is a filter which matches no value. It can be used to temporarily disable other filters
            without removing the filter.
          </div>
        </div>
      </>
    );
  }
}
