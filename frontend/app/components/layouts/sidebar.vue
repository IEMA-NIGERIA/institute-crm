<template>
  <aside class="flex w-full py-2 px-4 box-border h-full flex-col justify-between bg-[#103260] text-slate-200">
    <div>
      <!-- Header Logo Badge -->
      <!-- <div class="mb-4 flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-slate-900 shadow-sm">
        <div class="flex items-center justify-center rounded bg-[#ed1c24] px-1.5 py-0.5 text-xs font-black tracking-wider text-white">
          IEMA
        </div>
        <span class="text-base font-bold text-slate-900">CRMops</span>
      </div> -->
       <div class="">
                <img 
                  src="/iema_institute_logo.jpg" 
                  alt="" 
                  class="w-15 h-10">
            </div>

      <!-- Navigation Section -->
      <div>
        <p class="mt-4 mb-2 px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
          WORKSPACE
        </p>

        <nav class="space-y-1" aria-label="Main navigation">
          <template v-for="item in visibleMenu" :key="item.path">
            <!-- Group with a sub-menu -->
            <div v-if="item.children">
              <button
                type="button"
                :aria-expanded="isExpanded(item)"
                :aria-controls="`submenu-${item.path}`"
                @click="toggle(item)"
                class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors bg-transparent border-none cursor-pointer text-left"
                :class="isActiveRoute(item.path) ? 'font-semibold text-white' : 'text-slate-300 hover:bg-[#131d38] hover:text-white'"
              >
                <CommonIcon :icon="item.icon" :size="20" class="shrink-0 text-slate-300 group-hover:text-white" />
                <span class="truncate flex-1">{{ item.title }}</span>
                <CommonIcon
                  icon="hugeicons:arrow-down-01"
                  :size="16"
                  :class="`shrink-0 text-slate-400 transition-transform ${isExpanded(item) ? 'rotate-180' : ''}`"
                />
              </button>
              <div v-show="isExpanded(item)" :id="`submenu-${item.path}`" class="mt-1 ml-5 pl-3 space-y-1 border-l-solid border-l-1 border-slate-600/60">
                <NuxtLink
                  v-for="child in item.children"
                  :key="child.path"
                  :to="child.path"
                  class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors no-underline"
                  :class="isActiveRoute(child.path) ? 'bg-[#1a2647] font-semibold text-white' : 'text-slate-300 hover:bg-[#131d38] hover:text-white'"
                  :aria-current="isActiveRoute(child.path) ? 'page' : undefined"
                >
                  <CommonIcon :icon="child.icon" :size="18" class="shrink-0 text-slate-300 group-hover:text-white" />
                  <span class="truncate">{{ child.title }}</span>
                </NuxtLink>
              </div>
            </div>

            <NuxtLink
              v-else
              :to="item.path"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors no-underline"
              :class="isActiveRoute(item.path) ? 'bg-[#1a2647] font-semibold text-white' : 'text-slate-300 hover:bg-[#131d38] hover:text-white'"
              :aria-current="isActiveRoute(item.path) ? 'page' : undefined"
            >
              <CommonIcon :icon="item.icon" :size="20" class="shrink-0 text-slate-300 group-hover:text-white" />
              <span class="truncate">{{ item.title }}</span>
            </NuxtLink>
          </template>
        </nav>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div class="space-y-1 border-t border-slate-800/80 pt-3">
        <!-- User Role Indicator -->
      <div class="mb-5 rounded-xl border border-slate-700/50 bg-[#131d38] px-3.5 py-2 text-sm font-medium text-slate-200">
        <div class="flex items-center gap-2.5 ">
              <span class="h-2 w-2 rounded-full bg-green-500"></span>
              <span>{{ auth.user?.role?.title ?? 'Staff' }}</span>
          </div>
      </div>
       <NuxtLink
            to="/dashboard/settings"
            class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors no-underline"
            :class="isActiveRoute('/dashboard/settings') ? 'bg-[#1a2647] font-semibold text-white' : 'text-slate-300 hover:bg-[#131d38] hover:text-white'"
            :aria-current="isActiveRoute('/dashboard/settings') ? 'page' : undefined"
          >
            <CommonIcon icon="hugeicons:settings-04" :size="20" class="shrink-0 text-slate-300 group-hover:text-white" />
            <span class="truncate">Settings</span>
      </NuxtLink>
      

      <button
        type="button"
        @click="signout"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors bg-transparent border-none hover:bg-[#131d38] hover:text-white"
      >
        <CommonIcon icon="hugeicons:logout-04" :size="20" class="shrink-0" />
        <span>Sign Out</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { APPLICATION_VIEW_PERMISSIONS } from '~/composables/apiclient/application'

const route = useRoute()
const auth = useAuthStore()

interface INavItem {
  title: string
  path: string
  icon: string
  /** The user needs at least one of these to see the item. */
  permission?: string | string[]
  /** Makes this a group: `path` is the shared prefix, and the group shows if any child does. */
  children?: INavItem[]
}

const nav_menu: INavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: 'hugeicons:dashboard-square-01' },
  { title: 'Enquiries', path: '/dashboard/tickets', icon: 'hugeicons:tickets' },
  { 
    title: 'Memberships', 
    path: '/dashboard/memberships', 
    icon: 'hugeicons:identity-card-check',
    children: [
      {title: "Members", path: "/dashboard/memberships/members", icon: 'hugeicons:user-group-02'},
      {title: "Grades", path: "/dashboard/memberships/grades", icon:"hugeicons:hierarchy-square-05"},
      { title: 'Applications', path: '/dashboard/memberships/applications', icon: 'hugeicons:license-draft', permission: APPLICATION_VIEW_PERMISSIONS },
    ]
  },
  { title: 'Events', path: '/dashboard/events', icon: 'hugeicons:calendar-03' },
  { title: 'Profiles', path: '/dashboard/profiles', icon: 'hugeicons:user-account', permission: 'persons:read' },
  { title: 'Organisations', path: '/dashboard/organisations', icon: 'hugeicons:building-03', permission: 'persons:read' },
  {
    title: 'Access',
    path: '/dashboard/access',
    icon: 'hugeicons:user-shield-01',
    children: [
      { title: 'Users', path: '/dashboard/access/users', icon: 'hugeicons:user-multiple', permission: 'users:read' },
      { title: 'Roles', path: '/dashboard/access/roles', icon: 'hugeicons:shield-key', permission: 'roles:manage' },
    ],
  },
