<template>
  <div 
    ref="canvasContainerRef"
    class="canvas-container"
    @click="handleCanvasClick"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
    @wheel="handleWheel"
    @dragover.prevent="handleDragOver"
    @drop="handleDrop"
  >
    <svg 
      class="canvas-svg"
      :style="svgStyle"
    >
      <defs>
        <marker
          id="arrow-end"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#666666" />
        </marker>
        <marker
          id="arrow-start"
          viewBox="0 0 10 10"
          refX="1"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 10 0 L 0 5 L 10 10 z" fill="#666666" />
        </marker>
        <marker
          id="diamond-end"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <polygon points="0,5 5,0 10,5 5,10" fill="#666666" />
        </marker>
        <marker
          id="diamond-start"
          viewBox="0 0 10 10"
          refX="1"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <polygon points="0,5 5,0 10,5 5,10" fill="#666666" />
        </marker>
        <marker
          id="circle-end"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <circle cx="5" cy="5" r="4" fill="#666666" />
        </marker>
        <marker
          id="circle-start"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <circle cx="5" cy="5" r="4" fill="#666666" />
        </marker>
        <pattern
          id="grid"
          :width="gridSize"
          :height="gridSize"
          patternUnits="userSpaceOnUse"
        >
          <path
            :d="`M ${gridSize} 0 L 0 0 0 ${gridSize}`"
            fill="none"
            stroke="#e0e0e0"
            stroke-width="0.5"
          />
        </pattern>
      </defs>
      
      <rect
        v-if="gridVisible"
        class="grid-background"
        :x="-10000"
        :y="-10000"
        width="20000"
        height="20000"
        fill="url(#grid)"
      />
      
      <g class="edges-layer">
        <EdgeComponent
          v-for="edge in edges"
          :key="edge.id"
          :edge="edge"
          :selected="isSelected(edge.id)"
          @select="selectEdge(edge.id, $event)"
        />
        
        <path
          v-if="connectingEdge"
          :d="tempEdgePath"
          fill="none"
          stroke="#2196f3"
          stroke-width="2"
          stroke-dasharray="5,5"
        />
      </g>
      
      <g class="nodes-layer">
        <NodeComponent
          v-for="node in visibleNodes"
          :key="node.id"
          :node="node"
          :selected="isSelected(node.id)"
          @select="selectNode(node.id, $event)"
          @mousedown="startDrag(node, $event)"
          @dblclick="startEdit(node)"
          @start-connect="startConnect(node)"
          @add-child="handleAddChild(node)"
          @contextmenu="handleNodeContextMenu(node, $event)"
        />
      </g>
      
      <g class="textboxes-layer">
        <TextBoxComponent
          v-for="textBox in textBoxes"
          :key="textBox.id"
          :textBox="textBox"
          :selected="isSelected(textBox.id)"
          @select="selectTextBox(textBox.id, $event)"
          @mousedown="startDrag(textBox, $event)"
          @dblclick="startEdit(textBox)"
        />
      </g>
      
      <foreignObject
        v-if="editingElement"
        :x="editingPosition.x"
        :y="editingPosition.y"
        :width="editingSize.width"
        :height="editingSize.height"
      >
        <input
          ref="editInputRef"
          v-model="editText"
          class="node-edit-input"
          @blur="finishEdit"
          @keyup.enter="finishEdit"
          @keyup.esc="cancelEdit"
        />
      </foreignObject>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useDiagramStore } from '@/stores/diagramStore'
import type { DiagramNode, TextBox as TextBoxType, Position } from '@/types'
import NodeComponent from './NodeComponent.vue'
import EdgeComponent from './EdgeComponent.vue'
import TextBoxComponent from './TextBoxComponent.vue'
import { rafThrottle } from '@/utils/performance'

const diagramStore = useDiagramStore()

const canvasContainerRef = ref<HTMLElement | null>(null)
const editInputRef = ref<HTMLInputElement | null>(null)

const isDraggingCanvas = ref(false)
const isDraggingElement = ref(false)
const dragStartPos = ref<Position>({ x: 0, y: 0 })
const elementStartPos = ref<Position>({ x: 0, y: 0 })
const draggingElement = ref<DiagramNode | TextBoxType | null>(null)
const lastDragPosition = ref<Position>({ x: 0, y: 0 })
const hasDragged = ref(false)

const editingElement = ref<DiagramNode | TextBoxType | null>(null)
const editText = ref('')

const canvasState = computed(() => diagramStore.canvasState)
const nodes = computed(() => diagramStore.nodes)
const edges = computed(() => diagramStore.edges)
const textBoxes = computed(() => diagramStore.textBoxes)
const selection = computed(() => diagramStore.selection)
const connectingEdge = computed(() => diagramStore.connectingEdge)
const gridVisible = computed(() => canvasState.value.gridVisible)
const gridSize = computed(() => canvasState.value.gridSize)

