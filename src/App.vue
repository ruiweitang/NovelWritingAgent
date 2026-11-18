<script setup lang="ts">
/**
 * 应用壳：标题栏 + 路由视图过渡 + 全局 Toast；启动时加载全局设置
 */
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TitleBar from '@/components/layout/TitleBar.vue'
import AppToast from '@/components/base/AppToast.vue'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const settings = useSettingsStore()

onMounted(() => {
  settings.load().catch((e) => console.error('加载设置失败', e))
})
</script>

<template>
  <div class="app-shell">
    <TitleBar />
    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <Transition name="view" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </Transition>
      </RouterView>
    </main>
    <AppToast />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.app-main {
  flex: 1;
  min-height: 0;
}
</style>
