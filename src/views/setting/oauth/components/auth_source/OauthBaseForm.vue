<template>
  <v-form ref="form" v-model="valid" lazy-validation @submit.prevent>
    <v-card-text class="pa-2">
      <v-row>
        <v-col v-if="vendor === 'gitlab'" cols="6">
          <v-text-field
            v-model="gitlabDomain"
            class="my-0"
            label="GitLab Domain"
            required
            :rules="objRules.gitlabDomainRule"
          />
        </v-col>
        <v-col cols="6">
          <v-text-field
            v-model="obj.config.redirectURL"
            class="my-0"
            label="Redirect URL"
            required
            :rules="objRules.redirectURLRule"
          />
        </v-col>
        <template v-if="vendor !== 'github' && vendor !== 'gitlab'">
          <v-col cols="6">
            <v-text-field
              v-model="obj.config.authURL"
              class="my-0"
              label="Auth URL"
              required
              :rules="objRules.authURLRule"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="obj.config.userInfoURL"
              class="my-0"
              label="UserInfo URL"
              required
              :rules="objRules.userInfoURLRule"
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="obj.config.tokenURL"
              class="my-0"
              label="Token URL"
              required
              :rules="objRules.tokenURLRule"
            />
          </v-col>
        </template>
        <v-col cols="12">
          <v-text-field
            v-model="obj.config.appID"
            class="my-0"
            label="Application ID"
            required
            :rules="objRules.appIDRule"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="obj.config.appSecret"
            class="my-0"
            label="Secret"
            required
            :rules="objRules.appSecretRule"
          />
        </v-col>
        <v-col cols="6">
          <v-combobox
            v-model="scopes"
            class="my-0"
            hide-no-data
            :items="[]"
            label="Scope"
            multiple
            :search-input.sync="scopeText"
            @change="onScopeChange"
            @keydown.enter="createScope"
          >
            <template #selection="{ item }">
              <v-chip class="ma-1" color="primary" small>
                {{ item['text'] }}
                <v-icon small @click="removeScope(item)"> mdi-close </v-icon>
              </v-chip>
            </template>
          </v-combobox>
        </v-col>
      </v-row>
    </v-card-text>
  </v-form>
</template>

<script>
  import { getOAuthScopeList } from '@/api';
  import { deepCopy } from '@/utils/helpers';
  import { required } from '@/utils/rules';

  export default {
    name: 'OauthBaseForm',
    props: {
      edit: {
        type: Boolean,
        default: () => false,
      },
      item: {
        type: Object,
        default: () => null,
      },
      vendor: {
        type: String,
        default: () => '',
      },
    },
    data: () => ({
      valid: false,
      scopes: [],
      scopeText: '',
      gitlabDomain: 'gitlab.com',
      obj: {
        config: {
          appID: '',
          appSecret: '',
          redirectURL: '',
          scopes: [],
          authURL: '',
          userInfoURL: '',
          tokenURL: '',
        },
        tokenType: 'Bearer',
      },
    }),
    computed: {
      objRules() {
        return {
          appIDRule: [required],
          appSecretRule: [required],
          redirectURLRule: [required],
          tokenTypeRule: [required],
          authURLRule: [required],
          userInfoURLRule: [required],
          tokenURLRule: [required],
          gitlabDomainRule: [
            (v) => !!new RegExp('^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.)+[A-Za-z]{2,6}$', 'g').test(v) || '格式错误',
          ],
        };
      },
    },
    watch: {
      item() {
        this.obj = deepCopy(this.item);
        this.scopes =
          this.obj.config.scopes?.map((scope, index) => {
            return { text: scope, value: index };
          }) || [];
        const reg = new RegExp('((?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.)+[A-Za-z]{2,6}', 'g');
        const matchDomain = this.obj.config.authURL.match(reg);
        if (matchDomain && matchDomain.length > 0) {
          this.gitlabDomain = matchDomain[0];
        }
      },
    },
    mounted() {
      if (!this.edit) {
        this.obj.config.redirectURL = `https://${window.location.host}/oauth/callback`;
        if (this.vendor === 'gitlab' || this.vendor === 'github') {
          this.scopeList();
        }
      }
    },
    methods: {
      onScopeChange() {
        const scopes = this.scopes.filter((scope) => {
          return scope !== '' && typeof scope === 'object';
        });
        this.scopes = scopes;
        this.obj.config.scopes =
          scopes.map((scope) => {
            return scope.text;
          }) || [];
      },
      async scopeList() {
        const data = await getOAuthScopeList({ vendor: this.vendor });
        this.obj.config = Object.assign(this.obj.config, data);
        this.scopes = this.obj.config.scopes?.map((scope, index) => {
          return { text: scope, value: index };
        });
      },
      replaceDomain() {
        const reg = new RegExp('((?!-)[A-Za-z0-9-]{1,63}(?<!-)\\.)+[A-Za-z]{2,6}', 'g');
        this.obj.config.authURL = this.obj.config.authURL.replace(reg, this.gitlabDomain);
        this.obj.config.userInfoURL = this.obj.config.userInfoURL.replace(reg, this.gitlabDomain);
        this.obj.config.tokenURL = this.obj.config.tokenURL.replace(reg, this.gitlabDomain);
      },
      createScope() {
        if (!this.scopeText) return;
        const index = this.scopes.length;
        this.scopes.push({
          text: this.scopeText,
          value: index,
        });
        this.scopeText = '';
        this.obj.config.scopes = this.scopes.map((scope) => {
          return scope.text;
        });
      },
      removeScope(item) {
        const scopes = this.scopes.filter((scope) => {
          return scope.value !== item.value;
        });
        this.scopes = scopes;
        this.obj.config.scopes = this.scopes.map((scope) => {
          return scope.text;
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      reset() {
        this.$refs.form.reset();
      },
      // eslint-disable-next-line vue/no-unused-properties
      getData() {
        if (this.vendor === 'gitlab') {
          this.replaceDomain();
        }
        return this.obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return this.$refs.form.validate(true);
      },
    },
  };
</script>
