<template>
  <BaseDialog v-model="dialog" icon="mdi-chart-areaspline" title="创建监控图" :width="1000" @reset="reset">
    <template #content>
      <component :is="formComponent" :ref="formComponent" />
    </template>
    <template #action>
      <v-btn class="float-right" color="primary" :loading="Circular" text @click="addGraph"> 确定 </v-btn>
    </template>
  </BaseDialog>
</template>

<script>
  import { mapState } from 'vuex';

  import GraphBaseForm from './GraphBaseForm';

  import { putUpdateMonitorDashboard } from '@/api';
  import { deepCopy } from '@/utils/helpers';

  export default {
    name: 'AddGraph',
    components: {
      GraphBaseForm,
    },
    props: {
      dashboard: {
        type: Object,
        default: () => null,
      },
      environment: {
        type: Object,
        default: () => {},
      },
    },
    data() {
      return {
        dialog: false,
        formComponent: 'GraphBaseForm',
        dashboardCopy: null,
      };
    },
    computed: {
      ...mapState(['Circular']),
    },
    watch: {
      dashboard: {
        handler(newValue) {
          if (newValue) {
            this.dashboardCopy = deepCopy(newValue);
          }
        },
        deep: true,
      },
    },
    methods: {
      // eslint-disable-next-line vue/no-unused-properties
      open() {
        this.dialog = true;
      },
      reset() {
        this.dialog = false;
        this.$refs[this.formComponent].reset();
      },
      async addGraph() {
        if (this.$refs[this.formComponent].validate()) {
          let data = '';
          if (this.formComponent === 'GraphBaseForm') {
            data = this.$refs[this.formComponent].getData();
            if (!this.dashboardCopy.graphs) {
              this.dashboardCopy.graphs = [];
            }
            if (
              !this.dashboardCopy.graphs.some((g) => {
                return g.name === data.name;
              })
            ) {
              this.dashboardCopy.graphs.push(data);
            }
          }
          await putUpdateMonitorDashboard(this.environment.value, this.dashboardCopy.id, this.dashboardCopy);
          this.reset();
          this.$emit('refresh');
        }
      },
    },
  };
</script>
