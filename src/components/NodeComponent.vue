<template>
  <g 
    class="node"
    :class="{ selected }"
    :transform="`translate(${node.position.x}, ${node.position.y})`"
  >
    <rect
      v-if="shape === 'rectangle' || shape === 'rounded-rectangle'"
      :width="node.size.width"
      :height="node.size.height"
      :rx="node.style.borderRadius"
      :ry="node.style.borderRadius"
      :fill="node.style.fillColor"
      :stroke="selected ? '#2196f3' : node.style.strokeColor"
      :stroke-width="selected ? 3 : node.style.strokeWidth"
    />
    
    <ellipse
      v-else-if="shape === 'ellipse'"
      :cx="node.size.width / 2"
      :cy="node.size.height / 2"
      :rx="node.size.width / 2"
      :ry="node.size.height / 2"
      :fill="node.style.fillColor"
      :stroke="selected ? '#2196f3' : node.style.strokeColor"
      :stroke-width="selected ? 3 : node.style.strokeWidth"
    />
    
    <polygon
      v-else-if="shape === 'diamond'"
      :points="diamondPoints"
      :fill="node.style.fillColor"
      :stroke="selected ? '#2196f3' : node.style.strokeColor"
      :stroke-width="selected ? 3 : node.style.strokeWidth"
    />
    
    <polygon
      v-else-if="shape === 'parallelogram'"
      :points="parallelogramPoints"
      :fill="node.style.fillColor"
      :stroke="selected ? '#2196f3' : node.style.strokeColor"
      :stroke-width="selected ? 3 : node.style.strokeWidth"
    />
    
    <text
      :x="node.size.width / 2"
      :y="node.size.height / 2"
      text-anchor="middle"
      dominant-baseline="middle"
      :fill="node.style.textColor"
      :font-size="node.style.fontSize"
      :font-family="node.style.fontFamily"
      :font-weight="node.style.fontWeight"
      pointer-events="none"
    >
      {{ node.text }}
    </text>
    
    <circle
      v-if="selected"
      :cx="node.size.width"
      :cy="node.size.height / 2"
      r="6"
      fill="#2196f3"
      stroke="white"
      stroke-width="2"
      class="connect-handle"
      @mouseenter="showConnectTip = true"
      @mouseleave="showConnectTip = false"
      @mousedown.stop="$emit('start-connect')"
    />
    
    <circle
      v-if="hasChildren && 'collapsed' in node"
      :cx="node.size.width"
      :cy="node.size.height / 2"
      r="10"
      fill="#fff"
      stroke="#999"
      stroke-width="1"
      class="collapse-handle"
      @click.stop="toggleCollapse"
    />
    <text
      v-if="hasChildren && 'collapsed' in node"
      :x="node.size.width"
      :y="node.size.height / 2"
      text-anchor="middle"
      dominant-baseline="middle"
      :font-size="14"
      fill="#666"
      pointer-events="none"
    >
      {{ node.collapsed ? '+' : '−' }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DiagramNode } from '@/types'
import { useDiagramStore } from '@/stores/diagramStore'

const props = defineProps<{
  node: DiagramNode
  selected: boolean
}>()

const emit = defineEmits<{
  (e: 'select', event: MouseEvent): void
  (e: 'mousedown', event: MouseEvent): void
  (e: 'dblclick'): void
  (e: 'start-connect'): void
}>()

const diagramStore = useDiagramStore()
const showConnectTip = ref(false)

const shape = computed(() => props.node.style.shape)

const hasChildren = computed(() => {
  if ('children' in props.node) {
    return props.node.children.length > 0
  }
  return false
})

const diamondPoints = computed(() => {
  const w = props.node.size.width
  const h = props.node.size.height
  return `${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`
})

const parallelogramPoints = computed(() => {
  const w = props.node.size.width
  const h = props.node.size.height
  const offset = 15
  return `${offset},0 ${w},0 ${w-offset},${h} 0,${h}`
})

function toggleCollapse(event: MouseEvent) {
  event.stopPropagation()
  if ('collapsed' in props.node) {
    diagramStore.updateElement(props.node.id, { collapsed: !props.node.collapsed } as any)
  }
}
</script>

<style scoped>
.node {
  transition: stroke 0.2s;
}

.node:hover :deep(rect),
.node:hover :deep(ellipse),
.node:hover :deep(polygon) {
  filter: brightness(0.98);
}

.connect-handle {
  cursor: crosshair;
  opacity: 0;
  transition: opacity 0.2s;
}

.node:hover .connect-handle,
.selected .connect-handle {
  opacity: 1;
}

.connect-handle:hover {
  fill: #1976d2;
  r: 8;
}

.collapse-handle {
  cursor: pointer;
}

.collapse-handle:hover {
  stroke: #2196f3;
  stroke-width: 2;
}
</style>
