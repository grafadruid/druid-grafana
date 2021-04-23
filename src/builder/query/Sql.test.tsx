// import { Field, FieldSet, Switch } from '@grafana/ui';
import { shallow } from 'enzyme';
import * as React from 'react';

import { Sql } from './Sql';

describe('Sql', function () {
  const fakeProps = {
    options: {
      builder: {
        query: 'SELECT DISTINCT countryName FROM wikipedia WHERE countryName IS NOT NULL',
        queryType: 'sql',
      },
      settings: {
        contextParameters: [
          {
            name: 'AA',
            value: 'BB',
          },
        ],
        format: 'wide',
      },
    },
    onchange() {},
    onOptionsChange() {},
  };
  describe('when initialized', () => {
    it('should render without basic authentication', function () {
      const wrapper = shallow(<Sql {...fakeProps} />);
      console.log(wrapper.debug());
      // expect(wrapper.find(FieldSet)).toHaveLength(1);
      // expect(wrapper.find(Field)).toHaveLength(1);
      // expect(wrapper.find(Switch)).toHaveLength(1);
      // expect(wrapper.find(Switch).prop('value')).toBe(false);
    });
  });
});
