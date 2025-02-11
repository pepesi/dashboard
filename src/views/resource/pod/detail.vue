<template>
  <v-container fluid>
    <BaseViewportHeader :selectable="false" />
    <BaseBreadcrumb>
      <template #extend>
        <v-flex class="kubegems__full-right">
          <v-btn class="primary--text" small text @click="resourceYaml">
            <v-icon left small> fas fa-code </v-icon>
            YAML
          </v-btn>
          <v-menu v-if="m_permisson_resourceAllow" left>
            <template #activator="{ on }">
              <v-btn icon>
                <v-icon color="primary" x-small v-on="on"> fas fa-ellipsis-v </v-icon>
              </v-btn>
            </template>
            <v-card>
              <v-card-text class="pa-2">
                <v-flex>
                  <v-btn color="error" small text @click="removePod"> 删除 </v-btn>
                </v-flex>
              </v-card-text>
            </v-card>
          </v-menu>
        </v-flex>
      </template>
    </BaseBreadcrumb>
    <v-row class="mt-0">
      <v-col class="pt-0" cols="2">
        <BasicResourceInfo :item="pod" />
      </v-col>
      <v-col class="pt-0" cols="10">
        <v-card flat>
          <v-card-text class="pa-0">
            <v-tabs v-model="tab" class="rounded-t pa-3" height="30">
              <v-tab v-for="item in tabItems" :key="item.value">
                {{ item.text }}
              </v-tab>
            </v-tabs>
          </v-card-text>
        </v-card>

        <component
          :is="tabItems[tab].value"
          :ref="tabItems[tab].value"
          class="mt-3"
          :item="pod"
          :selector="{
            topkind: 'Pod',
            topname: pod ? pod.metadata.name : '',
          }"
        />
      </v-col>
    </v-row>

    <ResourceYaml ref="resourceYaml" :item="pod" />
  </v-container>
</template>

<script>
  import { mapState } from 'vuex';

  import ContainerList from './components/ContainerList';
  import PodMonitor from './components/PodMonitor';
  import ResourceInfo from './components/ResourceInfo';

  import { getPodDetail, deletePod } from '@/api';
  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';
  import BasicResourceInfo from '@/views/resource/components/common/BasicResourceInfo';
  import EventList from '@/views/resource/components/common/EventList';
  import PodList from '@/views/resource/components/common/PodList';
  import ResourceYaml from '@/views/resource/components/common/ResourceYaml';
  import Metadata from '@/views/resource/components/metadata/Metadata';

  export default {
    name: 'PodDetail',
    components: {
      BasicResourceInfo,
      ContainerList,
      EventList,
      Metadata,
      PodList,
      PodMonitor,
      ResourceInfo,
      ResourceYaml,
    },
    mixins: [BasePermission, BaseResource],
    data: () => ({
      pod: null,
      tab: 0,
      tabItems: [
        { text: '资源信息', value: 'ResourceInfo' },
        { text: '元数据', value: 'Metadata' },
        { text: '容器', value: 'ContainerList' },
        { text: '事件', value: 'EventList' },
        { text: '监控', value: 'PodMonitor' },
      ],
    }),
    computed: {
      ...mapState(['JWT', 'MessageStreamWS']),
    },
    watch: {
      '$store.state.MessageStream': {
        handler: function (updatingPod) {
          if (!updatingPod) return;
          const pod = JSON.parse(updatingPod);
          if (pod.MessageType !== 'objectChanged') return;
          if (pod.Content && this.pod && pod.Content.metadata.name === this.pod.metadata.name) {
            if (pod.EventKind === 'delete') {
              this.$router.push({ name: 'pod-list', params: this.$route.params });
            } else {
              this.pod = pod.Content;
            }
          }
        },
        deep: true,
        immediate: true,
      },
    },
    mounted() {
      if (this.JWT) {
        this.$nextTick(() => {
          this.podDetail();
        });
      }
    },
    methods: {
      async podDetail() {
        const data = await getPodDetail(this.ThisCluster, this.$route.query.namespace, this.$route.params.name);
        this.pod = data;
        this.watchPod();
      },
      watchPod() {
        const sub = {
          kind: 'objectChanged',
          content: {},
        };
        const watchPodList = [];
        watchPodList.push(`${this.pod.metadata.namespace}/${this.pod.metadata.name}`);
        sub.content[this.ThisCluster] = { Pod: watchPodList };
        if (this.MessageStreamWS && this.MessageStreamWS.readyState === 1) {
          this.MessageStreamWS.send(JSON.stringify(sub));
        }
      },
      resourceYaml() {
        this.$refs.resourceYaml.open();
      },
      removePod() {
        const item = this.pod;
        this.$store.commit('SET_CONFIRM', {
          title: `删除容器组`,
          content: {
            text: `删除容器组 ${item.metadata.name}`,
            type: 'delete',
            name: item.metadata.name,
          },
          param: { item },
          doFunc: async (param) => {
            await deletePod(this.ThisCluster, this.$route.query.namespace, param.item.metadata.name);
            this.$router.push({ name: 'pod-list', params: this.$route.params });
          },
        });
      },
    },
  };
</script>
