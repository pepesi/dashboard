<template>
  <v-card class="mt-3">
    <BaseSubTitle class="pt-2" :divider="false" title="资源监控">
      <template #selector>
        <v-sheet class="text-body-2 text--darken-1">
          <BaseDatetimePicker v-model="date" :default-value="30" @change="onDatetimeChange(undefined)" />
        </v-sheet>
      </template>
    </BaseSubTitle>
    <v-card-text :class="`clear-zoom-${Scale.toString().replaceAll('.', '-')}`">
      <v-row>
        <v-col cols="6">
          <BaseApexAreaChart
            id="cpu"
            label="environment"
            :label-show="false"
            :metrics="cpu"
            title="CPU使用量"
            type="cpu"
          />
        </v-col>
        <v-col cols="6">
          <BaseApexAreaChart
            id="memory"
            label="environment"
            :label-show="false"
            :metrics="memory"
            title="内存使用量"
            type="memory"
          />
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6">
          <BaseApexAreaChart
            id="networkin"
            label="environment"
            :label-show="false"
            :metrics="networkin"
            title="网络入口流量"
            type="network"
          />
        </v-col>
        <v-col cols="6">
          <BaseApexAreaChart
            id="networkout"
            label="environment"
            :label-show="false"
            :metrics="networkout"
            title="网络出口流量"
            type="network"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';
  import {
    ENVIRONMENT_CPU_USAGE_PROMQL,
    ENVIRONMENT_MEMORY_USAGE_PROMQL,
    ENVIRONMENT_NETWORK_IN_PROMQL,
    ENVIRONMENT_NETWORK_OUT_PROMQL,
  } from '@/utils/prometheus';

  export default {
    name: 'ResourceMonitor',
    mixins: [BasePermission, BaseResource],
    props: {
      ready: {
        type: Boolean,
        default: () => false,
      },
    },
    data: () => ({
      cpu: [],
      memory: [],
      networkin: [],
      networkout: [],
      date: [],
      params: {
        start: '',
        end: '',
      },
      timeinterval: null,
    }),
    computed: {
      ...mapState(['JWT', 'Scale']),
      ...mapGetters(['Environment', 'Project']),
    },
    watch: {
      ready() {
        if (this.ready) {
          this.loadMetrics();
        }
      },
    },
    destroyed() {
      if (this.timeinterval) clearInterval(this.timeinterval);
    },
    mounted() {
      this.$nextTick(() => {
        this.onDatetimeChange();
      });
    },
    methods: {
      async loadMetrics() {
        if (this.timeinterval) clearInterval(this.timeinterval);
        this.loadData();
        this.timeinterval = setInterval(() => {
          this.params.start = this.$moment(this.params.start).utc().add(30, 'seconds').format();
          this.params.end = this.$moment(this.params.end).utc().add(30, 'seconds').format();
          this.loadData();
        }, 1000 * 30);
      },
      async loadData() {
        this.environmentCPUUsage();
        this.environmentMemoryUsage();
        this.environmentNetworkIn();
        this.environmentNetworkOut();
      },
      async environmentCPUUsage() {
        const data = await this.m_permission_matrix(
          this.ThisCluster,
          Object.assign(this.params, {
            query: ENVIRONMENT_CPU_USAGE_PROMQL.replaceAll('$1', this.Environment().EnvironmentName),
            noprocessing: true,
          }),
        );
        if (data) this.cpu = data;
      },
      async environmentMemoryUsage() {
        const data = await this.m_permission_matrix(
          this.ThisCluster,
          Object.assign(this.params, {
            query: ENVIRONMENT_MEMORY_USAGE_PROMQL.replaceAll('$1', this.Environment().EnvironmentName),
            noprocessing: true,
          }),
        );
        if (data) this.memory = data;
      },
      async environmentNetworkIn() {
        const data = await this.m_permission_matrix(
          this.ThisCluster,
          Object.assign(this.params, {
            query: ENVIRONMENT_NETWORK_IN_PROMQL.replaceAll('$1', this.Environment().EnvironmentName),
            noprocessing: true,
          }),
        );
        if (data) this.networkin = data;
      },
      async environmentNetworkOut() {
        const data = await this.m_permission_matrix(
          this.ThisCluster,
          Object.assign(this.params, {
            query: ENVIRONMENT_NETWORK_OUT_PROMQL.replaceAll('$1', this.Environment().EnvironmentName),
            noprocessing: true,
          }),
        );
        if (data) this.networkout = data;
      },
      onDatetimeChange() {
        this.params.start = this.$moment(this.date[0]).utc().format();
        this.params.end = this.$moment(this.date[1]).utc().format();
        if (this.ready) {
          this.loadMetrics();
        }
      },
    },
  };
</script>
