<template>
  <v-flex>
    <v-form ref="form" v-model="valid" lazy-validation @submit.prevent>
      <v-flex :class="expand ? 'kubegems__overlay' : ''" />
      <BaseSubTitle title="密钥定义" />
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
          <v-col cols="6">
            <v-autocomplete
              v-model="obj.type"
              class="my-0"
              color="primary"
              hide-selected
              :items="types"
              label="密钥类型"
              no-data-text="暂无可选数据"
              :rules="objRules.typeRule"
              @change="onTypeChange"
              @click:clear="clearType"
              @keydown.enter="customType"
              @update:search-input="syncInput"
            >
              <template #selection="{ item }">
                <v-chip class="mx-1" color="primary" small>
                  {{ item['text'] }}
                </v-chip>
              </template>
            </v-autocomplete>
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

      <component
        :is="formComponent"
        :ref="formComponent"
        :data="obj.data"
        @addData="addData"
        @closeOverlay="closeExpand"
      />
      <BaseSubTitle title="密钥项" />
      <v-card-text class="pa-2">
        <SecretDataItem :data="obj.data" @expandCard="expandCard" @removeData="removeData" @updateData="updateData" />
      </v-card-text>
    </v-form>
  </v-flex>
</template>

<script>
  import { Base64 } from 'js-base64';
  import { mapGetters, mapState } from 'vuex';

  import SecretDataForm from './SecretDataForm';
  import SecretDataItem from './SecretDataItem';
  import SecretDockerconfigForm from './SecretDockerconfigForm';
  import SecretTlsForm from './SecretTlsForm';

  import BaseResource from '@/mixins/resource';
  import BaseSelect from '@/mixins/select';
  import { deepCopy } from '@/utils/helpers';
  import { k8sName, required } from '@/utils/rules';

  export default {
    name: 'SecretBaseForm',
    components: {
      SecretDataForm,
      SecretDataItem,
      SecretDockerconfigForm,
      SecretTlsForm,
    },
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
        default: () => 'Secret',
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
    data: () => ({
      valid: false,
      expand: false,
      resourceKind: '',
      types: [
        { text: '默认', value: 'Opaque' },
        { text: 'TLS', value: 'kubernetes.io/tls' },
        { text: '镜像仓库', value: 'kubernetes.io/dockerconfigjson' },
      ],
      obj: {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
          name: '',
          namespace: null,
        },
        data: {},
        type: 'Opaque',
      },
      input: '',
      formComponent: 'SecretDataForm',
    }),
    computed: {
      ...mapState(['Admin', 'AdminViewport', 'ApiResources']),
      ...mapGetters(['Cluster']),
      objRules() {
        return {
          nameRule: [required, k8sName],
          namespaceRule: [required],
          typeRule: [required],
          kindRule: [required],
        };
      },
    },
    watch: {
      item: {
        handler() {
          this.obj.apiVersion = this.ApiResources['secret'] || 'v1';
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
          }

          if (!this.manifest) {
            if (this.AdminViewport) {
              this.m_select_namespaceSelectData(this.ThisCluster);
            } else {
              this.obj.metadata.namespace = this.ThisNamespace;
            }
          } else {
            this.obj.metadata.name = `${this.app.ApplicationName}`;
          }

          this.resourceKind = this.kind;
          this.obj.kind = this.kind;
          if (
            !this.types.find((t) => {
              return t.value === this.obj.type;
            })
          ) {
            this.types.push({ text: this.obj.type, value: this.obj.type });
          }
        });
      },
      syncInput(input) {
        this.input = input;
      },
      customType() {
        this.types.push({ text: this.input, value: this.input });
        this.obj.type = this.input;
      },
      onTypeChange() {
        if (this.obj.type === 'Opaque') {
          this.formComponent = 'SecretDataForm';
        } else if (this.obj.type === 'kubernetes.io/tls') {
          this.formComponent = 'SecretTlsForm';
        } else if (this.obj.type === 'kubernetes.io/dockerconfigjson') {
          this.formComponent = 'SecretDockerconfigForm';
        } else {
          this.formComponent = 'SecretDataForm';
        }
      },
      clearType() {
        this.types = [
          { text: '默认', value: 'Opaque' },
          { text: 'TLS', value: 'kubernetes.io/tls' },
          { text: '镜像仓库', value: 'kubernetes.io/dockerconfigjson' },
        ];
        this.obj.type = '';
      },
      addData(data) {
        this.obj.data = data;
        this.$refs[this.formComponent].closeCard();
      },
      updateData(key) {
        if (this.obj.type === 'Opaque') {
          const data = { key: key, value: Base64.decode(this.obj.data[key]) };
          this.formComponent = 'SecretDataForm';
          this.$nextTick(() => {
            this.$refs[this.formComponent].init(data);
          });
        } else if (this.obj.type === 'kubernetes.io/tls') {
          const tls = {};
          for (const key in this.obj.data) {
            tls[key] = Base64.decode(this.obj.data[key]);
          }
          this.formComponent = 'SecretTlsForm';
          this.$nextTick(() => {
            this.$refs[this.formComponent].init(tls);
          });
        } else if (this.obj.type === 'kubernetes.io/dockerconfigjson') {
          const dockerconfigstr = Base64.decode(this.obj.data['.dockerconfigjson']);
          try {
            const dockerconfig = JSON.parse(dockerconfigstr);
            for (const address in dockerconfig.auths) {
              const config = {
                username: dockerconfig.auths[address].username,
                password: dockerconfig.auths[address].password,
                email: dockerconfig.auths[address].email,
                address: address,
              };
              this.formComponent = 'SecretDockerconfigForm';
              this.$nextTick(() => {
                this.$refs[this.formComponent].init(config);
              });
            }
          } catch (e) {
            this.$store.commit('SET_SNACKBAR', {
              text: '无法解析数据',
              color: 'warning',
            });
          }
        } else {
          const data = { key: key, value: Base64.decode(this.obj.data[key]) };
          this.formComponent = 'SecretDataForm';
          this.$nextTick(() => {
            this.$refs[this.formComponent].init(data);
          });
        }
        this.expand = true;
      },
      removeData(key) {
        this.$delete(this.obj.data, key);
      },
      expandCard() {
        if (this.obj.type === 'Opaque') {
          this.formComponent = 'SecretDataForm';
        } else if (this.obj.type === 'kubernetes.io/tls') {
          this.formComponent = 'SecretTlsForm';
        } else if (this.obj.type === 'kubernetes.io/dockerconfigjson') {
          this.formComponent = 'SecretDockerconfigForm';
        } else {
          this.formComponent = 'SecretDataForm';
        }
        this.$nextTick(() => {
          this.$refs[this.formComponent].expand = true;
          this.expand = true;
        });
      },
      closeExpand() {
        this.expand = false;
      },
      // eslint-disable-next-line vue/no-unused-properties
      reset() {
        this.$refs[this.formComponent].closeCard();
        this.$refs.form.reset();
        this.obj = this.$options.data().obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      init(data) {
        this.$nextTick(() => {
          this.obj = deepCopy(data);
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      back(data) {
        this.$nextTick(() => {
          this.obj = deepCopy(data);
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      checkSaved() {
        if (this.$refs[this.formComponent].expand) {
          return !this.$refs[this.formComponent].expand;
        }
        return true;
      },
      onKindChange() {
        this.$emit('change', this.resourceKind);
      },
      // eslint-disable-next-line vue/no-unused-properties
      setData(data) {
        this.obj = data;
      },
      // eslint-disable-next-line vue/no-unused-properties
      getData() {
        return this.obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return this.$refs.form.validate(true);
      },
      onNamespaceSelectFocus(clusterName) {
        this.m_select_namespaceSelectData(clusterName);
      },
    },
  };
</script>
