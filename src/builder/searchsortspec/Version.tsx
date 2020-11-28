import { PureComponent } from 'react';
import { QueryBuilderProps } from '../types';

export class Version extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    const { options, onOptionsChange } = props;
    const { builder } = options;
    builder.type = 'version';
    onOptionsChange({ ...options, builder: builder });
  }
  render() {
    return null;
  }
}
