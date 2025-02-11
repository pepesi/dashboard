<template>
  <div>
    <BaseSubTitle title="基本配置" />
    <v-form ref="form" v-model="valid" lazy-validation>
      <v-row class="px-2 mt-0">
        <v-col cols="6">
          <v-autocomplete
            v-model="obj.kind"
            class="my-0"
            color="primary"
            hide-selected
            :items="typeItems"
            label="类型"
            no-data-text="暂无可选数据"
            :readonly="edit"
            :rules="objRules.kindRules"
          >
            <template #selection="{ item }">
              <v-chip class="mx-1" color="primary" small>
                {{ item['text'] }}
              </v-chip>
            </template>
          </v-autocomplete>
        </v-col>
        <v-col cols="6">
          <v-text-field
            v-model="obj.metadata.name"
            class="my-0"
            label="名称"
            :readonly="edit"
            required
            :rules="objRules.nameRules"
          />
        </v-col>

        <v-col cols="6">
          <v-select
            v-model="plugin"
            class="my-0"
            color="primary"
            hide-selected
            :items="pluginItems"
            label="插件类型"
            no-data-text="暂无可选数据"
            :readonly="edit"
            :rules="objRules.pluginRules"
            @change="onPluginChange"
          >
            <template #selection="{ item }">
              <v-chip class="mx-1" color="primary" small>
                {{ item['text'] }}
              </v-chip>
            </template>
          </v-select>
        </v-col>
      </v-row>

      <component :is="formComponent" :ref="formComponent" :edit="true" :item="obj" />
    </v-form>
  </div>
</template>

<script>
  import { mapState } from 'vuex';

  import Elasticsearch from './Elasticsearch';
  import Kafka from './Kafka';
  import Loki from './Loki';

  import { deepCopy } from '@/utils/helpers';
  import { required } from '@/utils/rules';

  export default {
    name: 'OutputBaseForm',
    components: {
      Elasticsearch,
      Loki,
      Kafka,
    },
    props: {
      edit: {
        type: Boolean,
        default: () => false,
      },
      item: {
        type: Object,
        default: () => null,
      },
    },
    data() {
      this.pluginItems = [
        { text: 'Loki', value: 'loki' },
        { text: 'Kafka', value: 'kafka' },
        { text: 'Elasticsearch', value: 'elasticsearch' },
      ];

      return {
        valid: false,
        obj: {
          apiVersion: 'logging.banzaicloud.io/v1beta1',
          kind: 'Output',
          metadata: {
            name: '',
            labels: {},
          },
          spec: {},
        },
        plugin: undefined,
        objRules: {
          kindRules: [required],
          nameRules: [required],
          pluginRules: [required],
        },
      };
    },
    computed: {
      ...mapState(['AdminViewport', 'ApiResources']),
      typeItems() {
        return [{ text: 'Output', value: 'Output' }].concat(
          this.AdminViewport ? [{ text: 'ClusterOutput', value: 'ClusterOutput' }] : [],
        );
      },
      formComponent() {
        return this.pluginItems.find((p) => {
          return p.value === this.plugin;
        })?.text;
      },
    },
    watch: {
      item: {
        handler() {
          this.obj.apiVersion = this.ApiResources['output'] || 'logging.banzaicloud.io/v1beta1';
          this.loadData();
        },
        deep: true,
        immediate: true,
      },
    },
    methods: {
      loadData() {
        this.$nextTick(() => {
          if (!this.item) {
            this.$refs.form.resetValidation();
          } else {
            this.obj = deepCopy(this.item);
            this.getPlugin();
          }
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      reset() {
        this.$refs.form && this.$refs.form.resetValidation();
        this.$refs[this.formComponent] && this.$refs[this.formComponent].reset();
        this.obj = this.$options.data().obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return (
          this.$refs.form &&
          this.$refs.form.validate(true) &&
          this.$refs[this.formComponent] &&
          this.$refs[this.formComponent].validate()
        );
      },
      onPluginChange(value) {
        this.pluginItems.forEach((plugin) => {
          delete this.obj.spec[plugin.value];
        });
        this.obj.spec[value] = {};
        if (value === 'kafka') {
          this.obj.spec[value].brokers = '';
          this.obj.spec[value].format = { type: 'json' };
        }
      },
      // eslint-disable-next-line vue/no-unused-properties
      checkSaved() {
        return true;
      },
      // eslint-disable-next-line vue/no-unused-properties
      setData(data) {
        this.obj = data;
        this.getPlugin();
      },
      // eslint-disable-next-line vue/no-unused-properties
      getData() {
        return this.obj;
      },
      getPlugin() {
        if (this.obj.spec.loki) {
          this.plugin = 'loki';
        } else if (this.obj.spec.kafka) {
          this.plugin = 'kafka';
        } else if (this.obj.spec.elasticsearch) {
          this.plugin = 'elasticsearch';
        }
      },
    },
  };
</script>
