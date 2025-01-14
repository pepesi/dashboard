import axios from 'axios';

import { jsonParse } from '@/utils/helpers';

const apiResources = jsonParse(window.localStorage.getItem('api-resources')) || {};
let apiVersion = apiResources['statefulset'] || 'apps/v1';
apiVersion = apiVersion === 'v1' ? 'core/v1' : apiVersion;

// sts列表
export const getStatefulSetList = (clusterName, namespace, query = {}) =>
  axios(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/statefulsets`, {
    params: query,
  });
// sts详情
export const getStatefulSetDetail = (clusterName, namespace, name, query = {}) =>
  axios(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/statefulsets/${name}`, {
    params: query,
  });
// 添加sts
export const postAddStatefulSet = (clusterName, namespace, name, body = {}) =>
  axios.post(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/statefulsets/${name}`, body);
// 更新sts
export const patchUpdateStatefulSet = (clusterName, namespace, name, body = {}) =>
  axios.patch(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/statefulsets/${name}`, body);
// 删除sts
export const deleteStatefulSet = (clusterName, namespace, name) =>
  axios.delete(`proxy/cluster/${clusterName}/${apiVersion}/namespaces/${namespace}/statefulsets/${name}`);
