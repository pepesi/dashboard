<template>
  <v-flex>
    <v-form ref="form" v-model="valid" lazy-validation @submit.prevent>
      <v-flex :class="expand ? 'kubegems__overlay' : ''" />
      <BaseSubTitle title="流量切换定义" />
      <v-card-text class="pa-2">
        <v-row v-for="(workload, index) in serviceCopy ? serviceCopy.workloads : []" :key="index">
          <v-col cols="6">
            <v-text-field
              class="my-0"
              label="目标负载(Destination Workload)"
              readonly
              required
              :value="workload.name"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="obj.route[index].weight"
              class="my-0"
              label="流量权重(Traffic Weight)"
              required
              :rules="objRules[index].weightRule"
              suffix="%"
              type="number"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-form>
  </v-flex>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import BaseResource from '@/mixins/resource';
  import BaseSelect from '@/mixins/select';
  import { deepCopy } from '@/utils/helpers';
  import { required } from '@/utils/rules';

  export default {
    name: 'TrafficShiftingBaseForm',
    mixins: [BaseResource, BaseSelect],
    props: {
      service: {
        type: Object,
        default: () => null,
      },
      vs: {
        type: Object,
        default: () => null,
      },
    },
    data: () => ({
      valid: false,
      expand: false,
      serviceCopy: null,
      routeDefault: {
        destination: {
          host: '',
          subset: '',
        },
        weight: 100,
      },
      obj: {
        route: [],
      },
    }),
    computed: {
      ...mapState(['Admin', 'AdminViewport']),
      ...mapGetters(['Cluster']),
      objRules() {
        const rules = [];
        if (this.serviceCopy) {
          this.serviceCopy.workloads.forEach(() => {
            rules.push({
              weightRule: [required, (v) => !!(parseInt(v) <= 100 && parseInt(v) >= 0) || '格式错误(示例:<=100整数)'],
            });
          });
        }
        return rules;
      },
    },
    watch: {
      vs: {
        handler: function () {
          if (this.vs) this.loadData(true);
        },
        deep: true,
        immediate: true,
      },
      service: {
        handler: function () {
          this.initObj();
        },
        deep: true,
        immediate: true,
      },
    },
    methods: {
      initObj() {
        this.serviceCopy = deepCopy(this.service);
        this.obj.route = [];
        if (this.serviceCopy) {
          const length = this.serviceCopy.workloads.length;
          const weight = parseInt(100 / length);
          const remainder = 100 % length;
          this.serviceCopy.workloads.forEach((w, index) => {
            const route = deepCopy(this.routeDefault);
            route.destination.host = `${this.serviceCopy.service.name}.${this.serviceCopy.service.namespace.name}.svc.cluster.local`;
            route.destination.subset = `${w.labels.version ? w.labels.version : ''}`;
            if (length === index + 1) {
              route.weight = weight + remainder;
            } else {
              route.weight = weight;
            }
            this.obj.route.push(route);
          });
        }
      },
      loadData(cover = false) {
        this.$nextTick(() => {
          if (cover) {
            this.obj = deepCopy(this.vs);
          }
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      reset() {
        this.serviceCopy = null;
        this.$refs.form.resetValidation();
        this.obj = deepCopy(this.$options.data().obj);
      },
      // eslint-disable-next-line vue/no-unused-properties
      getData() {
        return this.obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return this.$refs.form.validate(true);
      },
    },
  };
</script>
