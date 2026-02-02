import { DataSourceInstanceSettings, MetricFindValue, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { DruidSettings, DruidQuery } from './types';

const druidVariableRegex = /\"\[\[(\w+)(?::druid:(\w+))?\]\]\"|\"\${(\w+)(?::druid:(\w+))?}\"/g;

export class DruidDataSource extends DataSourceWithBackend<DruidQuery, DruidSettings> {
  settingsData: DruidSettings;
  constructor(instanceSettings: DataSourceInstanceSettings<DruidSettings>) {
    super(instanceSettings);
    this.settingsData = instanceSettings.jsonData;
  }
  filterQuery(query: DruidQuery) {
    return !query.hide;
  }
  applyTemplateVariables(templatedQuery: DruidQuery, scopedVars?: ScopedVars) {
    console.error('[Druid] applyTemplateVariables received from Grafana:', {
      templatedQuery,
      scopedVars,
    });

    const templateSrv = getTemplateSrv();
    let template = JSON.stringify({ ...templatedQuery, expr: undefined }).replace(
      druidVariableRegex,
      (match, variable1, format1, variable2, format2) => {
        if (format1 || format2 === 'json') {
          return '${' + (variable1 || variable2) + ':doublequote}';
        }
        return match;
      }
    );

    // Log variable names found in template and the value Grafana uses for each
    const variableRefPattern = /\$(\w+)|(?:\$\{(\w+)(?::[^}]*)?\})/g;
    const variableNames = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = variableRefPattern.exec(template)) !== null) {
      variableNames.add(m[1] || m[2] || '');
    }
    const ts = templateSrv as { getVariables?: () => Array<{ name?: string; current?: { value?: unknown } }> };
    const variables = ts.getVariables?.() ?? [];
    const scoped = scopedVars ?? {};
    variableNames.forEach((name) => {
      const scopedVal = name && (scoped[name] as { value?: unknown } | undefined);
      const varObj = variables.find((v) => v?.name === name);
      const currentVal = varObj?.current?.value;
      const valueUsed = scopedVal?.value !== undefined ? scopedVal.value : currentVal;
      console.error(`[Druid] variable $${name} → value:`, valueUsed, '(from scopedVars:', !!scopedVal, ', from getVariables:', !!varObj, ')');
    });

    const replaced = templateSrv.replace(template, scopedVars);
    console.error('[Druid] template after replace (snippet with first 500 chars):', replaced.slice(0, 500));

    const result = { ...JSON.parse(replaced), expr: templatedQuery.expr };
    console.error('[Druid] applyTemplateVariables sending (after variable replacement):', result);
    return result;
  }
  async metricFindQuery(query: DruidQuery, options?: any): Promise<MetricFindValue[]> {
    return this.postResource('query-variable', this.applyTemplateVariables(query)).then((response) => {
      return response as MetricFindValue[];
    });
  }

  async getDatasourceMetadata(datasourceName: string): Promise<any> {
    return this.getResource('datasource-metadata', { datasource: datasourceName }).then((response) => {
      return response as any;
    });
  }

  async listDatasources(): Promise<string[]> {
    return this.getResource('datasources', {}).then((response) => {
      return response as string[];
    });
  }
}
