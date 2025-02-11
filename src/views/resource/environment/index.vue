<template>
  <v-container fluid>
    <BaseViewportHeader v-if="!AdminViewport" :selectable="false" />
    <BaseBreadcrumb />
    <v-card>
      <v-card-title class="py-4">
        <BaseFilter
          :default="{ items: [], text: '环境名称', value: 'search' }"
          :filters="filters"
          :reload="false"
          @filter="customFilter"
          @refresh="m_filter_list"
        />
        <v-sheet class="text-subtitle-2 ml-4">租户</v-sheet>
        <v-sheet width="350">
          <v-autocomplete
            v-model="tenant"
            chips
            class="ml-2"
            color="primary"
            dense
            flat
            full-width
            hide-details
            hide-selected
            :items="m_select_tenantItems"
            label="租户"
            no-data-text="无数据"
            prepend-inner-icon="mdi-account-switch"
            solo
            @change="onTenantSelectChange"
            @focus="onTenantSelectFocus"
          >
            <template #selection="{ attrs, item, selected }">
              <v-chip color="primary" :input-value="selected" label small v-bind="attrs">
                <span class="pr-2">{{ item.text }}</span>
              </v-chip>
            </template>
          </v-autocomplete>
        </v-sheet>
        <v-spacer />
      </v-card-title>
      <v-card-text class="pa-0">
        <v-data-table
          class="mx-4"
          disable-sort
          :headers="headers"
          hide-default-footer
          :items="items"
          :items-per-page="itemsPerPage"
          no-data-text="暂无数据"
          :page.sync="page"
          @page-count="pageCount = $event"
        >
          <template #[`item.environmentName`]="{ item }">
            {{ item.EnvironmentName }}
          </template>
          <template #[`item.metaType`]="{ item }">
            <v-chip
              :color="
                $METATYPE_CN[item.MetaType] && $METATYPE_CN[item.MetaType].color
                  ? $METATYPE_CN[item.MetaType].color
                  : 'grey'
              "
              label
              small
            >
              {{ $METATYPE_CN[item.MetaType].cn }}
            </v-chip>
          </template>
          <template #[`item.creator`]="{ item }">
            {{ item.Creator.Username }}
          </template>
          <template #[`item.namespace`]="{ item }">
            {{ item.Namespace }}
          </template>
          <template #[`item.cpu`]="{ item }">{{ item.Cpu }} core</template>
          <template #[`item.memory`]="{ item }"> {{ item.Memory }} Gi </template>
          <template #[`item.storage`]="{ item }"> {{ item.Storage }} Gi </template>
          <template #[`item.usedCpu`]="{ item }">
            {{ item.UsedCpu.toFixed(1) }} core
            <v-progress-linear
              class="rounded font-weight-medium"
              :color="getColor(item.CpuPercentage)"
              height="15"
              :value="item.CpuPercentage"
            >
              <span class="white--text"> {{ item.CpuPercentage }}% </span>
            </v-progress-linear>
          </template>
          <template #[`item.usedMemory`]="{ item }">
            {{ item.UsedMemory.toFixed(1) }} Gi
            <v-progress-linear
              class="rounded font-weight-medium"
              :color="getColor(item.MemoryPercentage)"
              height="15"
              :value="item.MemoryPercentage"
            >
              <span class="white--text"> {{ item.MemoryPercentage }}% </span>
            </v-progress-linear>
          </template>
          <template #[`item.usedStorage`]="{ item }">
            {{ item.UsedStorage.toFixed(1) }} Gi
            <v-progress-linear
              class="rounded font-weight-medium"
              :color="getColor(item.StoragePercentage)"
              height="15"
              :value="item.StoragePercentage"
            >
              <span class="white--text"> {{ item.StoragePercentage }}% </span>
            </v-progress-linear>
          </template>
          <template #[`item.action`]="{ item }">
            <v-flex :id="`r${item.ID}`" />
            <v-menu :attach="`#r${item.ID}`" left>
              <template #activator="{ on }">
                <v-btn icon>
                  <v-icon color="primary" x-small v-on="on"> fas fa-ellipsis-v </v-icon>
                </v-btn>
              </template>
              <v-card>
                <v-card-text class="pa-2">
                  <v-flex>
                    <v-btn color="primary" small text @click="updateEnvironment(item)"> 编辑 </v-btn>
                  </v-flex>
                  <v-flex>
                    <v-btn color="error" small text @click="removeEnvironment(item)"> 删除 </v-btn>
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
          @loaddata="environmentTenantResourceQuota(tenant)"
        />
      </v-card-text>
    </v-card>

    <UpdateEnvironment ref="updateEnvironment" @refresh="environmentTenantResourceQuota(tenant)" />
  </v-container>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import UpdateEnvironment from './components/UpdateEnvironment';

  import { deleteEnvironment, getEnvironmentTenantResourceQuota } from '@/api';
  import BaseFilter from '@/mixins/base_filter';
  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';
  import BaseSelect from '@/mixins/select';
  import BaseTable from '@/mixins/table';
  import { sizeOfStorage, sizeOfCpu, deepCopy } from '@/utils/helpers';

  export default {
    name: 'Environment',
    components: {
      UpdateEnvironment,
    },
    mixins: [BaseFilter, BasePermission, BaseResource, BaseSelect, BaseTable],
    inject: ['reload'],
    data: () => ({
      items: [],
      itemsCopy: [],
      tenant: -1,
      params: {},
      page: 1,
      pageCount: 0,
      itemsPerPage: 10,
      filters: [{ text: '环境名称', value: 'search', items: [] }],
    }),
    computed: {
      ...mapState(['JWT', 'Admin', 'AdminViewport']),
      ...mapGetters(['Project', 'Tenant', 'Cluster']),
      headers() {
        const items = [
          { text: '环境空间', value: 'environmentName', align: 'start' },
          { text: '环境类型', value: 'metaType', align: 'start' },
          { text: '命名空间', value: 'namespace', align: 'start' },
          { text: '创建人', value: 'creator', align: 'start' },
          { text: 'CPU', value: 'cpu', align: 'start' },
          { text: '内存', value: 'memory', align: 'start' },
          { text: '存储', value: 'storage', align: 'start' },
          { text: '已使用CPU', value: 'usedCpu', align: 'start', width: 150 },
          { text: '已使用内存', value: 'usedMemory', align: 'start', width: 150 },
          {
            text: '已使用存储',
            value: 'usedStorage',
            align: 'start',
            width: 150,
          },
        ];
        if (this.m_permisson_projectAllow) {
          items.push({ text: '', value: 'action', align: 'center', width: 20 });
        }
        return items;
      },
    },
    async mounted() {
      if (this.JWT) {
        if (this.Tenant().ID > 0) {
          Object.assign(this.params, this.$route.query);
          await this.m_select_tenantSelectData();
          if (this.m_select_tenantItems.length > 0) {
            this.tenant = this.m_select_tenantItems[0].value;
            this.environmentTenantResourceQuota(this.tenant);
          }
        } else {
          this.$store.commit('SET_SNACKBAR', {
            text: `暂无租户`,
            color: 'warning',
          });
        }
      }
    },
    methods: {
      customFilter() {
        if (this.$route.query.search && this.$route.query.search.length > 0) {
          this.items = this.itemsCopy.filter((item) => {
            return (
              item.EnvironmentName &&
              item.EnvironmentName.toLocaleLowerCase().indexOf(this.$route.query.search.toLocaleLowerCase()) > -1
            );
          });
        } else {
          this.items = this.itemsCopy;
        }
        // this.m_table_generateSelectResource()
      },
      async environmentTenantResourceQuota(tenantid) {
        const data = await getEnvironmentTenantResourceQuota(tenantid, this.params);
        this.items = data;
        this.items.forEach((e) => {
          e.EnvironmentName = e.environment.EnvironmentName;
          e.MetaType = e.environment.MetaType;
          e.Namespace = e.environment.Namespace;
          e.Creator = e.environment.Creator;
          e.name = e.environment.EnvironmentName;
          e.ID = e.environment.ID;
          if (e.quota && e.quota.status.hard) {
            e.Cpu = e.quota.status.hard['limits.cpu'] ? parseFloat(sizeOfCpu(e.quota.status.hard['limits.cpu'])) : 0;
            e.Memory = e.quota.status.hard['limits.memory']
              ? parseFloat(sizeOfStorage(e.quota.status.hard['limits.memory']))
              : 0;
            e.Storage = e.quota.status.hard['requests.storage']
              ? parseFloat(sizeOfStorage(e.quota.status.hard['requests.storage']))
              : 0;
          } else {
            e.Cpu = 0;
            e.Memory = 0;
            e.Storage = 0;
          }
          if (e.quota && e.quota.status.used) {
            e.UsedCpu = e.quota.status.used['limits.cpu']
              ? parseFloat(sizeOfCpu(e.quota.status.used['limits.cpu']))
              : 0;
            e.UsedMemory = e.quota.status.used['limits.memory']
              ? parseFloat(sizeOfStorage(e.quota.status.used['limits.memory']))
              : 0;
            e.UsedStorage = e.quota.status.used['requests.storage']
              ? parseFloat(sizeOfStorage(e.quota.status.used['requests.storage']))
              : 0;
          } else {
            e.UsedCpu = 0;
            e.UsedMemory = 0;
            e.UsedStorage = 0;
          }
          e.CpuPercentage = e.Cpu > 0 ? ((e.UsedCpu / e.Cpu) * 100).toFixed(1) : 0;
          e.MemoryPercentage = e.Memory > 0 ? ((e.UsedMemory / e.Memory) * 100).toFixed(1) : 0;
          e.StoragePercentage = e.Storage > 0 ? ((e.UsedStorage / e.Storage) * 100).toFixed(1) : 0;
        });
        this.itemsCopy = deepCopy(this.items);
        if (this.$route.query.search) this.customFilter();
      },
      onTenantSelectChange() {
        if (this.tenant) this.environmentTenantResourceQuota(this.tenant);
        else {
          this.$store.commit('SET_SNACKBAR', {
            text: `请选择租户`,
            color: 'warning',
          });
        }
      },
      updateEnvironment(item) {
        this.$refs.updateEnvironment.init(item.environment);
        this.$refs.updateEnvironment.open();
      },
      removeEnvironment(item) {
        this.$store.commit('SET_CONFIRM', {
          title: `删除环境`,
          content: {
            text: `删除环境 ${item.EnvironmentName} ，${
              item.DeletePolicy === 'delLabels'
                ? '当前删除策略为 delLabels，该策略仅删除关联'
                : '当前删除策略为 delNamespace，该策略会删除整个命名空间，请谨慎操作'
            }`,
            type: 'delete',
            name: item.EnvironmentName,
            level: item.DeletePolicy === 'delLabels' ? 'warning' : 'error',
          },
          param: { item },
          doFunc: async (param) => {
            await deleteEnvironment(param.item.environment.ID);
            this.$store.commit('CLEAR_RESOURCE');
            this.$router.push({
              name: 'resource-dashboard',
              params: this.$route.params,
            });
            this.environmentTenantResourceQuota(this.tenant);
          },
        });
      },
      onTenantSelectFocus() {
        this.m_select_tenantSelectData();
      },
      onPageSizeChange(size) {
        this.page = 1;
        this.itemsPerPage = size;
      },
      onPageIndexChange(page) {
        this.page = page;
      },
      getColor(percentage) {
        return percentage ? (percentage < 60 ? 'primary' : percentage < 80 ? 'warning' : 'red darken-1') : 'primary';
      },
    },
  };
</script>

<style>
  .v-data-table .v-input__slot {
    background: none !important;
  }
  .v-expansion-panel-header .v-input__slot {
    background: none !important;
  }
</style>