function isNodeVisible(node: DiagramNode): boolean {
  if (!('collapsed' in node) || !node.parentId) {
    return true
  }
  
  let currentParentId = node.parentId
  while (currentParentId) {
    const parent = nodes.value.find(n => n.id === currentParentId) as any
    if (!parent) break
    if (parent.collapsed) {
      return false
    }
    currentParentId = parent.parentId
  }
  return true
}

const visibleNodes = computed(() => {
  return nodes.value.filter(node => isNodeVisible(node))
})

const svgStyle = computed(() => ({
  transform: `translate(${canvasState.value.pan.x}px, ${canvasState.value.pan.y}px) scale(${canvasState.value.zoom})`,
  transformOrigin: '0 0'
}))

const tempEdgePath = computed(() => {
  if (!connectingEdge.value || connectingEdge.value.tempPoints.length < 2) return ''
  const points = connectingEdge.value.tempPoints
  return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
})

const editingPosition = computed(() => {
  if (!editingElement.value) return { x: 0, y: 0 }
  return editingElement.value.position
})

const editingSize = computed(() => {
  if (!editingElement.value) return { width: 100, height: 30 }
  if ('size' in editingElement.value) {
    return { width: editingElement.value.size.width, height: editingElement.value.size.height }
  }
  return { width: 150, height: 30 }
})



function isSelected(id: string): boolean {
  return selection.value.elementIds.includes(id)
}

function getMousePosition(event: MouseEvent): Position {
  if (!canvasContainerRef.value) return { x: 0, y: 0 }
  const rect = canvasContainerRef.value.getBoundingClientRect()
  const x = (event.clientX - rect.left - canvasState.value.pan.x) / canvasState.value.zoom
  const y = (event.clientY - rect.top - canvasState.value.pan.y) / canvasState.value.zoom
  return { x, y }
}

function handleCanvasClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('.node, .edge, .textbox')) return
  if (!isDraggingCanvas.value && !isDraggingElement.value) {
    diagramStore.clearSelection()
  }
}

function handleMouseDown(event: MouseEvent) {
  if (event.button !== 0) return
  if ((event.target as HTMLElement).closest('.node, .edge, .textbox')) return
  
  isDraggingCanvas.value = true
  dragStartPos.value = {
    x: event.clientX - canvasState.value.pan.x,
    y: event.clientY - canvasState.value.pan.y
  }
}

const throttledUpdatePosition = rafThrottle((elementId: string, newPosition: Position) => {
  diagramStore.updateElementSilent(elementId, { position: newPosition })
})

function handleMouseMove(event: MouseEvent) {
  if (connectingEdge.value) {
    const pos = getMousePosition(event)
    const sourceNode = nodes.value.find(n => n.id === connectingEdge.value!.sourceId)
    if (sourceNode) {
      const sourceCenter = {
        x: sourceNode.position.x + sourceNode.size.width / 2,
        y: sourceNode.position.y + sourceNode.size.height / 2
      }
      connectingEdge.value.tempPoints = [sourceCenter, pos]
    }
  }
  
  if (isDraggingCanvas.value) {
    const newPan = {
      x: event.clientX - dragStartPos.value.x,
      y: event.clientY - dragStartPos.value.y
    }
    diagramStore.setPan(newPan)
    return
  }
  
  if (isDraggingElement.value && draggingElement.value) {
    const mousePos = getMousePosition(event)
    const dx = mousePos.x - dragStartPos.value.x
    const dy = mousePos.y - dragStartPos.value.y
    
    let newPosition = {
      x: Math.round((elementStartPos.value.x + dx) / gridSize.value) * gridSize.value,
      y: Math.round((elementStartPos.value.y + dy) / gridSize.value) * gridSize.value
    }
    
    newPosition = clampElementPosition(newPosition, draggingElement.value)
    
    if (newPosition.x !== lastDragPosition.value.x || newPosition.y !== lastDragPosition.value.y) {
      hasDragged.value = true
      lastDragPosition.value = newPosition
      throttledUpdatePosition(draggingElement.value.id, newPosition)
    }
  }
}

