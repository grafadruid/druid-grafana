import { Field, FieldSet, Switch } from '@grafana/ui';
import { shallow } from 'enzyme';
import * as React from 'react';

import { DruidAuthSettings } from '../DruidAuthSettings';
import { ConnectionSettingsProps } from '../types';

describe('A suite', function () {
  const fakeProps: ConnectionSettingsProps = {
    options: {
      settings: {
        basicAuth: true,
      },
      secretSettings: {},
      secretSettingsFields: {},
    },
    onOptionsChange() {},
  };
  it('should render without throwing an error', function () {
    const wrapper = shallow(<DruidAuthSettings {...fakeProps} />);
    console.log(wrapper.debug());

    expect(wrapper.find(FieldSet)).toHaveLength(1);
    expect(wrapper.find(Field)).toHaveLength(1);
    expect(wrapper.find(Switch)).toHaveLength(1);
    const x = wrapper.find(Switch);
    expect(x.find('.value')).toBeTruthy();
    // expect(shallow(<DruidAuthSettings {...fakeProps} />).contains(<div className="DruidAuthSettings">Bar</div>)).toBe(
    // true
  });
});

// it('should be selectable by class "DruidAuthSettings"', function () {
//   expect(shallow(<DruidAuthSettings />).is('.DruidAuthSettings')).toBe(true);
// });

// it('should mount in a full DOM', function () {
//   expect(mount(<DruidAuthSettings />).find('.DruidAuthSettings').length).toBe(1);
// });

// it('should render to static HTML', function () {
//   expect(render(<DruidAuthSettings />).text()).toEqual('Bar');
// });
