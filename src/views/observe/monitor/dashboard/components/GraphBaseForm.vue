<template>
  <v-form ref="form" v-model="valid" lazy-validation>
    <BaseSubTitle title="监控图定义" />
    <v-card-text class="pa-2">
      <v-row>
        <v-col cols="6">
          <v-text-field
            v-model="obj.name"
            class="my-0"
            label="名称"
            :readonly="edit"
            required
            :rules="objRules.nameRule"
          />
        </v-col>
        <v-col cols="6">
          <v-autocomplete
            v-model="mode"
            class="my-0"
            color="primary"
            hide-selected
            :items="modeItems"
            label="模式"
            no-data-text="暂无可选数据"
            :readonly="edit"
            :rules="objRules.modeRule"
            @change="onModeChange"
          >
            <template #selection="{ item }">
              <v-chip class="mx-1" color="primary" small>
                {{ item['text'] }}
              </v-chip>
            </template>
          </v-autocomplete>
        </v-col>

        <!-- 资源 -->
        <template v-if="mode === 'template'">
          <v-col cols="6">
            <v-autocomplete
              v-model="obj.promqlGenerator.resource"
              class="my-0"
              color="primary"
              hide-selected
              :items="resourceItems"
              label="资源"
              no-data-text="暂无可选数据"
              :rules="objRules.resourceRule"
              @change="onResourceChange"
            >
              <template #selection="{ item }">
                <v-chip class="mx-1" color="primary" small>
                  {{ item['text'] }}
                </v-chip>
              </template>
            </v-autocomplete>
          </v-col>
          <!-- 资源 -->

          <!-- 规则 -->
          <v-col cols="6">
            <v-autocomplete
              v-model="obj.promqlGenerator.rule"
              class="my-0"
              color="primary"
              :disabled="!obj.promqlGenerator.resource"
              hide-selected
              :items="ruleItems"
              label="规则"
              no-data-text="暂无可选数据"
              :rules="objRules.ruleRule"
              @change="onRuleChange"
            >
              <template #selection="{ item }">
                <v-chip class="mx-1" color="primary" small>
                  {{ item['text'] }}
                </v-chip>
              </template>
            </v-autocomplete>
          </v-col>
          <!-- 规则 -->

          <!-- 单位 -->
          <v-col cols="6">
            <v-autocomplete
              v-model="obj.promqlGenerator.unit"
              class="my-0"
              color="primary"
              :disabled="!obj.promqlGenerator.rule || !unitItems.length"
              hide-selected
              :items="unitItems"
              label="单位"
              no-data-text="暂无可选数据"
              :rules="unitItems.length ? objRules.unitRule : undefined"
            >
              <template #selection="{ item }">
                <v-chip class="mx-1" color="primary" small>
                  {{ item['text'] }}
                </v-chip>
              </template>
            </v-autocomplete>
          </v-col>
        </template>
        <template v-if="mode === 'ql'">
          <v-col cols="12">
            <v-textarea v-model="obj.expr" auto-grow label="查询语句" :rules="objRules.exprRule" />
          </v-col>
          <v-col cols="6">
            <v-autocomplete
              v-model="obj.unit"
              class="my-0"
              color="primary"
              hide-selected
              :items="unitAllItems"
              label="单位"
              no-data-text="暂无可选数据"
            >
              <template #selection="{ item }">
                <v-chip class="mx-1" color="primary" small>
                  {{ item['text'] }}
                </v-chip>
              </template>
            </v-autocomplete>
          </v-col>
        </template>
      </v-row>
    </v-card-text>
  </v-form>
</template>

<script>
  import { mapState } from 'vuex';

  import { getSystemConfigData, getMyConfigData } from '@/api';
  import { deepCopy } from '@/utils/helpers';
  import { required } from '@/utils/rules';

  export default {
    name: 'GraphBaseForm',
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
      return {
        valid: false,
        obj: {
          name: '',
          promqlGenerator: {
            resource: '',
            rule: '',
            unit: '',
          },
          expr: '',
          unit: '',
        },
        objRules: {
          nameRule: [required],
          resourceRule: [required],
          ruleRule: [required],
          unitRule: [required],
          exprRule: [required],
          modeRule: [required],
        },
        metricsConfig: {},
        mode: 'template',
        modeItems: [
          { text: '由模版生成', value: 'template' },
          { text: '由PromQl生成', value: 'ql' },
        ],
      };
    },
    computed: {
      ...mapState(['AdminViewport']),
      resourceItems() {
        const resourcesObj = this.metricsConfig.resources || {};
        return Object.keys(resourcesObj).map((key) => {
          if (resourcesObj[key].namespaced) {
            return {
              text: resourcesObj[key].showName,
              value: key,
            };
          }
        });
      },
      ruleItems() {
        if (this.metricsConfig.resources && this.obj.promqlGenerator.resource) {
          const rulesObj = this.metricsConfig.resources[this.obj.promqlGenerator.resource].rules;
          return Object.keys(rulesObj).map((key) => ({
            text: rulesObj[key].showName,
            value: key,
          }));
        }

        return [];
      },
      unitItems() {
        if (this.metricsConfig.resources && this.obj.promqlGenerator.resource && this.obj.promqlGenerator.rule) {
          const units =
            this.metricsConfig.resources[this.obj.promqlGenerator.resource].rules[this.obj.promqlGenerator.rule]
              .units || [];
          return units.map((unit) => ({
            text: this.metricsConfig.units[unit],
            value: unit,
          }));
        }
        return [];
      },
      unitAllItems() {
        const units = this.metricsConfig.units || {};
        return Object.keys(units).map((unit) => ({
          text: this.metricsConfig.units[unit],
          value: unit,
        }));
      },
    },
    watch: {
      item: {
        handler(newValue) {
          if (newValue) {
            this.obj = deepCopy(newValue);
            this.mode = this.obj.promqlGenerator ? 'template' : 'ql';
          }
        },
        deep: true,
        immediate: true,
      },
    },
    mounted() {
      this.$nextTick(() => {
        this.getMonitorConfig();
      });
    },
    methods: {
      async getMonitorConfig() {
        let data = {};
        if (this.AdminViewport) {
          data = await getSystemConfigData('Monitor');
        } else {
          data = await getMyConfigData('Monitor');
        }
        this.metricsConfig = data.content || {};
      },
      onModeChange() {
        if (this.mode === 'template') {
          this.obj.promqlGenerator = {
            resource: '',
            rule: '',
            unit: '',
          };
          this.obj.expr = null;
          this.obj.unit = null;
        } else if (this.mode === 'ql') {
          this.obj.promqlGenerator = null;
          this.obj.expr = '';
          this.obj.unit = '';
        }
      },
      onResourceChange() {
        this.obj.promqlGenerator.rule = '';
        this.obj.promqlGenerator.unit = '';
      },
      onRuleChange() {
        this.obj.promqlGenerator.unit = '';
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return this.$refs.form.validate(true);
      },
      // eslint-disable-next-line vue/no-unused-properties
      getData() {
        return this.obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      reset() {
        this.$refs.form.resetValidation();
        this.obj = this.$options.data().obj;
        this.mode = 'template';
      },
    },
  };
</script>
