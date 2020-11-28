import { PureComponent } from 'react';
import { QueryBuilderProps } from '../types';

export class Lexicographic extends PureComponent<QueryBuilderProps> {
  constructor(props: QueryBuilderProps) {
    super(props);
    const { options, onOptionsChange } = props;
    const { builder } = options;
    builder.type = 'lexicographic';
    onOptionsChange({ ...options, builder: builder });
  }
  render() {
    return null;
  }
}
