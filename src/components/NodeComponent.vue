<template>
  <g 
    class="node"
    :class="{ selected, 'is-topic': isTopic, 'is-root': isRoot }"
    :transform="`translate(${node.position.x}, ${node.position.y})`"
  >
    <rect
      :width="node.size.width"
      :height="node.size.height"
      fill="transparent"
      stroke="transparent"
      class="hit-area"
      @click.stop="$emit('select', $event)"
      @mousedown.stop="$emit('mousedown', $event)"
      @dblclick.stop="$emit('dblclick')"
      @contextmenu.stop="$emit('contextmenu', $event)"
    />
    
    <rect
      v-if="isTopic || isRoot"
      :x="-4"
      :y="-4"
      :width="node.size.width + 8"
      :height="node.size.height + 8"
      :rx="(node.style.borderRadius || 8) + 4"
      :ry="(node.style.borderRadius || 8) + 4"
      fill="none"
      :stroke="isTopic ? '#1976d2' : '#388e3c'"
      stroke-width="2"
      stroke-dasharray="6,3"
      opacity="0.6"
      pointer-events="none"
    />
    
    <rect
      v-if="shape === 'rectangle' || shape === 'rounded-rectangle'"
      :width="node.size.width"
      :height="node.size.height"
      :rx="node.style.borderRadius"
      :ry="node.style.borderRadius"
      :fill="node.style.fillColor"
      :stroke="selected ? '#2196f3' : (isTopic ? '#1976d2' : node.style.strokeColor)"
      :stroke-width="selected ? 3 : (isTopic ? 2.5 : node.style.strokeWidth)"
      pointer-events="none"
    />
    
    <ellipse
      v-else-if="shape === 'ellipse'"
      :cx="node.size.width / 2"
      :cy="node.size.height / 2"
      :rx="node.size.width / 2"
      :ry="node.size.height / 2"
      :fill="node.style.fillColor"
      :stroke="selected ? '#2196f3' : (isTopic ? '#1976d2' : node.style.strokeColor)"
      :stroke-width="selected ? 3 : (isTopic ? 2.5 : node.style.strokeWidth)"
      pointer-events="none"
    />
    
    <polygon
      v-else-if="shape === 'diamond'"
      :points="diamondPoints"
      :fill="node.style.fillColor"
      :stroke="selected ? '#2196f3' : node.style.strokeColor"
      :stroke-width="selected ? 3 : node.style.strokeWidth"
      pointer-events="none"
    />
    
    <polygon
      v-else-if="shape === 'parallelogram'"
      :points="parallelogramPoints"
      :fill="node.style.fillColor"
      :stroke="selected ? '#2196f3' : node.style.strokeColor"
      :stroke-width="selected ? 3 : node.style.strokeWidth"
      pointer-events="none"
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
    
    <g v-if="level >= 0" class="level-indicator" pointer-events="none">
      <circle
        :cx="12"
        :cy="12"
        r="10"
        :fill="levelColors[level % levelColors.length]"
        opacity="0.9"
      />
      <text
        :x="12"
        :y="12"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="white"
        font-size="10"
        font-weight="bold"
      >
        {{ level + 1 }}
      </text>
    </g>
    
    <g v-if="hasChildren" class="children-count" pointer-events="none">
      <rect
        :x="node.size.width - 28"
        :y="node.size.height - 16"
        width="24"
        height="16"
        rx="8"
        ry="8"
        fill="#666"
        opacity="0.8"
      />
      <text
        :x="node.size.width - 16"
        :y="node.size.height - 8"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="white"
        font-size="10"
        font-weight="500"
      >
        {{ childrenCount }}
      </text>
    </g>
    
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
      :cx="node.size.width + 16"
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
      :x="node.size.width + 16"
      :y="node.size.height / 2"
      text-anchor="middle"
      dominant-baseline="middle"
      :font-size="14"
      fill="#666"
      pointer-events="none"
    >
      {{ node.collapsed ? '+' : '−' }}
    </text>
    
    <circle
      v-if="selected"
      :cx="node.size.width + 40"
      :cy="node.size.height / 2"
      r="10"
      fill="#4caf50"
      stroke="white"
      stroke-width="2"
      class="add-child-handle"
      @click.stop="$emit('add-child')"
    />
    <text
      v-if="selected"
      :x="node.size.width + 40"
      :y="node.size.height / 2"
      text-anchor="middle"
      dominant-baseline="middle"
      font-size="14"
      fill="white"
      font-weight="bold"
      pointer-events="none"
    >
      +
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
  (e: 'add-child'): void
  (e: 'contextmenu', event: MouseEvent): void
}>()

const diagramStore = useDiagramStore()
const showConnectTip = ref(false)

const levelColors = ['#1976d2', '#388e3c', '#f57c00', '#c2185b', '#7b1fa2', '#00796b']

const shape = computed(() => props.node.style.shape)

const isTopic = computed(() => {
  return 'nodeType' in props.node && props.node.nodeType === 'topic'
})

const isRoot = computed(() => {
  return 'isRoot' in props.node && props.node.isRoot
})

const level = computed(() => {
  if ('level' in props.node) {
    return props.node.level
  }
  return -1
})

const hasChildren = computed(() => {
  if ('children' in props.node) {
    return props.node.children.length > 0
  }
  return false
})

const childrenCount = computed(() => {
  if ('children' in props.node) {
    return props.node.children.length
  }
  return 0
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
    diagramStore.toggleCollapse(props.node.id)
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

.node.is-topic :deep(rect),
.node.is-topic :deep(ellipse) {
  filter: drop-shadow(0 2px 4px rgba(25, 118, 210, 0.3));
}

.node.is-root :deep(rect),
.node.is-root :deep(ellipse) {
  filter: drop-shadow(0 2px 4px rgba(56, 142, 60, 0.3));
}

.level-indicator {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
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

.add-child-handle {
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, transform 0.1s;
}

.selected .add-child-handle {
  opacity: 1;
}

.add-child-handle:hover {
  fill: #388e3c;
  transform: scale(1.1);
}

.children-count {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}
</style>
