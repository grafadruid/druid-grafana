import React, { PureComponent, ChangeEvent, FormEvent } from 'react';
import { Checkbox, TextArea } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class Javascript extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'function', 'injective']);
    const { builder } = props.options;
    builder.type = 'javascript';
  }

  resetBuilder = (properties: string[]) => {
    const { builder } = this.props.options;
    for (let key of Object.keys(builder)) {
      if (!properties.includes(key)) {
        delete builder[key];
      }
    }
  };

  onInputChange = (event: FormEvent<HTMLTextAreaElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.function = event.currentTarget.value;
    onOptionsChange({ ...options, builder });
  };

  onCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.injective = event.currentTarget.checked;
    onOptionsChange({ ...options, builder });
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
            <label className="gf-form-label">Function</label>
            <TextArea
              name="function"
              placeholder="The javascript function. e.g: function(str) { return str.substr(0, 3); }"
              value={builder.function}
              onChange={this.onInputChange}
            />
            <Checkbox
              value={builder.injective}
              onChange={this.onCheckboxChange}
              label="Injective"
              description="Specifies if the JavaScript function preserves uniqueness."
            />
          </div>
        </div>
      </>
    );
  }
}
