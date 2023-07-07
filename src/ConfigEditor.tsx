import React, { PureComponent } from 'react';
//import '@emotion/react';
import { TabsBar, Tab, TabContent, IconName } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps, SelectableValue, KeyValue } from '@grafana/data';
import { DruidSettings, DruidSecureSettings } from './types';
import { normalizeData } from './configuration/settings';
import { DruidConnectionSettings } from './configuration/ConnectionSettings';
import { ConnectionSettingsOptions } from './configuration/ConnectionSettings/types';
import { DruidQueryDefaultSettings } from './configuration/QuerySettings';
import { QuerySettingsOptions } from './configuration/QuerySettings/types';

enum Tabs {
  Connection,
  Query,
}

interface Props extends DataSourcePluginOptionsEditorProps<DruidSettings, DruidSecureSettings> {}

interface State {
  activeTab: Tabs;
}

export class ConfigEditor extends PureComponent<Props, State> {
  state: State = {
    activeTab: Tabs.Connection,
  };

  onSelectTab = (item: SelectableValue<Tabs>) => {
    this.setState({ activeTab: item.value! });
  };

  onConnectionOptionsChange = (connectionSettingsOptions: ConnectionSettingsOptions) => {
    const { options, onOptionsChange } = this.props;
    const { settings, secretSettings, secretSettingsFields } = connectionSettingsOptions;
    const connectionSettings = normalizeData(settings, true, 'connection');
    const jsonData = { ...options.jsonData, ...connectionSettings };
    const connectionSecretSettings = normalizeData(secretSettings, true, 'connection');
    const secureJsonData = { ...options.secureJsonData, ...connectionSecretSettings };
    const connectionSecretSettingsFields = normalizeData(
      secretSettingsFields,
      true,
      'connection'
    ) as KeyValue<boolean>;
    const secureJsonFields = { ...options.secureJsonFields, ...connectionSecretSettingsFields };
    console.log('Connection settings updated', { options, jsonData, secureJsonData, secureJsonFields });
    onOptionsChange({ ...options, jsonData, secureJsonData, secureJsonFields });
  };

  onQueryOptionsChange = (querySettingsOptions: QuerySettingsOptions) => {
    const { onOptionsChange, options } = this.props;
    const { settings } = querySettingsOptions;
    const querySettings = normalizeData(settings, true, 'query');
    const jsonData = { ...options.jsonData, ...querySettings };
    onOptionsChange({ ...options, jsonData });
  };

  connectionOptions = (): ConnectionSettingsOptions => {
    const { jsonData, secureJsonData, secureJsonFields } = this.props.options;
    return {
      settings: normalizeData(jsonData, false, 'connection'),
      secretSettings: normalizeData(secureJsonData || {}, false, 'connection'),
      secretSettingsFields: normalizeData(secureJsonFields || {}, false, 'connection') as KeyValue<boolean>,
    };
  };

  queryOptions = (): QuerySettingsOptions => {
    const { jsonData } = this.props.options;
    return {
      settings: normalizeData(jsonData, false, 'query'),
    };
  };

  render() {
    const connectionOptions = this.connectionOptions();
    const queryOptions = this.queryOptions();

    const ConnectionTab = {
      label: 'Connection',
      value: Tabs.Connection,
      content: <DruidConnectionSettings options={connectionOptions} onOptionsChange={this.onConnectionOptionsChange} />,
      icon: 'signal',
    };
    const QueryTab = {
      label: 'Query defaults',
      value: Tabs.Query,
      content: <DruidQueryDefaultSettings options={queryOptions} onOptionsChange={this.onQueryOptionsChange} />,
      icon: 'database',
    };

    const tabs = [ConnectionTab, QueryTab];
    const { activeTab } = this.state;

    return (
      <>
        <TabsBar>
          {tabs.map((t) => (
            <Tab
              key={t.value}
              label={t.label}
              active={t.value === activeTab}
              onChangeTab={() => this.onSelectTab(t)}
              icon={t.icon as IconName}
            />
          ))}
        </TabsBar>
        <TabContent>{tabs.find((t) => t.value === activeTab)?.content}</TabContent>
      </>
    );
  }
}
