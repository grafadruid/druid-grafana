import React, { PureComponent, FormEvent } from 'react';
import { css } from 'emotion';
import { TextArea } from '@grafana/ui';
import { QueryBuilderProps } from '../types';

interface State {
  json: string;
}

export class Json extends PureComponent<QueryBuilderProps, State> {
  state: State = {
    json: '',
  };

  constructor(props: QueryBuilderProps) {
    super(props);
    this.state.json = JSON.stringify(props.options.builder, null, 2);
  }

  onInputChange = (event: FormEvent<HTMLTextAreaElement>) => {
    let json = event.currentTarget.value;
    this.setState({ json: json });
    try {
      const { options, onOptionsChange } = this.props;
      onOptionsChange({ ...options, builder: JSON.parse(json) });
    } catch (e) {}
  };

  render() {
    const { json } = this.state;
    return (
      <>
        <div className="gf-form">
          <div
            className={css`
              width: 300px;
            `}
          >
            <label className="gf-form-label">JSON query</label>
            <TextArea name="query" placeholder="The JSON query" value={json} onChange={this.onInputChange} />
          </div>
        </div>
      </>
    );
  }
}
