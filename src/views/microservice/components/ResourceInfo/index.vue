<template>
  <div>
    <MonitorCard v-if="$route.query.type !== 'Service'" ref="dashboardCard" class="mb-0 mt-3" />

    <template v-if="$route.query.type === 'Service'">
      <ServiceInfo class="pb-2" :item="item" />
    </template>

    <v-card v-for="(traffics, key) in traffic" :key="`${key}`" class="mt-3">
      <BaseSubTitle class="pt-2" :divider="false" :title="`${trafficCn[key]}`" />
      <v-data-table
        class="mx-4"
        disable-sort
        :headers="headers"
        hide-default-footer
        :items="traffics"
        no-data-text="暂无数据"
      >
        <template #[`item.name`]="{ item }">
          <v-chip color="success" small>
            {{ item.NodeType }}
          </v-chip>
          {{ item.Name }}
        </template>
        <template #[`item.rate`]="{ item }">
          {{ item.Rate }}
        </template>
        <template #[`item.percentSuccess`]="{ item }">
          {{ item.PercentSuccess }}
        </template>
        <template #[`item.protocol`]="{ item }">
          {{ item.Protocol }}
        </template>
      </v-data-table>
    </v-card>

    <v-card v-if="$route.query.type === 'Service'" class="mt-3">
      <BaseSubTitle class="pt-2" :divider="false" title="工作负载" />
      <WorkloadList :workloads="item ? item.workloads : []" />
    </v-card>
  </div>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import MonitorCard from './MonitorCard';
  import ServiceInfo from './ServiceInfo';
  import WorkloadList from './WorkloadList';

  import { getKialiTrafficGraph } from '@/api';
  import BaseResource from '@/mixins/resource';

  export default {
    name: 'ResourceInfo',
    components: {
      MonitorCard,
      ServiceInfo,
      WorkloadList,
    },
    mixins: [BaseResource],
    props: {
      item: {
        type: Object,
        default: () => null,
      },
      type: {
        type: String,
        default: () => 'workloads',
      },
    },
    data() {
      return {
        trafficCn: {
          in: '入口流量',
          out: '出口流量',
        },
        traffic: {
          in: [],
          out: [],
        },
        headers: [
          { text: '名称', value: 'name', align: 'start', width: 400 },
          { text: '速率', value: 'rate', align: 'start', width: 400 },
          { text: '成功率', value: 'percentSuccess', align: 'start' },
          { text: '协议', value: 'protocol', align: 'start' },
        ],
        graphInterval: null,
      };
    },
    computed: {
      ...mapState(['JWT']),
      ...mapGetters(['VirtualSpace']),
      injectServiceNodes() {
        return this.type === 'services';
      },
    },
    watch: {
      item: {
        handler(val) {
          if (val) {
            this.$nextTick(() => {
              if (this.$refs.dashboardCard) {
                this.$refs.dashboardCard.init(this.item);
              }
              this.kialiTrafficGraph();
              this.graphInterval = setInterval(() => {
                this.kialiTrafficGraph(true);
              }, 30000);
            });
          }
        },
        immediate: true,
      },
    },
    destroyed() {
      if (this.graphInterval) clearInterval(this.graphInterval);
    },
    methods: {
      async kialiTrafficGraph(noprocess = false) {
        if (!this.$route.params.name) {
          if (this.graphInterval) clearInterval(this.graphInterval);
          return;
        }
        const data = await getKialiTrafficGraph(
          this.VirtualSpace().ID,
          this.$route.query.environmentid,
          this.$route.query.namespace,
          this.type,
          this.$route.params.name,
          {
            graphType: 'workload',
            injectServiceNodes: this.injectServiceNodes,
            includeIdleEdges: false,
            duration: '60s',
            responseTime: 95,
            throughputType: 'request',
            appenders: 'deadNode,sidecarsCheck,serviceEntry,istio,healthConfig,responseTime,throughput',
            rateGrpc: 'requests',
            rateHttp: 'requests',
            rateTcp: 'sent',
            noprocessing: noprocess,
          },
        );
        this.traffic = {
          in: [],
          out: [],
        };
        const nodeDict = {};
        data.elements.nodes.forEach((node) => {
          const data = {
            Name: node.data.nodeType === 'unknown' ? 'unknown' : node.data[node.data.nodeType],
            App: node.data.app,
            Namespace: node.data.namespace,
            Version: node.data.version,
            NodeType: node.data.nodeType,
          };
          nodeDict[node.data.id] = data;
        });
        data.elements.edges.forEach((edge) => {
          const edgeData = {
            Rate: `${edge.data.traffic.rates[edge.data.traffic.protocol]}rps`,
            Protocol: edge.data.traffic.protocol,
            PercentSuccess:
              edge.data.traffic.protocol === 'grpc'
                ? `${edge.data.traffic.responses[0] ? edge.data.traffic.responses[0].flags['-'] : 0}%`
                : edge.data.traffic.protocol === 'http'
                ? `${edge.data.traffic.responses[200] ? edge.data.traffic.responses[200].flags['-'] : 0}%`
                : `${edge.data.traffic.responses['-'] ? edge.data.traffic.responses['-'].flags['-'] : 0}%`,
          };
          const source = nodeDict[edge.data.source];
          const target = nodeDict[edge.data.target];
          if (target.Name === this.$route.params.name) {
            this.traffic.in.push({
              ...source,
              ...edgeData,
            });
          }
          if (source.Name === this.$route.params.name) {
            this.traffic.out.push({
              ...target,
              ...edgeData,
            });
          }
        });
      },
    },
  };
</script>
