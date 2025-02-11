<template>
  <div>
    <v-card>
      <BaseSubTitle class="pt-2" :divider="false" title="标签">
        <template v-if="!readonly" #action>
          <v-btn class="float-right mr-2" color="primary" small text @click="addLabel">
            <v-icon left small> mdi-tag-plus </v-icon>
            添加标签
          </v-btn>
        </template>
      </BaseSubTitle>
      <v-flex class="px-4">
        <v-flex class="pb-4">
          <v-sheet v-for="(value, key) in metadata ? metadata.labels : []" :key="key" class="ml-2">
            <v-chip
              class="my-1"
              :close="!readonly"
              close-icon="mdi-delete"
              color="success"
              small
              text-color="white"
              @click:close="removeMetadata(key, 'label')"
            >
              <v-icon left small> mdi-label </v-icon>
              <strong class="mx-1"> {{ key }} </strong>
              {{ value }}
            </v-chip>
            <div class="kubegems__clear-float" />
          </v-sheet>
        </v-flex>
      </v-flex>
    </v-card>

    <v-card class="mt-3">
      <BaseSubTitle class="pt-2" :divider="false" title="注解">
        <template v-if="!readonly" #action>
          <v-btn class="float-right mr-2" color="primary" small text @click="addAnnotation">
            <v-icon left small> mdi-tag-plus </v-icon>
            添加注解
          </v-btn>
        </template>
      </BaseSubTitle>
      <v-flex class="px-4 pb-4">
        <v-flex>
          <v-sheet v-for="(value, key) in metadata ? metadata.annotations : []" :key="key" class="ml-2">
            <v-chip
              v-if="$ANNOTATION_IGNORE_ARRAY.indexOf(key) === -1"
              class="my-1 kubegems__text"
              :close="!readonly"
              close-icon="mdi-delete"
              color="gray"
              small
              @click:close="removeMetadata(key, 'annotation')"
            >
              <v-icon left small> mdi-label </v-icon>
              <strong class="mx-1"> {{ key }} </strong>
              {{ value }}
            </v-chip>
            <div class="kubegems__clear-float" />
          </v-sheet>
        </v-flex>
      </v-flex>
    </v-card>

    <AddLabel v-if="!readonly" ref="addLabel" :item="item" @refresh="refreshMetadata" />
    <AddAnnotation v-if="!readonly" ref="addAnnotation" :item="item" @refresh="refreshMetadata" />
  </div>
</template>
<script>
  import { mapGetters, mapState } from 'vuex';

  import AddAnnotation from './AddAnnotation';
  import AddLabel from './AddLabel';

  import { patchMetadataNode } from '@/api';
  import BaseResource from '@/mixins/resource';
  import { deepCopy } from '@/utils/helpers';

  export default {
    name: 'Metadata',
    components: {
      AddAnnotation,
      AddLabel,
    },
    mixins: [BaseResource],
    props: {
      item: {
        type: Object,
        default: () => null,
      },
      readonly: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        metadata: null,
      };
    },
    computed: {
      ...mapState(['JWT']),
      ...mapGetters(['Cluster']),
    },
    watch: {
      item: {
        handler: function () {
          if (this.item && this.item.metadata) {
            this.metadata = deepCopy(this.item.metadata);
          }
        },
        deep: true,
        immediate: true,
      },
    },
    methods: {
      removeMetadata(item, type) {
        this.$store.commit('SET_CONFIRM', {
          title: type === 'label' ? '移除标签' : '移除注解',
          content: {
            text: type === 'label' ? `移除标签 ${item}` : `移除注解 ${item}`,
            type: 'delete',
            name: item,
          },
          param: { item, type },
          doFunc: async (param) => {
            if (param.type === 'label') {
              this.$delete(this.metadata.labels, param.item);
            } else if (param.type === 'annotation') {
              this.$delete(this.metadata.annotations, param.item);
            }
            await patchMetadataNode(this.ThisCluster, this.metadata.name, {
              Annotations: this.metadata.annotations,
              Labels: this.metadata.labels,
            });
          },
        });
      },
      addLabel() {
        this.$refs.addLabel.open();
      },
      addAnnotation() {
        this.$refs.addAnnotation.open();
      },
      refreshMetadata(obj, type) {
        if (type === 'label') {
          this.$set(this.metadata.labels, obj.key, obj.value);
        } else if (type === 'annotation') {
          this.$set(this.metadata.annotations, obj.key, obj.value);
        }
      },
    },
  };
</script>
