<template>
  <BaseFullScreenDialog v-model="dialog" icon="fas fa-chart-area" :title="`监控面板--${graph.name}`" @dispose="dispose">
    <template #action>
      <BaseDatetimePicker v-model="date" color="primary" :default-value="30" @change="onDatetimeChange(undefined)" />
    </template>
    <template #content>
      <BaseApexAreaChart
        id="max"
        :class="`clear-zoom-${Scale.toString().replaceAll('.', '-')}`"
        :extend-height="height"
        label="pod"
        :metrics="metrics"
        :no-data-offset-y="-24"
        title=""
        type=""
        :unit="graph.promqlGenerator ? graph.promqlGenerator.unit : null"
      />
    </template>
  </BaseFullScreenDialog>
</template>

<script>
  import { mapState } from 'vuex';

  import { getMetricsQueryrange } from '@/api';

  export default {
    name: 'GraphMax',
    props: {
      environment: {
        type: Object,
        default: () => {},
      },
    },
    data: () => ({
      dialog: false,
      graph: {},
      namespace: '',
      metrics: [],
      timeinterval: null,
      date: [],
      params: {
        start: null,
        end: null,
      },
    }),
    computed: {
      ...mapState(['JWT', 'Scale']),
      height() {
        return window.innerHeight - 64 * this.Scale - 100;
      },
    },
    destroyed() {
      this.clearInterval();
    },
    mounted() {
      this.$nextTick(() => {
        this.params.start = this.$moment(this.date[0]).utc().format();
        this.params.end = this.$moment(this.date[1]).utc().format();
      });
    },
    methods: {
      // eslint-disable-next-line vue/no-unused-properties
      open() {
        this.dialog = true;
      },
      // eslint-disable-next-line vue/no-unused-properties
      async init(graph, namespace) {
        this.graph = graph;
        this.namespace = namespace;
        this.loadMetrics();
      },
      async loadMetrics() {
        this.clearInterval();
        this.getMetrics();
        this.timeinterval = setInterval(() => {
          this.params.start = this.$moment(this.params.start).utc().add(30, 'seconds').format();
          this.params.end = this.$moment(this.params.end).utc().add(30, 'seconds').format();
          this.getMetrics();
        }, 1000 * 30);
      },
      dispose() {
        this.graph = {};
        this.metrics = [];
        this.clearInterval();
      },
      clearInterval() {
        if (this.timeinterval) clearInterval(this.timeinterval);
      },
      async getMetrics() {
        const params = this.graph.promqlGenerator
          ? this.graph.promqlGenerator
          : {
              expr: this.graph.expr,
            };
        const data = await getMetricsQueryrange(
          this.environment.clusterName,
          this.namespace,
          Object.assign(this.params, params),
        );
        this.metrics = data;
      },
      onDatetimeChange() {
        this.params.start = this.$moment(this.date[0]).utc().format();
        this.params.end = this.$moment(this.date[1]).utc().format();
        this.loadMetrics();
      },
    },
  };
</script>
