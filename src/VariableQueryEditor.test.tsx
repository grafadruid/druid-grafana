import { Field, FieldSet, Switch } from '@grafana/ui';
import { shallow } from 'enzyme';
import * as React from 'react';

import { VariableQueryEditor } from './VariableQueryEditor';

describe('VariableQueryEditor', function () {
  const fakeProps = {
    query: {
      builder: {
        query: 'SELECT DISTINCT countryName FROM wikipedia WHERE countryName IS NOT NULL',
        queryType: 'sql',
      },
      settings: { contextParameters: [{ name: 'AA', value: 'BB' }], format: 'wide' },
      expr:
        '{"builder":{"query":"SELECT DISTINCT countryName FROM wikipedia WHERE countryName IS NOT NULL","queryType":"sql"},"settings":{"contextParameters":[{"name":"AA","value":"BB"}],"format":"wide"}}',
      refId: '',
    },
    onChange() {},
    css: '',
  };
  describe('when initialized', () => {
    it('should render without basic authentication', function () {
      const wrapper = shallow(<VariableQueryEditor {...fakeProps} />);
      console.log(wrapper.debug());
      expect(wrapper.find(FieldSet)).toHaveLength(0);
      expect(wrapper.find(Field)).toHaveLength(0);
      expect(wrapper.find(Switch)).toHaveLength(0);
    });
  });
});
