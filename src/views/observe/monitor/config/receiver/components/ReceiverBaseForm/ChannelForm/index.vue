<template>
  <v-form ref="form" v-model="valid" class="my-2" lazy-validation>
    <v-expand-transition>
      <v-card v-show="expand" class="my-2 pa-2 kubegems__expand-transition" :elevation="4">
        <v-card-text class="pa-0">
          <v-sheet class="pt-2 px-2">
            <v-flex class="float-left text-subtitle-2 pt-5 primary--text kubegems__min-width">
              <span>告警渠道</span>
            </v-flex>
            <v-flex class="float-left ml-0 kubegems__form-width">
              <v-autocomplete
                v-model="receiverType"
                class="my-0"
                color="primary"
                hide-selected
                :items="receiverTypeItems"
                label="告警渠道"
                no-data-text="暂无可选数据"
                :readonly="type === null ? false : true"
                required
                :rules="channelRule"
                value="port"
                @change="onReceiverTypeChange"
              >
                <template #selection="{ item }">
                  <v-chip class="mx-1" color="primary" small>
                    {{ item['text'] }}
                  </v-chip>
                </template>
              </v-autocomplete>
            </v-flex>
          </v-sheet>
          <div class="kubegems__clear-float" />
          <component
            :is="formComponent"
            :ref="formComponent"
            :config-index="configIndex"
            :namespace="namespace"
            :obj="obj"
            :type="type"
            @addData="addData"
            @closeCard="closeCard"
          />
        </v-card-text>
      </v-card>
    </v-expand-transition>
  </v-form>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import EmailForm from './EmailForm';
  import WebhookForm from './WebhookForm';

  import BaseResource from '@/mixins/resource';
  import { required } from '@/utils/rules';

  export default {
    name: 'ChannelForm',
    components: {
      EmailForm,
      WebhookForm,
    },
    mixins: [BaseResource],
    props: {
      configIndex: {
        type: Number,
        default: () => null,
      },
      namespace: {
        type: String,
        default: () => '',
      },
      obj: {
        type: Object,
        default: () => null,
      },
      type: {
        type: String,
        default: () => null,
      },
    },
    data: () => ({
      valid: false,
      expand: false,
      receiverType: 'Email',
      formComponent: 'EmailForm',
      receiverTypeItems: [
        { text: 'Email', value: 'Email' },
        { text: 'Webhook', value: 'Webhook' },
      ],
      channelRule: [required],
    }),
    computed: {
      ...mapState(['Admin', 'AdminViewport']),
      ...mapGetters(['Cluster']),
    },
    methods: {
      // eslint-disable-next-line vue/no-unused-properties
      init() {
        if (this.type && this.configIndex != null) {
          this.receiverType = this.type;
        }
        this.onReceiverTypeChange();
        this.$nextTick(() => {
          this.$refs[this.formComponent].init();
        });
      },
      closeCard() {
        this.expand = false;
        this.$emit('closeOverlay');
      },

      addData(config) {
        switch (this.receiverType) {
          case 'Email':
            this.type === 'Email'
              ? this.$emit('updateData', this.receiverType, this.configIndex, config)
              : this.$emit('addData', this.receiverType, config);

            break;
          case 'Webhook':
            this.type === 'Webhook'
              ? this.$emit('updateData', this.receiverType, this.configIndex, config)
              : this.$emit('addData', this.receiverType, config);
            break;
        }
        this.closeCard();
      },
      onReceiverTypeChange() {
        switch (this.receiverType) {
          case 'Email':
            this.formComponent = 'EmailForm';
            break;
          case 'Webhook':
            this.formComponent = 'WebhookForm';
            break;
        }
      },
      // eslint-disable-next-line vue/no-unused-properties
      expandCard() {
        this.expand = true;
      },
    },
  };
</script>
