<template>
  <v-container fluid>
    <BaseBreadcrumb>
      <template #extend>
        <v-flex class="kubegems__full-right">
          <span class="text-body-2 kubegems__text">
            租户角色:
            {{ $TENANT_ROLE[m_permisson_tenantRole] ? $TENANT_ROLE[m_permisson_tenantRole] : '暂无' }}
          </span>
          <v-btn v-if="m_permisson_tenantAllow" class="primary--text mt-n1" small text @click="manageUser">
            <v-icon left small> fas fa-user-md </v-icon>
            租户成员
          </v-btn>
        </v-flex>
      </template>
    </BaseBreadcrumb>
    <v-row class="mt-3">
      <v-col class="py-0" cols="9">
        <DashboardCard :statistics="statistics" />

        <ProjectList class="mt-1" @refresh="tenantStatistics" />

        <ResourceList />
      </v-col>
      <v-col class="py-0" cols="3">
        <AuditList />
        <EventList />
      </v-col>
    </v-row>

    <ManageUser ref="manageUser" @refresh="tenantStatistics" />
  </v-container>
</template>

<script>
  import { mapGetters, mapState } from 'vuex';

  import AuditList from './components/AuditList';
  import DashboardCard from './components/DashboardCard';
  import EventList from './components/EventList';
  import ManageUser from './components/ManageUser';
  import ProjectList from './components/ProjectList';
  import ResourceList from './components/ResourceList';

  import { getTenantStatistics } from '@/api';
  import BasePermission from '@/mixins/permission';
  import BaseResource from '@/mixins/resource';

  export default {
    name: 'Dashboard',
    components: {
      AuditList,
      DashboardCard,
      EventList,
      ManageUser,
      ProjectList,
      ResourceList,
    },
    mixins: [BasePermission, BaseResource],
    data: () => ({
      statistics: null,
    }),
    computed: {
      ...mapState(['JWT', 'Admin']),
      ...mapGetters(['Tenant']),
    },
    mounted() {
      if (this.JWT) {
        this.$nextTick(() => {
          this.$store.commit('SET_ADMIN_VIEWPORT', false);
          if (this.Tenant().ID > 0) {
            this.tenantStatistics();
            this.$router.replace({ params: { tenant: this.Tenant().TenantName } });
          } else {
            this.$router.push({ name: 'whitepage' });
          }
        });
      }
    },
    methods: {
      async manageUser() {
        if (this.Tenant().ID > 0) {
          await this.$refs.manageUser.init();
          this.$refs.manageUser.open();
        } else {
          this.$store.commit('SET_SNACKBAR', {
            text: `请创建或加入租户`,
            color: 'warning',
          });
        }
      },
      async tenantStatistics() {
        const data = await getTenantStatistics(this.Tenant().ID, {
          noprocessing: true,
        });
        this.statistics = data;
      },
    },
  };
</script>
