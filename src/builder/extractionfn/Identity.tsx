import React, { PureComponent } from 'react';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class Identity extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type']);
    const { builder } = props.options;
    builder.type = 'identity';
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
            Identity. Whatever it does.
          </div>
        </div>
      </>
    );
  }
}
