<template>
  <div>
    <BaseSubTitle title="elasticsearch配置" />
    <v-form ref="form" v-model="valid" lazy-validation>
      <v-row class="px-2 mt-0">
        <v-col cols="6">
          <v-text-field
            v-model="obj.spec.elasticsearch.host"
            class="my-0"
            label="host"
            required
            :rules="objRules.hostRules"
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            v-model="obj.spec.elasticsearch.port"
            class="my-0"
            label="port"
            required
            :rules="objRules.portRules"
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            v-model.number="obj.spec.elasticsearch.index_name"
            class="my-0"
            label="index_name"
            required
            :rules="objRules.indexNameRules"
          />
        </v-col>
      </v-row>
    </v-form>
  </div>
</template>

<script>
  import { required } from '@/utils/rules';

  export default {
    name: 'Elasticsearch',
    props: {
      item: {
        type: Object,
        default: null,
      },
    },
    data() {
      return {
        valid: false,
        obj: {
          spec: {
            elasticsearch: {
              host: '',
              port: '',
              index_name: '',
            },
          },
        },
        objRules: {
          hostRules: [required],
          portRules: [required],
          indexNameRules: [required],
        },
      };
    },
    mounted() {
      this.$nextTick(() => {
        this.$refs.form.resetValidation();
        if (this.item?.spec?.elasticsearch) {
          this.obj = this.$_.merge(this.item, this.obj);
        }
      });
    },
    methods: {
      // eslint-disable-next-line vue/no-unused-properties
      reset() {
        this.$refs.form.resetValidation();
        this.obj = this.$options.data().obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return this.$refs.form.validate(true);
      },
    },
  };
</script>
