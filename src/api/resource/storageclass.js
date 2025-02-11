import axios from 'axios';

import { jsonParse } from '@/utils/helpers';

const apiResources = jsonParse(window.localStorage.getItem('api-resources')) || {};
let apiVersion = apiResources['storageclass'] || 'storage.k8s.io/v1';
apiVersion = apiVersion === 'v1' ? 'core/v1' : apiVersion;

// 存储类型列表
export const getStorageClassList = (clusterName, query = {}) =>
  axios(`proxy/cluster/${clusterName}/${apiVersion}/storageclasses`, {
    params: query,
  });
// 存储类型详情
export const getStorageClassDetail = (clusterName, name) =>
  axios(`proxy/cluster/${clusterName}/${apiVersion}/storageclasses/${name}`);
// 添加存储类型
export const postAddStorageClass = (clusterName, name, body = {}) =>
  axios.post(`proxy/cluster/${clusterName}/${apiVersion}/storageclasses/${name}`, body);
// 更新存储类型
export const patchUpdateStorageClass = (clusterName, name, body = {}) =>
  axios.patch(`proxy/cluster/${clusterName}/${apiVersion}/storageclasses/${name}`, body);
// 删除存储类型
export const deleteStorageClass = (clusterName, name) =>
  axios.delete(`proxy/cluster/${clusterName}/${apiVersion}/storageclasses/${name}`);
