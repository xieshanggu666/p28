<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <div class="logo">🧠 思维导图</div>
      <input 
        v-if="currentDiagram" 
        v-model="diagramName" 
        @blur="updateDiagramName"
        @keyup.enter="updateDiagramName"
        class="diagram-name" 
        type="text"
      />
    </div>
    
    <div class="toolbar-center">
      <button class="tool-btn" @click="handleUndo" :disabled="!canUndo" title="撤销 (Ctrl+Z)">
        ↶ 撤销
      </button>
      <button class="tool-btn" @click="handleRedo" :disabled="!canRedo" title="重做 (Ctrl+Y)">
        ↷ 重做
      </button>
      <div class="divider"></div>
      <button class="tool-btn" @click="zoomIn" title="放大 (Ctrl++)">
        🔍+
      </button>
      <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button class="tool-btn" @click="zoomOut" title="缩小 (Ctrl+-)">
        🔍-
      </button>
      <button class="tool-btn" @click="resetView" title="重置视图">
        👁️ 重置
      </button>
      <div class="divider"></div>
      <button class="tool-btn" @click="toggleGrid" :class="{ active: gridVisible }" title="显示网格">
        # 网格
      </button>
    </div>
    
    <div class="toolbar-right">
      <button class="tool-btn" @click="exportJSON" title="导出JSON">
        📤 JSON
      </button>
      <button class="tool-btn" @click="exportSVG" title="导出SVG">
        📤 SVG
      </button>
      <button class="tool-btn" @click="exportPNG" title="导出PNG">
        📤 PNG
      </button>
      <label class="tool-btn file-import" title="导入JSON">
        📥 导入
        <input type="file" accept=".json" @change="importJSON" style="display: none" />
      </label>
      <button class="tool-btn primary" @click="createNew" title="新建图表">
        ✨ 新建
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useDiagramStore } from '@/stores/diagramStore'
import html2canvas from 'html2canvas'

const diagramStore = useDiagramStore()

const diagramName = ref('')

const currentDiagram = computed(() => diagramStore.currentDiagram)
const canUndo = computed(() => diagramStore.canUndo)
const canRedo = computed(() => diagramStore.canRedo)
const zoom = computed(() => diagramStore.canvasState.zoom)
const gridVisible = computed(() => diagramStore.canvasState.gridVisible)

onMounted(() => {
  if (currentDiagram.value) {
    diagramName.value = currentDiagram.value.name
  }
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function updateDiagramName() {
  if (currentDiagram.value && diagramName.value) {
    currentDiagram.value.name = diagramName.value
  }
}

function handleUndo() {
  diagramStore.undo()
}

function handleRedo() {
  diagramStore.redo()
}

function zoomIn() {
  diagramStore.setZoom(diagramStore.canvasState.zoom + 0.1)
}

function zoomOut() {
  diagramStore.setZoom(diagramStore.canvasState.zoom - 0.1)
}

function resetView() {
  diagramStore.setZoom(1)
  diagramStore.setPan({ x: 0, y: 0 })
}

function toggleGrid() {
  diagramStore.toggleGrid()
}

function createNew() {
  const newDiagram = diagramStore.createNewDiagram('mindmap', '新图表')
  diagramStore.loadDiagram(newDiagram)
  diagramName.value = newDiagram.name
}

function exportJSON() {
  const json = diagramStore.exportToJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentDiagram.value?.name || 'diagram'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function exportSVG() {
  const svgElement = document.querySelector('.canvas-svg') as SVGElement
  if (!svgElement) return
  
  const svgData = new XMLSerializer().serializeToString(svgElement)
  const blob = new Blob([svgData], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${currentDiagram.value?.name || 'diagram'}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportPNG() {
  const canvasElement = document.querySelector('.canvas-container') as HTMLElement
  if (!canvasElement) return
  
  try {
    const canvas = await html2canvas(canvasElement, {
      backgroundColor: '#ffffff',
      scale: 2
    })
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentDiagram.value?.name || 'diagram'}.png`
    a.click()
  } catch (e) {
    console.error('Failed to export PNG:', e)
  }
}

function importJSON(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    if (diagramStore.importFromJSON(content)) {
      diagramName.value = diagramStore.currentDiagram?.name || ''
    } else {
      alert('导入失败：文件格式不正确')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  const activeTag = document.activeElement?.tagName
  const isEditing = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT'
  
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'z':
        e.preventDefault()
        handleUndo()
        break
      case 'y':
        e.preventDefault()
        handleRedo()
        break
      case '=':
      case '+':
        e.preventDefault()
        zoomIn()
        break
      case '-':
        e.preventDefault()
        zoomOut()
        break
    }
  }
  
  if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing) {
    if (diagramStore.selection.elementIds.length > 0) {
      e.preventDefault()
      e.stopPropagation()
      diagramStore.deleteElements(diagramStore.selection.elementIds)
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  font-size: 18px;
  font-weight: bold;
  color: #2196f3;
  margin-right: 16px;
}

.diagram-name {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  background: transparent;
  transition: all 0.2s;
  min-width: 150px;
}

.diagram-name:hover,
.diagram-name:focus {
  border-color: #2196f3;
  background: #f5f5f5;
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #555;
  background: #f5f5f5;
  transition: all 0.2s;
  white-space: nowrap;
}

.tool-btn:hover:not(:disabled) {
  background: #e0e0e0;
  color: #333;
}

.tool-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-btn.active {
  background: #e3f2fd;
  color: #1976d2;
}

.tool-btn.primary {
  background: #2196f3;
  color: white;
}

.tool-btn.primary:hover {
  background: #1976d2;
}

.divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
  margin: 0 4px;
}

.zoom-level {
  font-size: 12px;
  color: #666;
  min-width: 45px;
  text-align: center;
}

.file-import {
  cursor: pointer;
}

@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px;
  }
  
  .toolbar-center {
    order: 3;
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .logo {
    font-size: 16px;
    margin-right: 8px;
  }
  
  .diagram-name {
    min-width: 100px;
    font-size: 12px;
  }
  
  .tool-btn {
    padding: 4px 8px;
    font-size: 12px;
  }
}
</style>
