import { PureComponent } from 'react';
import { QueryBuilderProps } from '../types';

export class StrLen extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    const { options, onOptionsChange } = props;
    const { builder } = options;
    builder.type = 'strlen';
    onOptionsChange({ ...options, builder: builder });
  }
  render() {
    return null;
  }
}
