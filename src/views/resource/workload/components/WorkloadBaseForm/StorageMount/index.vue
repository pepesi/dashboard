<template>
  <v-form ref="form" v-model="valid" lazy-validation @submit.prevent>
    <v-flex :class="expand || expandTemplate ? 'kubegems__overlay' : ''" />
    <v-expand-transition>
      <v-card v-show="expandTemplate" class="my-2 pa-2 kubegems__expand-transition" :elevation="4">
        <v-card-text class="pa-0">
          <component
            :is="volumeClaimTemplateComponent"
            ref="volumeClaimTemplateMount"
            :data="obj"
            :manifest="manifest"
            :template="template"
            :volume="volume"
            :volume-mount-name="volumeMountName"
          />
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-spacer />
          <v-btn color="error" small text @click="closeTemplateCard"> 取消 </v-btn>
          <v-btn color="primary" small text @click="addTemplateData"> 保存 </v-btn>
        </v-card-actions>
      </v-card>
    </v-expand-transition>
    <template v-if="kind === 'StatefulSet'">
      <BaseSubTitle title="存储卷模版" />
      <v-card-text class="pa-2">
        <VolumeClaimTemplateItem
          :containers="obj.spec.template.spec.containers"
          :templates="obj.spec.volumeClaimTemplates"
          @expandTemplateCard="expandTemplateCard"
          @removeVolumeTemplateData="removeVolumeTemplateData"
          @updateVolumeTemplateData="updateVolumeTemplateData"
        />
      </v-card-text>
    </template>
    <v-expand-transition>
      <v-card v-show="expand" class="my-2 pa-2 kubegems__expand-transition" :elevation="4">
        <BaseSubTitle v-if="volumeType === 'ConfigMap' || volumeType === 'Secret'" :divider="false">
          <template #action>
            <v-btn class="float-right mr-2" color="primary" small text @click="addItem">
              <v-icon left small> mdi-plus </v-icon>
              添加特定键与路径
            </v-btn>
          </template>
        </BaseSubTitle>
        <v-card-text class="pa-0">
          <v-form v-model="valid" lazy-validation @submit.prevent>
            <v-sheet class="pt-2 px-2">
              <v-flex class="float-left text-subtitle-2 pt-5 primary--text kubegems__min-width">
                <span>卷挂载定义</span>
              </v-flex>
              <v-flex class="float-left ml-2 kubegems__form-width">
                <v-autocomplete
                  v-model="volumeType"
                  class="my-0"
                  color="primary"
                  hide-selected
                  :items="volumeTypes"
                  label="类型"
                  no-data-text="暂无可选数据"
                  :readonly="componentEdit"
                >
                  <template #selection="{ item }">
                    <v-chip class="mx-1" color="primary" small>
                      {{ item['text'] }}
                    </v-chip>
                  </template>
                </v-autocomplete>
              </v-flex>
              <div class="kubegems__clear-float" />
            </v-sheet>
            <component
              :is="volumeType + 'Mount'"
              v-if="volumeType"
              :ref="volumeType + 'Mount'"
              :containers="obj.spec.template.spec.containers"
              :edit="componentEdit"
              :init-containers="obj.spec.template.spec.initContainers"
              :manifest="manifest"
              :namespace="obj.metadata.namespace ? obj.metadata.namespace : ''"
              :volume="volume"
              :volume-mount-name="volumeMountName"
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-spacer />
          <v-btn color="error" small text @click="closeCard"> 取消 </v-btn>
          <v-btn color="primary" small text @click="addData"> 保存 </v-btn>
        </v-card-actions>
      </v-card>
    </v-expand-transition>

    <BaseSubTitle title="存储卷" />
    <v-card-text class="pa-2">
      <StorageMountItem
        :containers="obj.spec.template.spec.containers"
        :init-containers="obj.spec.template.spec.initContainers"
        :pvcs="pvcs"
        :volumes="obj.spec.template.spec.volumes"
        @expandCard="expandCard"
        @removeData="removeData"
        @updateData="updateData"
      />
    </v-card-text>
  </v-form>
</template>

