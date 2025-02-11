<template>
  <v-card>
    <v-card-title class="pt-2 pb-0">
      <v-flex>
        <v-flex class="float-right">
          <v-sheet class="text-body-2 text--darken-1">
            <BaseDatetimePicker v-model="date" :default-value="30" @change="onDatetimeChange(undefined)" />
          </v-sheet>
        </v-flex>
        <div class="kubegems__clear-float" />
      </v-flex>
    </v-card-title>
    <v-card-text :class="`clear-zoom-${Scale.toString().replaceAll('.', '-')}`">
      <v-row>
        <v-col cols="6">
          <BaseApexAreaChart id="used" label="persistentvolumeclaim" :metrics="used" title="使用量" type="storage" />
        </v-col>
        <v-col cols="6">
          <BaseApexAreaChart
            id="inode"
            label="persistentvolumeclaim"
            :metrics="inodeused"
            title="Inode使用率"
            type=""
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
  import { mapState } from 'vuex';

  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';
  import { PVC_USAGE_PROMQL, PVC_USAGE_INODE_PROMQL } from '@/utils/prometheus';

  export default {
    name: 'PersistentVolumeClaimMonitor',
    mixins: [BasePermission, BaseResource],
    props: {
      item: {
        type: Object,
        default: () => null,
      },
    },
    data: () => ({
      used: [],
      inodeused: [],
      date: [],
      params: {
        start: '',
        end: '',
        noprocessing: true,
      },
      timeinterval: null,
    }),
    computed: {
      ...mapState(['Scale']),
    },
    watch: {
      item() {
        this.loadMetrics();
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
        this.pvcUsage();
        this.pvcInodeUsage();
      },
      async pvcUsage() {
        const query = PVC_USAGE_PROMQL.replaceAll('$1', this.item.metadata.namespace).replaceAll(
          '$2',
          this.item.metadata.name,
        );
        const data = await this.m_permission_matrix(
          this.ThisCluster,
          Object.assign(this.params, { query: query, noprocessing: true }),
        );
        if (data) this.used = data;
      },
      async pvcInodeUsage() {
        const query = PVC_USAGE_INODE_PROMQL.replaceAll('$1', this.item.metadata.namespace).replaceAll(
          '$2',
          this.item.metadata.name,
        );
        const data = await this.m_permission_matrix(
          this.ThisCluster,
          Object.assign(this.params, { query: query, noprocessing: true }),
        );
        if (data) this.inodeused = data;
      },
      onDatetimeChange() {
        this.params.start = this.$moment(this.date[0]).utc().format();
        this.params.end = this.$moment(this.date[1]).utc().format();
        this.loadMetrics();
      },
    },
  };
</script>
