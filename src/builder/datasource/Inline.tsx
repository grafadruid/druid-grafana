import React, { PureComponent, FormEvent } from 'react';
import { TextArea } from '@grafana/ui';
import { css } from 'emotion';
import { QueryBuilderProps } from '../types';

export class Inline extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    this.resetBuilder(['type', 'columnNames', 'columnTypes', 'rows']);
    const { builder } = props.options;
    builder.type = 'inline';
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
    const [names, types, rows] = this.decodeInline(event.currentTarget.value);
    const { options, onOptionsChange } = this.props;
    const { builder } = options;
    builder.columnNames = names;
    builder.columnTypes = types;
    builder.rows = rows;
    onOptionsChange({ ...options, builder });
  };

  inline = '';

  encodeInline = (): string => {
    if ('' !== this.inline) {
      return this.inline;
    }
    const { builder } = this.props.options;
    const names = builder.columnNames;
    const types = builder.columnTypes;
    const rows = builder.rows;
    let inline = '';
    if (undefined !== names && names.length > 0) {
      for (let i in names) {
        inline += names[i] + ':' + types[i] + ',';
      }
      inline = inline.slice(0, -1) + '\n';
      for (let row of rows) {
        for (let col of row) {
          inline += col + ',';
        }
        inline = inline.slice(0, -1) + '\n';
      }
    }
    return inline;
  };

  decodeInline = (inline: string): [string[], string[], string[][]] => {
    this.inline = inline;
    const lines = inline.split('\n');
    const header = lines[0];
    const fields = header.split(',');
    let names = [];
    let types = [];
    let rows = [];
    for (let field of fields) {
      let name_type = field.split(':');
      if (name_type[0] !== '' && name_type[1] !== undefined) {
        names.push(name_type[0]);
        types.push(name_type[1]);
      }
    }
    for (let line of lines.slice(1)) {
      rows.push(line.split(','));
    }
    return [names, types, rows];
  };

  render() {
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 250px;
            `}
          >
            <label className="gf-form-label">Data</label>
            <TextArea
              name="inline"
              placeholder="the inline datasource CSV-like formated. header line should be formated like 'label:string,weight:float'. e.g: 'label:string,weight:float\nexample,10.3'"
              value={this.encodeInline()}
              onChange={this.onInputChange}
            />
          </div>
        </div>
      </>
    );
  }
}