//   { title: 'Team Pipeline', path: '/pipeline', icon: 'hugeicons:analytics-up' },
//   { title: 'Lead Assignment', path: '/lead-assignment', icon: 'hugeicons:target-02' },
//   { title: 'Follow-ups', path: '/follow-ups', icon: 'hugeicons:clock-01' },
//   { title: 'AI Drafts', path: '/ai-drafts', icon: 'hugeicons:mail-01' },
//   { title: 'Clients', path: '/clients', icon: 'hugeicons:user-group' },
//   { title: 'Proposals', path: '/proposals', icon: 'hugeicons:file-02' },
//   { title: 'Invoices', path: '/invoices', icon: 'hugeicons:invoice-01' },
//   { title: 'Surveillance Tasks', path: '/surveillance', icon: 'hugeicons:clipboard-check-01' }
]

const allowed = (item: INavItem) => !item.permission || [item.permission].flat().some((p) => auth.can(p))

const visibleMenu = computed(() => nav_menu
  .filter(allowed)
  .map((item) => (item.children ? { ...item, children: item.children.filter(allowed) } : item))
  .filter((item) => !item.children || item.children.length > 0))

// Groups the user opened or closed by hand; otherwise a group is open while one of its pages is showing.
const toggled = ref<Record<string, boolean>>({})
const isExpanded = (item: INavItem) => toggled.value[item.path] ?? isActiveRoute(item.path)
const toggle = (item: INavItem) => { toggled.value[item.path] = !isExpanded(item) }

// The dashboard home is a prefix of every other menu item, so it only matches exactly.
// Other items also stay active on their sub-pages (e.g. /dashboard/tickets/new).
const isActiveRoute = (path: string) =>
  route.path === path || (path !== '/dashboard' && route.path.startsWith(`${path}/`))

const signout = async () =>{
    await auth.logout()
    navigateTo("/")
}
</script>