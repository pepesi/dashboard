<template>
  <v-container fluid>
    <BaseBreadcrumb>
      <template #extend>
        <v-flex class="kubegems__full-right">
          <span class="text-body-2 mx-2">
            虚拟空间:
            {{ VirtualSpace().VirtualSpaceName }}
          </span>
          <span class="text-body-2 mx-2">
            虚拟空间角色:
            {{
              $VIRTUALSPACE_ROLE[m_permisson_virtualSpaceRole]
                ? $VIRTUALSPACE_ROLE[m_permisson_virtualSpaceRole]
                : '暂无'
            }}
          </span>
          <v-btn class="primary--text" small text @click="manageUser">
            <v-icon left small> mdi-account-settings </v-icon>
            虚拟空间成员
          </v-btn>
          <v-btn class="primary--text" small text @click="returnVirtualSpace">
            <v-icon left small> mdi-logout </v-icon>
            返回
          </v-btn>
          <v-menu v-if="m_permisson_tenantAllow || m_permisson_virtualSpaceAllow" left>
            <template #activator="{ on }">
              <v-btn icon>
                <v-icon color="primary" x-small v-on="on"> fas fa-ellipsis-v </v-icon>
              </v-btn>
            </template>
            <v-card>
              <v-card-text class="pa-2">
                <v-flex>
                  <v-btn color="primary" small text @click="updateVirtualSpace"> 编辑 </v-btn>
                </v-flex>
                <v-flex>
                  <v-btn color="error" small text @click="removeVirtualSpace"> 删除 </v-btn>
                </v-flex>
              </v-card-text>
            </v-card>
          </v-menu>
        </v-flex>
      </template>
    </BaseBreadcrumb>

    <DashboardCard class="mt-3" :virtualspace="virtualspace" />
    <EnvironmentList :virtualspace="virtualspace" @refresh="virtualSpaceDetail" />
    <UpdateVirtualSpace ref="updateVirtualSpace" @refresh="virtualSpaceDetail" />
    <ManageUser ref="manageUser" :virtualspace="virtualspace" @refresh="virtualSpaceDetail" />
  </v-container>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import DashboardCard from './components/DashboardCard';
  import EnvironmentList from './components/EnvironmentList';
  import ManageUser from './components/ManageUser';
  import UpdateVirtualSpace from './components/UpdateVirtualSpace';

  import { getVirtualSpaceDetail, deleteVirtualSpace } from '@/api';
  import BasePermission from '@/mixins/permission';

  export default {
    name: 'VirtualSpaceDetail',
    components: {
      DashboardCard,
      EnvironmentList,
      ManageUser,
      UpdateVirtualSpace,
    },
    mixins: [BasePermission],
    data: () => ({
      virtualspace: null,
    }),
    computed: {
      ...mapState(['JWT', 'AdminViewport']),
      ...mapGetters(['VirtualSpace']),
    },
    async mounted() {
      if (this.JWT) {
        this.virtualSpaceDetail();
      }
    },
    methods: {
      async virtualSpaceDetail() {
        const data = await getVirtualSpaceDetail(this.VirtualSpace().ID);
        this.virtualspace = data;
      },
      updateVirtualSpace() {
        this.$refs.updateVirtualSpace.init(this.virtualspace);
        this.$refs.updateVirtualSpace.open();
      },
      removeVirtualSpace() {
        const item = this.virtualspace;
        this.$store.commit('SET_CONFIRM', {
          title: `删除虚拟空间`,
          content: {
            text: `删除虚拟空间 ${item.VirtualSpaceName}`,
            type: 'delete',
            name: item.VirtualSpaceName,
          },
          param: { item },
          doFunc: async (param) => {
            await deleteVirtualSpace(param.item.ID);
            this.$store.commit('CLEAR_VIRTUAL_SPACE');
            this.$router.push({
              name: 'virtualspace-list',
              params: this.$route.params,
            });
          },
        });
      },
      returnVirtualSpace() {
        this.$store.commit('CLEAR_VIRTUAL_SPACE');
        this.$router.push({
          name: 'virtualspace-list',
          params: this.$route.params,
        });
      },
      manageUser() {
        this.$refs.manageUser.init();
        this.$refs.manageUser.open();
      },
    },
  };
</script>
