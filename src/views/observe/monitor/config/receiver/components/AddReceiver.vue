<template>
  <BaseDialog v-model="dialog" icon="mdi-call-received" title="创建接收器" :width="1000" @reset="reset">
    <template #content>
      <component :is="formComponent" :ref="formComponent" title="Receiver" />
    </template>
    <template #action>
      <v-btn class="float-right mx-2" color="primary" :loading="Circular" text @click="addReceiver"> 确定 </v-btn>
    </template>
  </BaseDialog>
</template>

<script>
  import { mapState } from 'vuex';

  import ReceiverBaseForm from './ReceiverBaseForm';

  import { postAddReceiver } from '@/api';
  import BaseResource from '@/mixins/resource';

  export default {
    name: 'AddReceiver',
    components: {
      ReceiverBaseForm,
    },
    mixins: [BaseResource],
    props: {
      mode: {
        type: String,
        default: () => 'monitor',
      },
    },
    data: () => ({
      dialog: false,
      formComponent: 'ReceiverBaseForm',
    }),
    computed: {
      ...mapState(['Circular', 'AdminViewport']),
    },
    methods: {
      // eslint-disable-next-line vue/no-unused-properties
      open() {
        this.dialog = true;
      },
      async addReceiver() {
        if (this.$refs[this.formComponent].validate()) {
          let data = this.$refs[this.formComponent].getData();
          if (this.mode === 'monitor') {
            data.source = 'kubegems-default-monitor-alert-rule';
          } else {
            data.source = 'kubegems-default-logging-alert-rule';
          }
          data = this.m_resource_beautifyData(data);
          await postAddReceiver(this.$route.query.cluster, this.$route.query.namespace, data);
          this.reset();
          this.$emit('refresh');
        }
      },
      reset() {
        this.dialog = false;
        this.$refs[this.formComponent].reset();
        this.formComponent = 'ReceiverBaseForm';
      },
    },
  };
</script>