function handleMouseUp(event: MouseEvent) {
  if (connectingEdge.value) {
    const mousePos = getMousePosition(event)
    const targetNode = findNodeAtPosition(mousePos)
    if (targetNode && targetNode.id !== connectingEdge.value.sourceId) {
      const edge = diagramStore.createEdge(connectingEdge.value.sourceId, targetNode.id)
      if (edge) diagramStore.addEdge(edge)
    }
    diagramStore.connectingEdge = null
  }
  
  if (isDraggingElement.value && draggingElement.value && hasDragged.value) {
    diagramStore.updateElement(draggingElement.value.id, { 
      position: { ...lastDragPosition.value } 
    }, true)
  }
  
  isDraggingCanvas.value = false
  isDraggingElement.value = false
  draggingElement.value = null
  hasDragged.value = false
  lastDragPosition.value = { x: 0, y: 0 }
  elementStartPos.value = { x: 0, y: 0 }
  dragStartPos.value = { x: 0, y: 0 }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const mousePos = getMousePosition(event)
  diagramStore.setZoom(canvasState.value.zoom + delta, mousePos)
}

function getCanvasContainerSize() {
  if (!canvasContainerRef.value) {
    return { width: 1200, height: 800 }
  }
  const rect = canvasContainerRef.value.getBoundingClientRect()
  return { width: rect.width, height: rect.height }
}

function handleDragOver(event: DragEvent) {
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  const elementType = event.dataTransfer?.getData('elementType')
  if (!elementType) return
  
  let position = getMousePosition(event)
  
  const containerSize = getCanvasContainerSize()
  position = diagramStore.clampPositionToViewport(
    position,
    { width: 140, height: 50 },
    diagramStore.getViewportBounds(containerSize)
  )
  
  switch (elementType) {
    case 'mindmap-node': {
      const node = diagramStore.createMindMapNode('新主题', position)
      node.style.fillColor = '#e3f2fd'
      diagramStore.addNode(node)
      break
    }
    case 'mindmap-child': {
      const parentId = selection.value.elementIds.find(id => 
        nodes.value.some(n => n.id === id)
      ) || null
      const node = diagramStore.createMindMapNode('子主题', position, parentId)
      node.style.fillColor = '#e8f5e9'
      diagramStore.addNode(node)
      if (parentId) {
        const edge = diagramStore.createEdge(parentId, node.id)
        if (edge) diagramStore.addEdge(edge)
      }
      break
    }
    case 'flow-topic': {
      diagramStore.addTopicNode('中心主题', position)
      break
    }
    case 'flow-start': {
      const node = diagramStore.createFlowchartNode('开始', position, 'start')
      node.style.fillColor = '#e8f5e9'
      diagramStore.addNode(node)
      break
    }
    case 'flow-process': {
      const node = diagramStore.createFlowchartNode('处理', position, 'process')
      diagramStore.addNode(node)
      break
    }
    case 'flow-decision': {
      const node = diagramStore.createFlowchartNode('判断', position, 'decision')
      node.style.fillColor = '#fff8e1'
      diagramStore.addNode(node)
      break
    }
    case 'flow-input': {
      const node = diagramStore.createFlowchartNode('输入', position, 'input')
      node.style.fillColor = '#f3e5f5'
      diagramStore.addNode(node)
      break
    }
    case 'flow-end': {
      const node = diagramStore.createFlowchartNode('结束', position, 'end')
      node.style.fillColor = '#ffebee'
      diagramStore.addNode(node)
      break
    }
    case 'textbox': {
      const textBox = diagramStore.createTextBox('文本', position)
      diagramStore.addTextBox(textBox)
      break
    }
  }
}

function selectNode(id: string, event: MouseEvent) {
  diagramStore.selectElement(id, 'node', event.ctrlKey || event.metaKey)
}

function selectEdge(id: string, event: MouseEvent) {
  diagramStore.selectElement(id, 'edge', event.ctrlKey || event.metaKey)
}

function selectTextBox(id: string, event: MouseEvent) {
  diagramStore.selectElement(id, 'textbox', event.ctrlKey || event.metaKey)
}

function startDrag(element: DiagramNode | TextBoxType, event: MouseEvent) {
  event.stopPropagation()
  event.preventDefault()
  
  if (editingElement.value) {
    finishEdit()
    return
  }
  
  isDraggingElement.value = true
  draggingElement.value = element
  hasDragged.value = false
  const mousePos = getMousePosition(event)
  dragStartPos.value = mousePos
  elementStartPos.value = { ...element.position }
  lastDragPosition.value = { ...element.position }
  
  if (!isSelected(element.id)) {
    diagramStore.selectElement(element.id, element.type === 'textbox' ? 'textbox' : 'node')
  }
}

