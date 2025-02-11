<template>
  <v-card>
    <BaseSubTitle class="pt-2" :divider="false" title="过去一天资源使用排名">
      <template #selector>
        <v-sheet class="text-body-2 text--darken-1">
          <v-menu
            v-model="topMenu"
            bottom
            left
            nudge-bottom="5px"
            offset-y
            origin="top center"
            transition="scale-transition"
          >
            <template #activator="{ on }">
              <v-btn class="primary--text font-weight-medium" color="white" dark depressed small v-on="on">
                {{ podUsedMode }}
                <v-icon v-if="topMenu" right> fas fa-angle-up </v-icon>
                <v-icon v-else right> fas fa-angle-down </v-icon>
              </v-btn>
            </template>
            <v-data-iterator hide-default-footer :items="[{ text: '排序', values: environmentPodUsageSelect }]">
              <template #no-data>
                <v-card>
                  <v-card-text> 暂无资源 </v-card-text>
                </v-card>
              </template>
              <template #default="props">
                <v-card v-for="item in props.items" :key="item.text">
                  <v-list dense>
                    <v-flex class="text-subtitle-2 text-center ma-2">
                      <span>资源使用</span>
                    </v-flex>
                    <v-divider class="mx-2" />
                    <v-list-item
                      v-for="(select, index) in item.values"
                      :key="index"
                      class="text-body-2 text-center mx-2"
                      link
                      :style="select.value === podUsageMode ? `color: #1e88e5 !important;` : ``"
                      @click="setPodUsageMode(select)"
                    >
                      <v-list-item-content>
                        <span>{{ select.text }}</span>
                      </v-list-item-content>
                    </v-list-item>
                  </v-list>
                </v-card>
              </template>
            </v-data-iterator>
          </v-menu>
        </v-sheet>
      </template>
    </BaseSubTitle>
    <v-card-text>
      <template v-if="Plugins['monitoring']">
        <v-flex v-if="topN.length === 0" class="text-body-2" :style="{ position: 'relative', height: '400px' }">
          <span class="kubegems__full-center kubegems__text"> 暂无数据 </span>
        </v-flex>
        <v-flex v-for="(item, index) in topN" :key="index" class="text-body-2 mt-3 mb-3">
          <v-flex class="float-left" style="width: 80%">
            {{ item.metric.pod }}
          </v-flex>
          <span class="float-right text-body-2 primary--text font-weight-medium">
            <span v-if="podUsageMode.indexOf('cpu') > -1">
              {{ beautifyCpuUnit(sizeOfCpu(parseFloat(item.value[1]), 'n') * 1000 * 1000 * 1000) }}
            </span>
            <span v-else>
              {{ beautifyStorageUnit(sizeOfStorage(parseInt(item.value[1]), 'B')) }}
            </span>
          </span>
          <v-flex class="kubegems__clear-float" />
          <v-divider class="my-3" />
        </v-flex>
      </template>
      <template v-else>
        <div class="text-body-2" :style="{ position: 'relative', height: '400px' }">
          <span class="kubegems__full-center kubegems__text"> 插件monitoring未启用 </span>
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';
  import { sizeOfCpu, sizeOfStorage, beautifyCpuUnit, beautifyStorageUnit } from '@/utils/helpers';
  import {
    TOP_20_POD_CPU_AVG_PROMQL,
    TOP_20_POD_CPU_MAX_PROMQL,
    TOP_20_POD_MEMORY_AVG_PROMQL,
    TOP_20_POD_MEMORY_MAX_PROMQL,
  } from '@/utils/prometheus';

  export default {
    name: 'TopNResourceUsage',
    mixins: [BasePermission, BaseResource],
    data() {
      return {
        topMenu: false,
        podUsageMode: 'cpuavg',
        topN: [],
        environmentPodUsageSelect: [
          { text: 'CPU平均使用量', value: 'cpuavg' },
          { text: 'CPU最大使用量', value: 'cpumax' },
          { text: '内存平均使用量', value: 'memoryavg' },
          { text: '内存最大使用量', value: 'memorymax' },
        ],
      };
    },
    computed: {
      ...mapState(['Plugins']),
      ...mapGetters(['Environment']),
      podUsedMode() {
        const cn = this.environmentPodUsageSelect.find((e) => {
          return e.value === this.podUsageMode;
        });
        if (cn) {
          return cn.text;
        }
        return '';
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.topNPodResourceUsage();
      });
    },
    methods: {
      beautifyCpuUnit: beautifyCpuUnit,
      beautifyStorageUnit: beautifyStorageUnit,
      sizeOfCpu: sizeOfCpu,
      sizeOfStorage: sizeOfStorage,
      setPodUsageMode(select) {
        if (select.value !== this.podUsageMode) {
          this.podUsageMode = select.value;
          this.topNPodResourceUsage();
        }
      },
      async topNPodResourceUsage() {
        this.topN = [];
        let promql = '';
        if (this.podUsageMode === 'cpuavg') {
          promql = TOP_20_POD_CPU_AVG_PROMQL;
        } else if (this.podUsageMode === 'cpumax') {
          promql = TOP_20_POD_CPU_MAX_PROMQL;
        } else if (this.podUsageMode === 'memoryavg') {
          promql = TOP_20_POD_MEMORY_AVG_PROMQL;
        } else if (this.podUsageMode === 'memorymax') {
          promql = TOP_20_POD_MEMORY_MAX_PROMQL;
        }
        const data = await this.m_permission_vector(this.ThisCluster, {
          query: promql.replaceAll('$1', this.Environment().Namespace),
          noprocessing: true,
        });
        this.topN = data;
      },
    },
  };
</script>
