<template>
  <div class="app-container">
    <Toolbar />
    <div class="main-content">
      <Sidebar 
        @auto-layout="diagramStore.autoLayout()"
        @number-edges="diagramStore.numberEdgesFromRoot()"
        @expand-all="diagramStore.expandAll()"
        @collapse-all="diagramStore.collapseAll()"
        @fit-view="handleFitView"
        @reset-view="diagramStore.resetView()"
        @zoom-in="handleZoomIn"
        @zoom-out="handleZoomOut"
      />
      <Canvas ref="canvasRef" />
      <StylePanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Toolbar from '@/components/Toolbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import Canvas from '@/components/Canvas.vue'
import StylePanel from '@/components/StylePanel.vue'
import { useDiagramStore } from '@/stores/diagramStore'

const diagramStore = useDiagramStore()
const canvasRef = ref<InstanceType<typeof Canvas> | null>(null)

function getCanvasSize() {
  if (canvasRef.value?.getContainerSize) {
    return canvasRef.value.getContainerSize()
  }
  return undefined
}

function handleFitView() {
  diagramStore.fitView({
    containerSize: getCanvasSize()
  })
}

function handleZoomIn() {
  diagramStore.setZoom(diagramStore.canvasState.zoom + 0.2)
}

function handleZoomOut() {
  diagramStore.setZoom(diagramStore.canvasState.zoom - 0.2)
}

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
