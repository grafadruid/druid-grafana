import React, { PureComponent, FormEvent, ChangeEvent } from 'react';
import { TextArea, LegacyForms } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps, QueryBuilderOptions } from '../types';
import { ExtractionFn } from '../extractionfn';

const { FormField } = LegacyForms;

export class Javascript extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'dimension', 'function', 'extractionFn']);
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

  onInputChange = (event: FormEvent<HTMLTextAreaElement> | ChangeEvent<HTMLInputElement>) => {
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder[event.currentTarget.name] = event.currentTarget.value;
    onOptionsChange({ ...options, builder: builder });
  };

  onOptionsChange = (component: string, componentBuilderOptions: QueryBuilderOptions) => {
    const { options, onOptionsChange } = this.props;
    const { builder, settings } = options;
    builder[component] = componentBuilderOptions.builder;
    onOptionsChange({ ...options, builder, settings });
  };

  builderOptions = (component: string): QueryBuilderOptions => {
    const { builder, settings } = this.props.options;
    return { builder: builder[component] || {}, settings: settings || {} };
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
            <FormField
              label="Dimension"
              name="dimension"
              type="text"
              placeholder="the dimension name"
              value={builder.dimension}
              onChange={this.onInputChange}
            />
            <label className="gf-form-label">Function</label>
            <TextArea
              name="function"
              placeholder="The javascript function. e.g: function(x) { return(x >= 'bar' && x <= 'foo') }"
              value={builder.function}
              onChange={this.onInputChange}
            />
            <ExtractionFn
              options={this.builderOptions('extractionFn')}
              onOptionsChange={this.onOptionsChange.bind(this, 'extractionFn')}
            />
          </div>
        </div>
      </>
    );
  }
}
