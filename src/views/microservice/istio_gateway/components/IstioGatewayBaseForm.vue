<template>
  <v-flex>
    <BaseSubTitle title="网关实例定义" />
    <v-card-text class="pa-2">
      <v-form ref="form" v-model="valid" lazy-validation @submit.prevent>
        <v-sheet>
          <v-text-field
            v-model="obj.Name"
            class="my-0"
            label="网关实例"
            :readonly="edit"
            required
            :rules="objRules.nameRules"
          />
        </v-sheet>
      </v-form>
    </v-card-text>
  </v-flex>
</template>

<script>
  import { mapState } from 'vuex';

  import BaseResource from '@/mixins/resource';
  import BaseSelect from '@/mixins/select';
  import { required } from '@/utils/rules';

  export default {
    name: 'IstioGatewayBaseForm',
    mixins: [BaseResource, BaseSelect],
    props: {
      edit: {
        type: Boolean,
        default: () => false,
      },
    },
    data: () => ({
      valid: false,
      obj: {
        Name: '',
      },
    }),
    computed: {
      ...mapState(['Circular']),
      objRules() {
        return {
          nameRules: [required],
        };
      },
    },
    methods: {
      // eslint-disable-next-line vue/no-unused-properties
      reset() {
        this.$refs.form.reset();
      },
      // eslint-disable-next-line vue/no-unused-properties
      setData(data) {
        this.obj = data;
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return this.$refs.form.validate(true);
      },
      // eslint-disable-next-line vue/no-unused-properties
      getData() {
        return this.obj;
      },
    },
  };
</script>
