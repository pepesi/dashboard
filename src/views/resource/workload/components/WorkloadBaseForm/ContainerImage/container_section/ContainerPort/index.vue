<template>
  <v-form v-model="valid" class="my-2" lazy-validation @submit.prevent>
    <v-flex :class="expand ? 'kubegems__overlay' : ''" />
    <v-expand-transition>
      <v-card v-show="expand" class="my-2 pa-2 kubegems__expand-transition" :elevation="4">
        <v-card-text class="pa-0">
          <v-form ref="form" v-model="valid" lazy-validation @submit.prevent>
            <v-sheet class="pt-2 px-2">
              <v-flex class="float-left text-subtitle-2 pt-5 primary--text kubegems__min-width">
                <span>端口定义</span>
              </v-flex>
              <v-flex class="float-left ml-2 kubegems__form-width">
                <v-text-field v-model="obj.name" class="my-0" label="名称" required :rules="objRules.nameRule" />
              </v-flex>
              <v-flex class="float-left ml-2 kubegems__form-width">
                <v-text-field
                  v-model="obj.containerPort"
                  class="my-0"
                  label="端口"
                  required
                  :rules="objRules.containerPortRule"
                  type="number"
                />
              </v-flex>
              <div class="kubegems__clear-float" />
            </v-sheet>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-spacer />
          <v-btn color="error" small text @click="closeCard"> 取消 </v-btn>
          <v-btn color="primary" small text @click="addData"> 保存 </v-btn>
        </v-card-actions>
      </v-card>
    </v-expand-transition>

    <Port :container-copy="containerCopy" @removeData="removeData" @updateData="updateData" />

    <v-flex class="grey lighten-4 rounded ma-2">
      <v-list-item two-line>
        <v-list-item-content class="py-2">
          <v-list-item-subtitle class="text-body-2 py-0 text-center">
            <v-btn color="primary" text @click="expandCard">
              <v-icon left small> mdi-plus </v-icon>
              添加容器端口
            </v-btn>
          </v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-flex>
  </v-form>
</template>

<script>
  import Port from './Port';

  import { deepCopy } from '@/utils/helpers';
  import { required, port } from '@/utils/rules';

  export default {
    name: 'ContainerPort',
    components: {
      Port,
    },
    props: {
      container: {
        type: Object,
        default: () => null,
      },
    },
    data() {
      return {
        valid: false,
        expand: false,
        obj: {
          name: '',
          protocol: 'TCP',
          containerPort: '',
        },
        objRules: {
          nameRule: [required],
          containerPortRule: [port],
        },
        containerCopy: null,
      };
    },
    watch: {
      container() {
        if (this.container) this.containerCopy = deepCopy(this.container);
        else this.containerCopy = {};
      },
    },
    mounted() {
      if (this.container) this.containerCopy = deepCopy(this.container);
      else this.containerCopy = {};
    },
    methods: {
      expandCard() {
        this.expand = true;
      },
      closeCard() {
        this.expand = false;
        this.$refs.form.reset();
      },
      addData() {
        if (this.$refs.form.validate(true)) {
          if (!this.containerCopy.ports) {
            this.$set(this.containerCopy, 'ports', []);
          }
          const index = this.containerCopy.ports.findIndex((p) => {
            return p.containerPort === this.obj.containerPort;
          });
          if (index > -1) {
            this.$set(this.containerCopy.ports, index, deepCopy(this.obj));
          } else {
            const ports = this.containerCopy.ports;
            ports.push(deepCopy(this.obj));
            this.$set(this.containerCopy, 'ports', ports);
          }
          this.$emit('updateComponentData', this.containerCopy);
          this.closeCard();
        }
      },
      removeData(index) {
        this.$delete(this.containerCopy.ports, index);
        this.$emit('updateComponentData', this.containerCopy);
      },
      updateData(index) {
        const port = this.containerCopy.ports[index];
        this.obj = deepCopy(port);
        this.expandCard();
      },
    },
  };
</script>
