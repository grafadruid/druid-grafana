import React, { PureComponent } from 'react';
import { TabsBar, Tab, TabContent, IconName } from '@grafana/ui';
import { SelectableValue, QueryEditorProps } from '@grafana/data';

import { DruidDataSource } from './DruidDataSource';
import { DruidSettings, DruidQuery } from './types';

import { DruidQueryContextSettings } from './configuration/QuerySettings';
import { QuerySettingsOptions } from './configuration/QuerySettings/types';

import { DruidQueryBuilder } from './builder/';
import { QueryBuilderOptions } from './builder/types';

enum Tabs {
  Builder,
  Settings,
}

interface Props extends QueryEditorProps<DruidDataSource, DruidQuery, DruidSettings> {}

interface State {
  activeTab: Tabs;
}

export class QueryEditor extends PureComponent<Props, State> {
  state: State = {
    activeTab: Tabs.Builder,
  };

  onSelectTab = (item: SelectableValue<Tabs>) => {
    this.setState({ activeTab: item.value! });
  };

  onBuilderOptionsChange = (queryBuilderOptions: QueryBuilderOptions) => {
    console.log('Builder option has changed');
    const { query, onChange } = this.props;
    onChange({ ...query, ...queryBuilderOptions });
    console.log(query, this.props);
  };

  onSettingsOptionsChange = (querySettingsOptions: QuerySettingsOptions) => {
    console.log('Settings option has changed');
    const { query, onChange } = this.props;
    onChange({ ...query, ...querySettingsOptions });
    console.log(query, this.props);
  };

  builderOptions = (): QueryBuilderOptions => {
    const { builder, settings } = this.props.query;
    return { builder: builder || {}, settings: settings || {} };
  };
  settingsOptions = (): QuerySettingsOptions => {
    const { settings } = this.props.query;
    return { settings: settings || {} };
  };

  render() {
    const builderOptions = this.builderOptions();
    const settingsOptions = this.settingsOptions();

    const BuilderTab = {
      label: 'Builder',
      value: Tabs.Builder,
      content: <DruidQueryBuilder options={builderOptions} onOptionsChange={this.onBuilderOptionsChange} />,
      icon: 'edit',
    };
    const SettingsTab = {
      label: 'Settings',
      value: Tabs.Settings,
      content: <DruidQueryContextSettings options={settingsOptions} onOptionsChange={this.onSettingsOptionsChange} />,
      icon: 'cog',
    };

    const tabs = [BuilderTab, SettingsTab];
    const { activeTab } = this.state;

    return (
      <>
        <TabsBar>
          {tabs.map(t => (
            <Tab
              key={t.value}
              label={t.label}
              active={t.value === activeTab}
              onChangeTab={() => this.onSelectTab(t)}
              icon={t.icon as IconName}
            />
          ))}
        </TabsBar>
        <TabContent>{tabs.find(t => t.value === activeTab)?.content}</TabContent>
      </>
    );
  }
}