function startEdit(element: DiagramNode | TextBoxType) {
  editingElement.value = element
  editText.value = element.text
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

function finishEdit() {
  if (editingElement.value && editText.value.trim()) {
    diagramStore.updateElement(editingElement.value.id, { text: editText.value.trim() })
  }
  editingElement.value = null
  editText.value = ''
}

function cancelEdit() {
  editingElement.value = null
  editText.value = ''
}

function startConnect(node: DiagramNode) {
  const centerPoint = {
    x: node.position.x + node.size.width / 2,
    y: node.position.y + node.size.height / 2
  }
  diagramStore.connectingEdge = {
    sourceId: node.id,
    tempPoints: [centerPoint, centerPoint]
  }
}

function handleAddChild(node: DiagramNode) {
  const nodeType = 'nodeType' in node ? (node as any).nodeType : 'process'
  const childType = nodeType === 'topic' || nodeType === 'start' ? 'process' : nodeType
  diagramStore.addChildNode(node.id, '子节点', childType)
}

function handleNodeContextMenu(node: DiagramNode, event: MouseEvent) {
  event.preventDefault()
  showNodeContextMenu(node, event)
}

function showNodeContextMenu(node: DiagramNode, event: MouseEvent) {
  const menuItems = [
    { label: '添加子节点', action: () => diagramStore.addChildNode(node.id) },
    { label: '删除节点', action: () => diagramStore.deleteElements([node.id]) },
    { label: '删除子树', action: () => diagramStore.deleteSubtree(node.id) },
    { type: 'separator' },
    { label: '展开全部', action: () => diagramStore.expandAll(node.id) },
    { label: '折叠全部', action: () => diagramStore.collapseAll(node.id) },
    { type: 'separator' },
    { label: '自动布局', action: () => diagramStore.autoLayout() },
    { label: '自动编号连接线', action: () => diagramStore.numberEdgesFromRoot() }
  ]
  
  const menu = document.createElement('div')
  menu.className = 'context-menu'
  menu.style.position = 'fixed'
  menu.style.left = `${event.clientX}px`
  menu.style.top = `${event.clientY}px`
  menu.style.zIndex = '1000'
  menu.style.background = 'white'
  menu.style.border = '1px solid #ddd'
  menu.style.borderRadius = '4px'
  menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
  menu.style.padding = '4px 0'
  menu.style.minWidth = '160px'
  
  menuItems.forEach(item => {
    if (item.type === 'separator') {
      const sep = document.createElement('div')
      sep.style.height = '1px'
      sep.style.background = '#eee'
      sep.style.margin = '4px 0'
      menu.appendChild(sep)
    } else {
      const menuItem = document.createElement('div')
      menuItem.textContent = item.label
      menuItem.style.padding = '8px 16px'
      menuItem.style.cursor = 'pointer'
      menuItem.style.fontSize = '13px'
      menuItem.style.color = '#333'
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.background = '#f5f5f5'
      })
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.background = 'transparent'
      })
      menuItem.addEventListener('click', () => {
        item.action()
        document.body.removeChild(menu)
      })
      menu.appendChild(menuItem)
    }
  })
  
  document.body.appendChild(menu)
  
  const closeMenu = () => {
    if (document.body.contains(menu)) {
      document.body.removeChild(menu)
    }
    document.removeEventListener('click', closeMenu)
    document.removeEventListener('contextmenu', closeMenu)
  }
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu)
    document.addEventListener('contextmenu', closeMenu)
  }, 0)
}

function getCanvasViewportBounds() {
  if (!canvasContainerRef.value) {
    return diagramStore.getViewportBounds()
  }
  const rect = canvasContainerRef.value.getBoundingClientRect()
  return diagramStore.getViewportBounds({
    width: rect.width,
    height: rect.height
  })
}

function clampElementPosition(
  position: Position,
  element: DiagramNode | TextBoxType
): Position {
  const elementWidth = 'size' in element ? element.size.width : 150
  const elementHeight = 'size' in element ? element.size.height : 30
  
  return diagramStore.clampPositionToViewport(
    position,
    { width: elementWidth, height: elementHeight },
    getCanvasViewportBounds()
  )
}

function findNodeAtPosition(pos: Position): DiagramNode | null {
  for (const node of visibleNodes.value) {
    if (
      pos.x >= node.position.x &&
      pos.x <= node.position.x + node.size.width &&
      pos.y >= node.position.y &&
      pos.y <= node.position.y + node.size.height
    ) {
      return node
    }
  }
  return null
}

defineExpose({
  getContainerSize
})
</script>

<style scoped>
.canvas-container {
  flex: 1;
  overflow: hidden;
  background: #fafafa;
  cursor: default;
  position: relative;
}

.canvas-svg {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.canvas-svg:active {
  cursor: grabbing;
}

.grid-background {
  pointer-events: none;
}

.edges-layer {
  pointer-events: none;
}

.edges-layer :deep(path) {
  pointer-events: stroke;
  cursor: pointer;
}

.nodes-layer :deep(.node) {
  cursor: move;
}

.textboxes-layer :deep(.textbox) {
  cursor: move;
}

.node-edit-input {
  width: 100%;
  height: 100%;
  border: 2px solid #2196f3;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  background: white;
  outline: none;
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
}
</style>