<script>
  import StorageMountItem from './StorageMountItem';
  import ConfigMapMount from './volume_section/ConfigMapMount';
  import EmptyDirMount from './volume_section/EmptyDirMount';
  import HostPathMount from './volume_section/HostPathMount';
  import PersistentVolumeClaimMount from './volume_section/PersistentVolumeClaimMount';
  import SecretMount from './volume_section/SecretMount';
  import VolumeClaimTemplateMount from './volume_section/VolumeClaimTemplateMount';
  import VolumeClaimTemplateItem from './VolumeClaimTemplateItem';

  import { getPersistentVolumeClaimDetail, getAppResourceFileMetas } from '@/api';
  import BaseResource from '@/mixins/resource';
  import { deepCopy } from '@/utils/helpers';

  export default {
    name: 'StorageMount',
    components: {
      ConfigMapMount,
      EmptyDirMount,
      HostPathMount,
      PersistentVolumeClaimMount,
      SecretMount,
      StorageMountItem,
      VolumeClaimTemplateItem,
      VolumeClaimTemplateMount,
    },
    mixins: [BaseResource],
    props: {
      kind: {
        type: String,
        default: () => '',
      },
      manifest: {
        type: Boolean,
        default: () => false,
      },
    },
    data() {
      return {
        valid: false,
        volumeTypes: [
          { text: '存储卷', value: 'PersistentVolumeClaim' },
          { text: 'HostPath', value: 'HostPath' },
          { text: '配置', value: 'ConfigMap' },
          { text: '密钥', value: 'Secret' },
          { text: 'EmptyDir', value: 'EmptyDir' },
        ],
        volumeType: null,
        volumeMountName: null,
        volume: null,
        componentEdit: false,
        editIndex: -1,
        obj: {
          metadata: {},
          spec: {
            template: {
              spec: {
                volumes: [],
                containers: [],
              },
            },
          },
        },
        pvcs: {},
        expand: false,
        expandTemplate: false,
        volumeClaimTemplateComponent: '',
        template: null,
      };
    },
    methods: {
      // eslint-disable-next-line vue/no-unused-properties
      async init(data) {
        this.$nextTick(async () => {
          this.obj = this.$_.merge(deepCopy(data), this.obj);
          await this.persistentVolumeClaimDetail();
        });
      },
      // eslint-disable-next-line vue/no-unused-properties
      async back(data) {
        this.$nextTick(async () => {
          this.obj = deepCopy(data);
          await this.persistentVolumeClaimDetail();
        });
      },
      async persistentVolumeClaimDetail() {
        if (this.manifest) {
          const data = await getAppResourceFileMetas(
            this.$route.query.tenantid,
            this.$route.query.projectid,
            this.ThisAppEnvironmentID,
            this.$route.params.name,
            {
              kind: 'PersistentVolumeClaim',
              noprocessing: true,
            },
          );
          const pvcDict = {};
          data.forEach((pvc) => {
            pvcDict[pvc.metadata.name] = pvc;
          });
          this.obj.spec.template.spec.volumes.forEach(async (volume) => {
            if (volume.persistentVolumeClaim) {
              this.$set(
                this.pvcs,
                volume.persistentVolumeClaim.claimName,
                pvcDict[volume.persistentVolumeClaim.claimName],
              );
            }
          });
        } else {
          this.obj.spec.template.spec.volumes.forEach(async (volume) => {
            if (volume.persistentVolumeClaim) {
              const data = await getPersistentVolumeClaimDetail(
                this.ThisCluster,
                this.obj.metadata.namespace ? this.obj.metadata.namespace : '',
                volume.persistentVolumeClaim.claimName,
              );
              this.$set(this.pvcs, volume.persistentVolumeClaim.claimName, data);
            }
          });
        }
      },
      addItem() {
        this.$refs[`${this.volumeType}Mount`].addItem();
      },
      addData() {
        if (this.volumeType) {
          const data = this.$refs[`${this.volumeType}Mount`].generateData();
          if (this.obj.spec.template.spec.initContainers?.length > 0) {
            const initData = this.$refs[`${this.volumeType}Mount`].generateInitData();
            data.volumeMount = { ...data.volumeMount, ...initData };
          }
          if (!this.obj.spec.template.spec.volumes) {
            this.obj.spec.template.spec.volumes = [];
          }
          let vIndex = this.editIndex;
          if (vIndex === -1) {
            vIndex = this.obj.spec.template.spec.volumes.findIndex((v) => {
              return data && v.name === data.volume.name;
            });
          }
          if (!this.obj.spec.template.spec.volumes) {
            this.obj.spec.template.spec.volumes = [];
          }
          if (vIndex === -1 || this.volume === null) {
            if (data) this.obj.spec.template.spec.volumes.push(data.volume);
          } else {
            this.$set(this.obj.spec.template.spec.volumes, vIndex, data.volume);
          }

          // containers
          this.obj.spec.template.spec.containers.forEach((c, i) => {
            if (!c.volumeMounts) c.volumeMounts = [];
            const mIndex = c.volumeMounts.findIndex((v) => {
              return v.name === data.volumeMount[c.name].name;
            });
            if (mIndex === -1 || this.volume === null) {
              if (
                data.volumeMount[c.name] &&
                data.volumeMount[c.name].mountPath &&
                data.volumeMount[c.name].mountPath.trim().length > 0
              ) {
                c.volumeMounts.push(data.volumeMount[c.name]);
                this.$set(this.obj.spec.template.spec.containers, i, c);
              }
            } else {
              if (data.volumeMount[c.name].readOnly !== null) {
                if (
                  data.volumeMount[c.name] &&
                  data.volumeMount[c.name].mountPath &&
                  data.volumeMount[c.name].mountPath.trim().length > 0
                ) {
                  c.volumeMounts[mIndex] = data.volumeMount[c.name];
                  this.$set(this.obj.spec.template.spec.containers, i, c);
                }
              } else {
                this.$delete(c.volumeMounts, mIndex);
                this.$set(this.obj.spec.template.spec.containers, i, c);
              }
            }
          });

          // initContainers
          if (this.obj.spec.template.spec.initContainers?.length > 0) {
            this.obj.spec.template.spec.initContainers.forEach((c, i) => {
              if (!c.volumeMounts) c.volumeMounts = [];
              const mIndex = c.volumeMounts.findIndex((v) => {
                return v.name === data.volumeMount.init[c.name].name;
              });
              if (mIndex === -1 || this.volume === null) {
                if (
                  data.volumeMount.init[c.name] &&
                  data.volumeMount.init[c.name].mountPath &&
                  data.volumeMount.init[c.name].mountPath.trim().length > 0
                ) {
                  c.volumeMounts.push(data.volumeMount.init[c.name]);
                  this.$set(this.obj.spec.template.spec.initContainers, i, c);
                }
              } else {
                if (data.volumeMount.init[c.name].readOnly !== null) {
                  if (
                    data.volumeMount.init[c.name] &&
                    data.volumeMount.init[c.name].mountPath &&
                    data.volumeMount.init[c.name].mountPath.trim().length > 0
                  ) {
                    c.volumeMounts[mIndex] = data.volumeMount.init[c.name];
                    this.$set(this.obj.spec.template.spec.initContainers, i, c);
                  }
                } else {
                  this.$delete(c.volumeMounts, mIndex);
                  this.$set(this.obj.spec.template.spec.initContainers, i, c);
                }
              }
            });
          }
          this.persistentVolumeClaimDetail();
          this.closeCard();
        }
      },
      addTemplateData() {
        const data = this.$refs.volumeClaimTemplateMount.generateData();
        if (!this.obj.spec.volumeClaimTemplates) {
          this.obj.spec.volumeClaimTemplates = [];
        }
        let vIndex = this.editIndex;
        if (vIndex === -1) {
          vIndex = this.obj.spec.volumeClaimTemplates.findIndex((v) => {
            return data && v.metadata.name === data.volumeClaimTemplate.metadata.name;
          });
        }
        if (!this.obj.spec.template.spec.volumes) {
          this.obj.spec.template.spec.volumes = [];
        }
        if (vIndex === -1 || this.volume === null) {
          this.obj.spec.volumeClaimTemplates.push(data.volumeClaimTemplate);
        } else {
          this.$set(this.obj.spec.volumeClaimTemplates, vIndex, data.volumeClaimTemplate);
        }
        this.obj.spec.template.spec.containers.forEach((c, i) => {
          if (!c.volumeMounts) c.volumeMounts = [];
          const mIndex = c.volumeMounts.findIndex((v) => {
            return v.name === data.volumeMount[c.name].name;
          });
          if (mIndex === -1 || this.volume === null) {
            c.volumeMounts.push(data.volumeMount[c.name]);
            this.$set(this.obj.spec.template.spec.containers, i, c);
          } else {
            if (data.volumeMount[c.name].readOnly !== null) {
              c.volumeMounts[mIndex] = data.volumeMount[c.name];
              this.$set(this.obj.spec.template.spec.containers, i, c);
            } else {
              this.$delete(c.volumeMounts, mIndex);
              this.$set(this.obj.spec.template.spec.containers, i, c);
            }
          }
        });
        this.closeTemplateCard();
      },
      updateData(index) {
        const volume = this.obj.spec.template.spec.volumes[index];
        this.editIndex = index;
        if (volume.persistentVolumeClaim) {
          this.volumeMountName = volume.name;
          this.volume = deepCopy(volume);
          this.volumeType = 'PersistentVolumeClaim';
          this.expandCard(true);
        } else if (volume.configMap) {
          this.volumeMountName = volume.name;
          this.volume = deepCopy(volume);
          this.volumeType = 'ConfigMap';
          this.expandCard(true);
        } else if (volume.secret) {
          this.volumeMountName = volume.name;
          this.volume = deepCopy(volume);
          this.volumeType = 'Secret';
          this.expandCard(true);
        } else if (volume.hostPath) {
          this.volumeMountName = volume.name;
          this.volume = deepCopy(volume);
          this.volumeType = 'HostPath';
          this.expandCard(true);
        } else if (volume.emptyDir) {
          this.volumeMountName = volume.name;
          this.volume = deepCopy(volume);
          this.volumeType = 'EmptyDir';
          this.expandCard(true);
        } else {
          this.$store.commit('SET_SNACKBAR', {
            text: '未知的卷类型',
            color: 'warning',
          });
        }
      },
      removeData(index) {
        const volume = this.obj.spec.template.spec.volumes[index];
        this.$delete(this.obj.spec.template.spec.volumes, index);
        this.obj.spec.template.spec.containers.forEach((c) => {
          if (c.volumeMounts) {
            const vindex = c.volumeMounts.findIndex((v) => {
              return v.name === volume.name;
            });
            if (vindex > -1) {
              this.$delete(c.volumeMounts, vindex);
            }
          }
        });
        if (this.obj.spec.template.spec.initContainers?.length > 0) {
          this.obj.spec.template.spec.initContainers.forEach((c) => {
            if (c.volumeMounts) {
              const vindex = c.volumeMounts.findIndex((v) => {
                return v.name === volume.name;
              });
              if (vindex > -1) {
                this.$delete(c.volumeMounts, vindex);
              }
            }
          });
        }
      },
      updateVolumeTemplateData(index) {
        this.editIndex = index;
        const template = this.obj.spec.volumeClaimTemplates[index];
        if (template) {
          this.template = template;
          this.volume = { name: template.metadata.name };
          this.volumeMountName = template.metadata.name;
          this.expandTemplateCard(true);
        }
      },
      removeVolumeTemplateData(index) {
        const template = this.obj.spec.volumeClaimTemplates[index];
        this.$delete(this.obj.spec.volumeClaimTemplates, index);
        this.obj.spec.template.spec.containers.forEach((c) => {
          if (c.volumeMounts) {
            const vindex = c.volumeMounts.findIndex((v) => {
              return v.name === template.metadata.name;
            });
            if (vindex > -1) {
              this.$delete(c.volumeMounts, vindex);
            }
          }
        });
      },
      expandCard(componentEdit = false) {
        if (!componentEdit) {
          this.volumeType = 'PersistentVolumeClaim';
          this.editIndex = -1;
        }
        this.$nextTick(() => {
          this.componentEdit = componentEdit;
          this.expand = true;
        });
      },
      expandTemplateCard(componentEdit = false) {
        if (!componentEdit) {
          this.editIndex = -1;
        }
        this.volumeClaimTemplateComponent = 'VolumeClaimTemplateMount';
        this.$nextTick(() => {
          this.componentEdit = componentEdit;
          this.expandTemplate = true;
        });
      },
      closeTemplateCard() {
        this.expandTemplate = false;
        this.reset();
        this.volumeClaimTemplateComponent = '';
        this.template = null;
        this.volumeMountName = null;
        this.volume = null;
        this.componentEdit = false;
        this.editIndex = -1;
      },
      closeCard() {
        this.expand = false;
        this.reset();
        this.volumeType = '';
        this.volumeMountName = null;
        this.volume = null;
        this.componentEdit = false;
        this.editIndex = -1;
      },
      reset() {
        this.$refs.form.reset();
      },
      // eslint-disable-next-line vue/no-unused-properties
      validate() {
        return this.$refs.form.validate(true);
      },
      // eslint-disable-next-line vue/no-unused-properties
      getData() {
        return this.obj;
      },
      // eslint-disable-next-line vue/no-unused-properties
      checkSaved() {
        if (Object.prototype.hasOwnProperty.call(this, 'expand')) {
          return !this.expand;
        }
        return true;
      },
    },
  };
</script>
