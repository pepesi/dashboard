<template>
  <v-container class="pa-0" fluid>
    <v-card flat>
      <v-card-title class="px-0">
        <BaseFilter
          :default="{ items: [], text: '告警规则名称', value: 'search' }"
          :filters="filters"
          :reload="false"
          @filter="customFilter"
          @refresh="m_filter_list"
        />
        <v-chip-group v-model="amenities" class="ml-2 align-center" column multiple @change="onAlertStateChange">
          <v-badge
            v-for="(item, index) in alertStateArr"
            :key="index"
            bordered
            :class="`zoom-${Scale.toString().replaceAll('.', '-')} mx-3 mt-1`"
            :color="item[Object.keys(item)[0]]"
            :content="alertStatus[Object.keys(item)[0]] === 0 ? '0' : alertStatus[Object.keys(item)[0]]"
            overlap
            small
          >
            <v-chip
              class="font-weight-medium"
              :color="item[Object.keys(item)[0]]"
              label
              :outlined="amenities.indexOf(index) === -1"
              small
              :text-color="`${amenities.indexOf(index) === -1 ? item[Object.keys(item)[0]] : 'white'}`"
            >
              {{ Object.keys(item)[0] }}
            </v-chip>
          </v-badge>
        </v-chip-group>
        <v-spacer />
        <v-menu v-if="m_permisson_resourceAllow($route.query.env)" left>
          <template #activator="{ on }">
            <v-btn icon>
              <v-icon color="primary" small v-on="on"> fas fa-ellipsis-v </v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-card-text class="pa-2">
              <v-flex>
                <v-btn color="primary" text @click="addPrometheusRule">
                  <v-icon left>mdi-plus-box</v-icon>
                  创建告警规则
                </v-btn>
              </v-flex>
              <!-- <v-flex>
                <v-btn
                  text
                  color="error"
                  @click="
                    batchRemoveResource(
                      '告警规则',
                      'PrometheusRule',
                      prometheusRuleList,
                    )
                  "
                >
                  <v-icon left>mdi-minus-box</v-icon>
                  删除告警规则
                </v-btn>
              </v-flex> -->
            </v-card-text>
          </v-card>
        </v-menu>
      </v-card-title>
      <v-card-text class="px-0">
        <v-data-table
          class="kubegems__table-row-pointer"
          disable-filtering
          disable-sort
          :headers="headers"
          hide-default-footer
          item-key="index"
          :items="items"
          :items-per-page="itemsPerPage"
          no-data-text="暂无数据"
          :page.sync="page"
          show-expand
          single-expand
          @click:row="onRowClick"
          @page-count="pageCount = $event"
        >
          <template #[`item.data-table-select`]="{ item, index }">
            <v-checkbox
              v-model="m_table_batchResources[`${item.metadata.name}-${index + itemsPerPage * (page - 1)}`].checked"
              color="primary"
              hide-details
              @change="onResourceChange($event, item, `${index + itemsPerPage * (page - 1)}`)"
              @click.stop
            />
          </template>
          <template #[`item.name`]="{ item }">
            <v-flex style="display: flex">
              <a class="text-subtitle-2" @click.stop="prometheusRuleDetail(item)">
                {{ item.name }}
              </a>
              <span v-if="item.state === 'inactive'" class="px-2">
                <v-chip class="font-weight-medium" color="success" small text-color="white">
                  {{ item.state }}
                </v-chip>
              </span>
              <span v-else-if="item.state === 'firing'" class="px-2">
                <v-chip class="font-weight-medium" color="error" small text-color="white">
                  {{ item.state }}
                </v-chip>
              </span>
              <span v-else class="px-2">
                <v-chip class="font-weight-medium" color="warning" small text-color="white">
                  {{ item.state }}
                </v-chip>
              </span>
            </v-flex>
          </template>
          <template v-if="AdminViewport" #[`item.namespace`]="{ item }">
            <v-menu v-if="item.namespace === SERVICE_MONITOR_NS" :close-delay="200" open-on-hover top>
              <template #activator="{ on, attrs }">
                <span v-bind="attrs" v-on="on">
                  {{ item.namespace }}
                </span>
              </template>
              <v-card>
                <v-card-text class="pa-2"> 此命名空间下告警规则将标记为全局告警 </v-card-text>
              </v-card>
            </v-menu>
            <span v-else>{{ item.namespace }}</span>
          </template>
          <template #[`item.promql`]="{ item }">
            <v-flex class="kubegems__break-all">{{ item.promql }}</v-flex>
          </template>
          <template #[`item.for`]="{ item }">
            {{ item.for }}
          </template>
          <template #[`item.receivers`]="{ item }">
            {{ item.receiversStr }}
          </template>
          <template #[`item.open`]="{ item }">
            <span v-if="item.isOpen">
              <v-icon color="primary" small> fas fa-check-circle </v-icon>
              启用
            </span>
            <span v-else>
              <v-icon color="error" small> fas fa-minus-circle </v-icon>
              禁用
            </span>
          </template>
          <template #expanded-item="{ headers, item }">
            <td class="my-2 py-2" :colspan="headers.length">
              <span class="text-subtitle-2 kubegems__text">消息模版：</span>
              <v-flex class="text-body-2 break-word">
                {{ item.message }}
              </v-flex>
            </td>
          </template>
          <template #[`item.action`]="{ item, index }">
            <v-flex :id="`r${index}`" />
            <v-menu :attach="`#r${index}`" left>
              <template #activator="{ on }">
                <v-btn icon>
                  <v-icon color="primary" x-small v-on="on"> fas fa-ellipsis-v </v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-card-text class="pa-2">
                  <v-flex>
                    <v-btn color="primary" small text @click.stop="updatePrometheusRule(item)"> 编辑 </v-btn>
                  </v-flex>
                  <v-flex>
                    <v-btn color="primary" small text @click.stop="switchBlackList(item)">
                      {{ item.isOpen ? '禁用' : '启用' }}
                    </v-btn>
                  </v-flex>
                  <v-flex>
                    <v-btn color="error" small text @click.stop="removePrometheusRule(item)"> 删除 </v-btn>
                  </v-flex>
                </v-card-text>
              </v-card>
            </v-menu>
          </template>
        </v-data-table>
        <BasePagination
          v-if="pageCount >= 1"
          v-model="page"
          :front-page="true"
          :page-count="pageCount"
          :size="itemsPerPage"
          @changepage="onPageIndexChange"
          @changesize="onPageSizeChange"
          @loaddata="prometheusRuleList"
        />
      </v-card-text>
    </v-card>
    <AddPrometheusRule ref="addPrometheusRule" @refresh="prometheusRuleList" />
    <UpdatePrometheusRule ref="updatePrometheusRule" @refresh="prometheusRuleList" />
  </v-container>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import AddPrometheusRule from './components/AddPrometheusRule';
  import UpdatePrometheusRule from './components/UpdatePrometheusRule';

  import { getPrometheusRuleList, deletePrometheusRule, postDisableAlertRule, postEnableAlertRule } from '@/api';
  import BaseFilter from '@/mixins/base_filter';
  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';
  import BaseTable from '@/mixins/table';
  import { deepCopy } from '@/utils/helpers';
  import { SERVICE_MONITOR_NS } from '@/utils/namespace';

  export default {
    name: 'PrometheusRule',
    components: {
      AddPrometheusRule,
      UpdatePrometheusRule,
    },
    mixins: [BaseFilter, BasePermission, BaseResource, BaseTable],
    data: () => ({
      filters: [{ text: '告警规则名称', value: 'search', items: [] }],
      items: [],
      itemsCopy: [],
      page: 1,
      pageCount: 0,
      itemsPerPage: 10,
      params: {
        state: '',
        isAdmin: false,
      },
      amenities: [],
      alertStatus: { inactive: 0, firing: 0, pending: 0 },
      alertStateFilter: [],
      alertStateArr: [{ inactive: 'success' }, { pending: 'warning' }, { firing: 'error' }],
      cluster: undefined,
      namespace: undefined,
    }),
    computed: {
      ...mapState(['JWT', 'AdminViewport', 'Scale']),
      ...mapGetters(['Environment']),
      headers() {
        const items = [
          { text: '名称', value: 'name', align: 'start', width: 150 },
          { text: '指标', value: 'expr', align: 'start', width: 300 },
          { text: '评估时间', value: 'for', align: 'start' },
          { text: '接收器', value: 'receivers', align: 'start', width: 150 },
          { text: '使用状态', value: 'open', align: 'start', width: 80 },
        ];
        if (this.m_permisson_resourceAllow(this.$route.query.env)) {
          items.push({ text: '', value: 'action', align: 'center', width: 20 });
        }
        items.push({ text: '', value: 'data-table-expand' });
        return items;
      },
      SERVICE_MONITOR_NS() {
        return SERVICE_MONITOR_NS;
      },
    },
    watch: {
      '$route.query': {
        handler(newValue) {
          const { cluster, namespace } = this.params;
          const { cluster: newCluster, namespace: newNamespace } = newValue;
          const needRefresh = cluster !== newCluster || namespace !== newNamespace;
          if (needRefresh) {
            this.m_table_generateParams();
            this.prometheusRuleList();
          }
        },
        deep: true,
        immediate: true,
      },
    },
    methods: {
      customFilter() {
        if (this.$route.query.search && this.$route.query.search.length > 0) {
          this.items = this.itemsCopy.filter((item) => {
            return (
              item.name && item.name.toLocaleLowerCase().indexOf(this.$route.query.search.toLocaleLowerCase()) > -1
            );
          });
        } else {
          this.items = this.itemsCopy;
        }
        // this.m_table_generateSelectResource()
      },
      initAlertStatus() {
        this.alertStatus = { inactive: 0, firing: 0, pending: 0 };
        this.items.forEach((item) => {
          this.alertStatus[item.state]++;
        });
      },
      stateFilter() {
        this.items = this.itemsCopy.filter((item) => {
          return this.alertStateFilter.length === 0 ? true : this.alertStateFilter.indexOf(item.state) !== -1;
        });
        // this.m_table_generateSelectResource()
      },
      async prometheusRuleList() {
        this.params.isAdmin = this.AdminViewport;
        const { cluster, namespace } = this.$route.query;
        this.cluster = cluster;
        this.namespace = namespace;
        if (!this.cluster || !this.namespace) return;

        const data = await getPrometheusRuleList(this.cluster, this.namespace, this.params);

        // 将index添加到id属性上
        this.items = [];
        this.items = data.map((item, index) => {
          return {
            index: index,
            metadata: {
              name: item.name,
              namespace: item.namespace,
            },
            name: item.name,
            receiversStr: (item.receivers || []).map((receiver) => receiver.name).join(', '),
            ...item,
          };
        });
        this.itemsCopy = deepCopy(this.items);
        this.initAlertStatus();
        // this.m_table_generateSelectResource()
        if (this.$route.query.search) this.customFilter();
      },
      onAlertStateChange() {
        this.alertStateFilter = [];
        this.alertStateArr.forEach((item, index) => {
          if (this.amenities.indexOf(index) !== -1) {
            this.alertStateFilter.push(Object.keys(item)[0]);
          }
        });
        this.stateFilter();
      },
      prometheusRuleDetail(item) {
        this.$router.push({
          name: 'prometheusrule-detail',
          params: Object.assign(this.$route.params, {
            namespace: item.namespace,
            name: item.name,
          }),
          query: this.$route.query,
        });
      },
      addPrometheusRule() {
        this.$refs.addPrometheusRule.open();
      },
      updatePrometheusRule(item) {
        this.$refs.updatePrometheusRule.open();
        this.$refs.updatePrometheusRule.init(item);
      },
      removePrometheusRule(item) {
        this.$store.commit('SET_CONFIRM', {
          title: `删除告警规则`,
          content: {
            text: `删除告警规则 ${item.name}`,
            type: 'delete',
            name: item.name,
          },
          param: { item },
          doFunc: async (param) => {
            await deletePrometheusRule(this.cluster, param.item.namespace, param.item.name, {
              source: 'kubegems-default-monitor-alert-rule',
            });
            this.prometheusRuleList();
          },
        });
      },
      async switchBlackList(item) {
        if (item.isOpen) {
          this.$store.commit('SET_CONFIRM', {
            title: `禁用告警规则`,
            content: { text: `禁用告警规则 ${item.name}`, type: 'confirm' },
            param: { item },
            doFunc: async (param) => {
              await postDisableAlertRule(this.cluster, param.item.namespace, param.item.name);
              this.prometheusRuleList();
            },
          });
        } else {
          this.$store.commit('SET_CONFIRM', {
            title: `启用告警规则`,
            content: { text: `启用告警规则 ${item.name}`, type: 'confirm' },
            param: { item },
            doFunc: async (param) => {
              await postEnableAlertRule(this.cluster, param.item.namespace, param.item.name);
              this.prometheusRuleList();
            },
          });
        }
      },
      onPageSizeChange(size) {
        this.page = 1;
        this.itemsPerPage = size;
      },
      onPageIndexChange(page) {
        this.page = page;
      },
      onRowClick(item, { expand, isExpanded }) {
        expand(!isExpanded);
      },
    },
  };
</script>

<style lang="scss" scoped>
  .break-word {
    word-break: break-all;
  }
  .chip-width {
    width: 70px;
    display: block;
    text-align: center;
  }
  .font-weight {
    font-weight: 600;
  }
</style>
