<template>
  <v-container fluid>
    <BaseBreadcrumb>
      <template #extend>
        <v-flex class="kubegems__full-right">
          <v-btn color="primary" small text @click="overScaleResource">
            <v-icon left small> mdi-scale </v-icon>
            资源超分
          </v-btn>
          <BaseDatetimePicker v-model="date" :default-value="30" @change="onDatetimeChange(undefined)" />
          <v-menu left>
            <template #activator="{ on }">
              <v-btn icon>
                <v-icon color="primary" x-small v-on="on"> fas fa-ellipsis-v </v-icon>
              </v-btn>
            </template>
            <v-card>
              <v-card-text class="pa-2 text-center">
                <v-flex>
                  <v-btn color="primary" small text @click="kuberCtl"> Kubectl </v-btn>
                </v-flex>
                <v-flex>
                  <v-btn color="primary" small text @click="updateCluster"> 编辑 </v-btn>
                </v-flex>
                <v-flex v-if="cluster && !cluster.Primary">
                  <v-btn color="error" small text @click="removeCluster"> 删除 </v-btn>
                </v-flex>
              </v-card-text>
            </v-card>
          </v-menu>
        </v-flex>
      </template>
    </BaseBreadcrumb>
    <v-row>
      <v-col class="pb-2" cols="12" lg="4">
        <BasicMonitor :cluster="cluster" :params="params" />
        <ResourceInfo :cluster="cluster" :quota="quota" :workload="workload" />
      </v-col>

      <v-col class="pb-2" cols="12" lg="8">
        <MetricMonitor :params="params" />
      </v-col>

      <v-col v-for="(key, index) in resources" :key="index" class="down-top-padding pt-1 pb-2" cols="2">
        <v-card>
          <v-card-text class="py-5 pl-8">
            <div class="d-flex align-center">
              <Icon class="mr-6 primary--text icon--large" :icon="$RESOURCE_ICON[key]" />
              <div class="ml-2 mr-1">
                <h2 class="text-h5">
                  {{ workload[key] }}
                </h2>
                <div class="text-subtitle-2 font-weight-regular cluster__resource__div">
                  {{ $RESOURCE_CN[key] }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <ResourceChart :cluster="cluster" :quota="quota" />
    <Terminal ref="terminal" />
    <UpdateCluster ref="updateCluster" @refresh="clusterDetail" />
    <OverScaleResource ref="overScaleResource" @refresh="clusterDetail" />
  </v-container>
</template>
<script>
  import { mapGetters, mapState } from 'vuex';

  import BasicMonitor from './components/BasicMonitor';
  import MetricMonitor from './components/MetricMonitor';
  import OverScaleResource from './components/OverScaleResource';
  import ResourceChart from './components/ResourceChart';
  import ResourceInfo from './components/ResourceInfo';
  import UpdateCluster from './components/UpdateCluster';

  import { deleteCluster, getClusterDetail, getClusterQuota } from '@/api';
  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';
  import BaseSelect from '@/mixins/select';
  import { CLUSTER_POD_CAPACITY_PROMQL } from '@/utils/prometheus';
  import Terminal from '@/views/resource/components/common/Terminal';

  export default {
    name: 'ClusterDetail',
    components: {
      BasicMonitor,
      MetricMonitor,
      OverScaleResource,
      ResourceChart,
      ResourceInfo,
      Terminal,
      UpdateCluster,
    },
    mixins: [BasePermission, BaseResource, BaseSelect],
    data: () => ({
      cluster: null,
      quota: null,
      workload: null,
      resources: [],
      date: [],
      params: {
        start: '',
        end: '',
      },
    }),
    computed: {
      ...mapState(['JWT']),
      ...mapGetters(['Cluster']),
    },
    mounted() {
      if (this.JWT) {
        this.$nextTick(() => {
          this.clusterDetail();
          this.onDatetimeChange();
        });
      }
    },
    methods: {
      async clusterDetail() {
        const data = await getClusterDetail(this.$route.query.id, {
          noprocessing: true,
        });
        this.cluster = data;
        if (!this.cluster.OversoldConfig) {
          this.cluster.OversoldConfig = {
            cpu: 1,
            memory: 1,
            storage: 1,
          };
        }
        await this.$store.dispatch('UPDATE_CLUSTER_DATA');
        this.$store.commit('SET_NAMESPACE_FILTER', null);
        this.$router.replace({
          params: { cluster: data.ClusterName },
          query: {
            ...this.$route.query,
          },
        });
        this.clusterQuota();
        this.$store.commit('SET_LATEST_CLUSTER', { cluster: data.ClusterName });
      },
      async clusterQuota() {
        const data = await getClusterQuota(this.cluster.ID, {
          noprocessing: false,
        });
        const query = CLUSTER_POD_CAPACITY_PROMQL;
        const pods = await this.m_permission_vector(this.cluster.ClusterName, {
          query: escape(query),
          noprocessing: true,
        });
        if (data.resources) {
          data.resources.capacity.pods = pods ? (pods && pods.length ? parseInt(pods[0]?.value[1] || 0) : 0) : 0;
          data.resources.used.pods = data.workloads.pods;

          this.quota = data.resources;
          this.workload = data.workloads;
          this.resources = Object.keys(this.workload).filter((i) => {
            return this.$RESOURCE_CN[i] !== undefined && this.$RESOURCE_CN[i] !== '节点';
          });
        }
      },
      kuberCtl() {
        this.$refs.terminal.init(null, this.cluster, 'kubectl');
        this.$refs.terminal.open();
      },
      updateCluster() {
        this.$refs.updateCluster.init(this.cluster);
        this.$refs.updateCluster.open();
      },
      removeCluster() {
        const item = this.cluster;
        this.$store.commit('SET_CONFIRM', {
          title: `删除集群`,
          content: {
            text: `删除集群 ${item.ClusterName}`,
            type: 'delete',
            name: item.ClusterName,
          },
          param: { item },
          doFunc: async (param) => {
            await deleteCluster(param.item.ID);
            this.$store.commit('CLEAR_CLUSTER');
            this.$store.dispatch('UPDATE_CLUSTER_DATA');
            this.$router.push({ name: 'cluster-center' });
          },
        });
      },
      onDatetimeChange() {
        this.params.start = this.$moment(this.date[0]).utc().format();
        this.params.end = this.$moment(this.date[1]).utc().format();
      },
      overScaleResource() {
        this.$refs.overScaleResource.init(this.cluster);
        this.$refs.overScaleResource.open();
      },
    },
  };
</script>

<style lang="scss" scoped>
  .icon--large {
    width: 40px;
    height: 40px;
  }
  .down-top-padding {
    :first-of-type {
      padding-top: 0;
      padding-bottom: 0;
      padding-left: 20;
    }
  }
  .cluster__resource__div {
    max-height: 44px;
    overflow: scroll;
  }
</style>
