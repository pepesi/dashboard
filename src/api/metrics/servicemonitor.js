import axios from 'axios';

import { jsonParse } from '@/utils/helpers';

const apiResources = jsonParse(window.localStorage.getItem('api-resources')) || {};
let apiVersion = apiResources['servicemonitor'] || 'monitoring.coreos.com/v1';
apiVersion = apiVersion === 'v1' ? 'core/v1' : apiVersion;

// 服务监控列表
export const getServiceMonitorList = (clusterName, namespace, query = {}) =>
  axios(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/servicemonitor`, {
    params: query,
  });
// 添加服务监控
export const postAddServiceMonitor = (clusterName, namespace, name, body = {}) =>
  axios.post(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/servicemonitor/${name}`, body);
// 服务监控详情
export const getServiceMonitorDetail = (clusterName, namespace, name, query = {}) =>
  axios(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/servicemonitor/${name}`, { params: query });
// 更新服务监控
export const patchUpdateServiceMonitor = (clusterName, namespace, name, body = {}) =>
  axios.patch(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/servicemonitor/${name}`, body);
// 删除服务监控
export const deleteServiceMonitor = (clusterName, namespace, name) =>
  axios.delete(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/servicemonitor/${name}`);
