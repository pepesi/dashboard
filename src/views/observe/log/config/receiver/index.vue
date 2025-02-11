<template>
  <v-container class="pa-0" fluid>
    <v-card flat>
      <v-card-title class="px-0">
        <BaseFilter
          :default="{ items: [], text: '接收器名称', value: 'search' }"
          :filters="filters"
          @refresh="filterList"
        />
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
                <v-btn color="primary" text @click="addReceiver">
                  <v-icon left>mdi-plus-box</v-icon>
                  创建接收器
                </v-btn>
              </v-flex>
              <!-- <v-flex>
                <v-btn
                  text
                  color="error"
                  @click="
                    batchRemoveResource('接收器', 'Receiver', receiverList)
                  "
                >
                  <v-icon left>mdi-minus-box</v-icon>
                  删除接收器
                </v-btn>
              </v-flex> -->
            </v-card-text>
          </v-card>
        </v-menu>
      </v-card-title>
      <v-card-text class="px-0">
        <v-data-table
          class="kubegems__table-row-pointer"
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
          <template #[`item.member`]="{ item }">
            {{ item.member > 0 ? item.member : '' }}
          </template>
          <template #[`item.channel`]="{ item }">
            <span>{{ getChannel(item) }}</span>
          </template>
          <template #expanded-item="{ headers, item }">
            <td class="my-2 py-2" :colspan="headers.length">
              <v-flex
                v-for="(webhook, index) in item.webhookConfigs"
                :key="`webhook${index}`"
                class="text-body-2 break-word my-1"
              >
                <div class="text-subtitle-2 kubegems__text">
                  {{ `Webhook${index + 1}: ` }}
                </div>
                <a class="ml-2">{{ webhook.url }}</a>
              </v-flex>

              <v-flex
                v-for="(email, index) in item.emailConfigs"
                :key="`email${index}`"
                class="text-body-2 break-word my-1"
              >
                <div class="text-subtitle-2 kubegems__text">
                  {{ `邮箱${index + 1}: ` }}
                </div>
                <v-flex class="ml-2">
                  <div>{{ `发件人:` }}{{ email.from }}</div>
                  <div>{{ `SMTP服务器:` }}{{ email.smtpServer }}</div>
                  <span>{{ `收件人:` }}</span>
                  <v-chip v-for="(item, key) in email.to.split(',')" :key="key" class="mx-1" color="success" small>
                    {{ item }}
                  </v-chip>
                </v-flex>
              </v-flex>
            </td>
          </template>
          <template #[`item.action`]="{ item }">
            <template v-if="!item.name.endsWith('default-webhook')">
              <v-flex :id="`r${item.index}`" />
              <v-menu :attach="`#r${item.index}`" left>
                <template #activator="{ on }">
                  <v-btn icon>
                    <v-icon color="primary" x-small v-on="on"> fas fa-ellipsis-v </v-icon>
                  </v-btn>
                </template>
                <v-card>
                  <v-card-text class="pa-2">
                    <v-flex>
                      <v-btn color="primary" small text @click.stop="updateReceiver(item)"> 编辑 </v-btn>
                    </v-flex>
                    <v-flex>
                      <v-btn color="error" small text @click.stop="removeReceiver(item)"> 删除 </v-btn>
                    </v-flex>
                  </v-card-text>
                </v-card>
              </v-menu>
            </template>
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
          @loaddata="receiverList"
        />
      </v-card-text>
    </v-card>
    <AddReceiver ref="addReceiver" mode="logging" @refresh="receiverList" />
    <UpdateReceiver ref="updateReceiver" mode="logging" @refresh="receiverList" />
  </v-container>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import { getReceiverList, deleteReceiver } from '@/api';
  import BaseFilter from '@/mixins/base_filter';
  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';
  import BaseTable from '@/mixins/table';
  import AddReceiver from '@/views/observe/monitor/config/receiver/components/AddReceiver';
  import UpdateReceiver from '@/views/observe/monitor/config/receiver/components/UpdateReceiver';

  export default {
    name: 'Receiver',
    components: {
      AddReceiver,
      UpdateReceiver,
    },
    mixins: [BaseFilter, BasePermission, BaseResource, BaseTable],
    data: () => ({
      filters: [{ text: '接收器名称', value: 'search', items: [] }],
      items: [],
      page: 1,
      pageCount: 0,
      itemsPerPage: 10,
      params: {
        scope: 'logging',
      },
    }),
    computed: {
      ...mapState(['JWT', 'AdminViewport']),
      ...mapGetters(['Environment']),
      headers() {
        const items = [
          { text: '名称', value: 'name', align: 'start' },
          { text: '渠道', value: 'channel', align: 'start' },
        ];
        if (this.m_permisson_resourceAllow(this.$route.query.env)) {
          items.push({ text: '', value: 'action', align: 'center', width: 20 });
        }
        items.push({ text: '', value: 'data-table-expand' });
        return items;
      },
    },
    watch: {
      '$store.state.NamespaceFilter': {
        handler: function (namespace) {
          if (namespace && !namespace.Mounted) {
            this.params.page = 1;
            this.params.namespace = namespace.Namespace;
            this.receiverList();
          }
        },
        deep: true,
      },
      '$route.query': {
        handler(newValue) {
          const { cluster, namespace } = this.params;
          const { cluster: newCluster, namespace: newNamespace } = newValue;
          const needRefresh = cluster !== newCluster || namespace !== newNamespace;
          if (needRefresh) {
            this.m_table_generateParams();
            this.receiverList();
          }
        },
        deep: true,
        immediate: true,
      },
    },
    methods: {
      async receiverList() {
        if (!this.$route.query.cluster || !this.$route.query.namespace) {
          return;
        }
        const data = await getReceiverList(this.$route.query.cluster, this.$route.query.namespace, this.params);
        this.items = data;
        this.items = this.items.map((d, index) => {
          return {
            metadata: {
              name: d.name,
              namespace: d.namespace,
            },
            index: index,
            ...d,
          };
        });
      },
      filterList(params) {
        const defaultparams = {
          search: '',
        };
        for (const key in defaultparams) {
          if (params[key]) {
            defaultparams[key] = this.params[key];
          }
        }
        Object.assign(defaultparams, params);
        this.params = defaultparams;
        this.$router.replace({ query: { ...this.$route.query, ...this.params } });
        this.receiverList();
      },
      addReceiver() {
        this.$refs.addReceiver.open();
      },
      updateReceiver(item) {
        this.$refs.updateReceiver.init(item);
        this.$refs.updateReceiver.open();
      },
      removeReceiver(item) {
        this.$store.commit('SET_CONFIRM', {
          title: `删除接收器`,
          content: {
            text: `删除接收器 ${item.name}`,
            type: 'delete',
            name: item.name,
          },
          param: { item },
          doFunc: async (param) => {
            await deleteReceiver(this.$route.query.cluster, param.item.namespace, param.item.name, {
              source: 'kubegems-default-logging-alert-rule',
            });
            this.receiverList();
          },
        });
      },
      getChannel(item) {
        let counter = 0;
        if (item.emailConfigs && item.emailConfigs.length > 0) {
          counter++;
        }
        if (item.webhookConfigs && item.webhookConfigs.length > 0) {
          counter++;
        }
        return counter;
      },
      onPageSizeChange(size) {
        this.params.page = 1;
        this.params.size = size;
      },
      onPageIndexChange(page) {
        this.params.page = page;
      },
      onRowClick(item, { expand, isExpanded }) {
        expand(!isExpanded);
      },
    },
  };
</script>
