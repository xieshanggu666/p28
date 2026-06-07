<template>
  <div class="app-container">
    <Toolbar />
    <div class="main-content">
      <Sidebar />
      <Canvas />
      <StylePanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import Toolbar from '@/components/Toolbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Canvas from '@/components/Canvas.vue'
import StylePanel from '@/components/StylePanel.vue'
import { useDiagramStore } from '@/stores/diagramStore'

const diagramStore = useDiagramStore()

onMounted(() => {
  diagramStore.init()
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }
}
</style>
