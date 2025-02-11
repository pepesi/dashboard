<template>
  <v-form ref="form" v-model="valid" lazy-validation @submit.prevent>
    <BaseSubTitle title="任务定义" />
    <v-card-text class="pa-2">
      <v-row v-if="manifest">
        <v-col cols="6">
          <v-autocomplete
            v-model="resourceKind"
            class="my-0"
            color="primary"
            hide-selected
            :items="kinds"
            label="资源"
            no-data-text="暂无可选数据"
            :readonly="edit"
            :rules="objRules.kindRule"
            @change="onKindChange"
          >
            <template #selection="{ item }">
              <v-chip class="mx-1" color="primary" small>
                {{ item['text'] }}
              </v-chip>
            </template>
          </v-autocomplete>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="6">
          <v-text-field
            v-model="obj.metadata.name"
            class="my-0"
            label="名称"
            :readonly="edit"
            required
            :rules="objRules.nameRule"
          />
        </v-col>
        <v-col v-if="AdminViewport && !manifest" cols="6">
          <v-autocomplete
            v-model="obj.metadata.namespace"
            class="my-0"
            color="primary"
            hide-selected
            :items="m_select_namespaceItems"
            label="命名空间"
            no-data-text="暂无可选数据"
            :readonly="edit"
            :rules="objRules.namespaceRule"
            @focus="onNamespaceSelectFocus(ThisCluster)"
          >
            <template #selection="{ item }">
              <v-chip class="mx-1" color="primary" small>
                {{ item['text'] }}
              </v-chip>
            </template>
          </v-autocomplete>
        </v-col>
      </v-row>
    </v-card-text>

    <BaseSubTitle title="任务设置" />
    <v-card-text class="pa-2">
      <v-row>
        <v-col cols="6">
          <v-text-field v-model="obj.spec.backoffLimit" class="my-0" label="最大重试次数" required type="number" />
        </v-col>
        <v-col cols="6">
          <v-text-field v-model="obj.spec.completions" class="my-0" label="完成数" required type="number" />
        </v-col>
        <v-col cols="6">
          <v-text-field v-model="obj.spec.parallelism" class="my-0" label="并行数" required type="number" />
        </v-col>
        <v-col cols="6">
          <v-text-field
            v-model="obj.spec.activeDeadlineSeconds"
            class="my-0"
            label="退出超时时限(秒)"
            required
            type="number"
          />
        </v-col>
        <v-col cols="6">
          <v-autocomplete
            v-model="obj.spec.template.spec.restartPolicy"
            class="my-0"
            color="primary"
            hide-selected
            :items="restartPolicys"
            label="重启策略"
            no-data-text="暂无可选数据"
          >
            <template #selection="{ item }">
              <v-chip class="mx-1" color="primary" small>
                {{ item['text'] }}
              </v-chip>
            </template>
          </v-autocomplete>
        </v-col>
      </v-row>
    </v-card-text>
  </v-form>
</template>

<script>
  import { mapState } from 'vuex';

  import BaseResource from '@/mixins/resource';
  import BaseSelect from '@/mixins/select';
  import { deepCopy } from '@/utils/helpers';
  import { k8sName, required } from '@/utils/rules';

  export default {
    name: 'JobBaseInfo',
    mixins: [BaseResource, BaseSelect],
    props: {
      app: {
        type: Object,
        default: () => {},
      },
      edit: {
        type: Boolean,
        default: () => false,
      },
      item: {
        type: Object,
        default: () => null,
      },
      kind: {
        type: String,
        default: () => 'Job',
      },
      kinds: {
        type: Array,
        default: () => [],
      },
      manifest: {
        type: Boolean,
        default: () => false,
      },
    },
    data() {
      return {
        valid: false,
        resourceKind: '',
        restartPolicys: [
          { text: 'Never (故障时创建新的容器组)', value: 'Never' },
          {
            text: 'OnFailure (故障时内部重启容器)',
            value: 'OnFailure',
          },
        ],
        obj: {
          apiVersion: 'batch/v1',
          kind: 'Job',
          metadata: {
            name: '',
            namespace: null,
          },
          spec: {
            parallelism: 0,
            completions: 0,
            backoffLimit: 0,
            activeDeadlineSeconds: 0,
            template: {
              spec: {
                restartPolicy: 'Never',
              },
              metadata: {
                labels: {},
              },
            },
          },
        },
      };
    },
    computed: {
      ...mapState(['AdminViewport', 'ApiResources']),
      objRules() {
        return {
          nameRule: [required, k8sName],
          namespaceRule: [required],
          kindRule: [required],
        };
      },
    },
    watch: {
      item: {
        handler() {
          this.obj.apiVersion = this.ApiResources['job'] || 'batch/v1';
          this.loadData();
        },
        deep: true,
        immediate: true,
      },
    },
    methods: {
      async loadData() {
        this.$nextTick(() => {
          if (!this.manifest) {
            if (this.AdminViewport) {
              this.m_select_namespaceSelectData(this.ThisCluster);
            } else {
              this.obj.metadata.namespace = this.ThisNamespace;
            }
          } else {
            this.obj.metadata.name = `${this.app.ApplicationName}`;
          }
          this.obj = this.$_.merge(this.obj, deepCopy(this.item));
          this.resourceKind = this.kind;
          this.obj.kind = this.kind;
          this.obj.spec.template.spec.nodeSelector = {};
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      reset() {
        this.$refs.form.resetValidation();
        this.obj = this.$options.data().obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      init(data) {
        this.$nextTick(() => {
          this.obj = this.$_.merge(this.obj, deepCopy(data));
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      back(data) {
        this.$nextTick(() => {
          this.obj = deepCopy(data);
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return this.$refs.form.validate(true);
      },
      // eslint-disable-next-line vue/no-unused-properties
      getData() {
        return this.obj;
      },
      onKindChange() {
        this.$emit('change', this.resourceKind);
      },
      onNamespaceSelectFocus(clusterName) {
        this.m_select_namespaceSelectData(clusterName);
      },
      // eslint-disable-next-line vue/no-unused-properties
      checkSaved() {
        if (Object.prototype.hasOwnProperty.call(this, 'expand')) {
          return !this.expand;
        }
        return true;
      },
    },
  };
</script>
