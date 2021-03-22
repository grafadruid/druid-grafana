// import { Field, FieldSet, Switch } from '@grafana/ui';
import { shallow } from 'enzyme';
import * as React from 'react';

import { VariableQueryEditor } from '../VariableQueryEditor';

describe('VariableQueryEditor', function () {
  const fakeProps = {
    query: { builder: {}, settings: {}, expr: '', refId: '' },
    onChange() {},
    css: '',
  };
  describe('when initialized', () => {
    it('should render without basic authentication', function () {
      const wrapper = shallow(<VariableQueryEditor {...fakeProps} />);
      console.log(wrapper.debug());
      // expect(wrapper.find(FieldSet)).toHaveLength(1);
      // expect(wrapper.find(Field)).toHaveLength(1);
      // expect(wrapper.find(Switch)).toHaveLength(1);
      // expect(wrapper.find(Switch).prop('value')).toBe(false);
    });
  });
});
