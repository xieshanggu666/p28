<template>
  <g class="edge" :class="{ selected }">
    <path
      :d="edgePath"
      fill="none"
      :stroke="selected ? '#2196f3' : edge.style.strokeColor"
      :stroke-width="selected ? 3 : edge.style.strokeWidth"
      :stroke-dasharray="strokeDasharray"
      :marker-end="markerEnd"
      :marker-start="markerStart"
      @click="$emit('select', $event)"
    />
    <path
      :d="edgePath"
      fill="none"
      stroke="transparent"
      stroke-width="20"
      style="cursor: pointer"
      @click="$emit('select', $event)"
    />
    <g v-if="hasLabel" class="edge-label">
      <rect
        :x="labelBackground.x"
        :y="labelBackground.y"
        :width="labelBackground.width"
        :height="labelBackground.height"
        :rx="4"
        :ry="4"
        fill="white"
        stroke="#ddd"
        stroke-width="1"
        pointer-events="none"
      />
      <text
        :x="textPosition.x"
        :y="textPosition.y"
        text-anchor="middle"
        dominant-baseline="middle"
        fill="#333"
        :font-size="labelFontSize"
        font-weight="500"
        pointer-events="none"
      >
        {{ displayLabel }}
      </text>
    </g>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Edge } from '@/types'
import { useDiagramStore } from '@/stores/diagramStore'

const props = defineProps<{
  edge: Edge
  selected: boolean
}>()

defineEmits<{
  (e: 'select', event: MouseEvent): void
}>()

const diagramStore = useDiagramStore()

const pathType = computed(() => props.edge.pathType || 'bezier')

const edgePath = computed(() => {
  if (props.edge.points.length < 2) return ''
  const points = props.edge.points
  const source = points[0]
  const target = points[points.length - 1]

  if (pathType.value === 'straight') {
    if (points.length === 2) {
      return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
    }
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`
    }
    return path
  }

  if (pathType.value === 'orthogonal') {
    return generateOrthogonalPath(source, target)
  }

  return generateBezierPath(source, target)
})

function generateBezierPath(source: { x: number; y: number }, target: { x: number; y: number }): string {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const controlOffset = Math.min(distance * 0.5, 100)

  let cp1x, cp1y, cp2x, cp2y

  if (Math.abs(dx) > Math.abs(dy)) {
    cp1x = source.x + controlOffset
    cp1y = source.y
    cp2x = target.x - controlOffset
    cp2y = target.y
  } else {
    cp1x = source.x
    cp1y = source.y + controlOffset
    cp2x = target.x
    cp2y = target.y - controlOffset
  }

  return `M ${source.x} ${source.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${target.x} ${target.y}`
}

function generateOrthogonalPath(source: { x: number; y: number }, target: { x: number; y: number }): string {
  const midX = (source.x + target.x) / 2
  const midY = (source.y + target.y) / 2

  let path = `M ${source.x} ${source.y}`

  if (Math.abs(source.y - target.y) > Math.abs(source.x - target.x)) {
    path += ` L ${source.x} ${midY}`
    path += ` L ${target.x} ${midY}`
  } else {
    path += ` L ${midX} ${source.y}`
    path += ` L ${midX} ${target.y}`
  }

  path += ` L ${target.x} ${target.y}`
  return path
}

const strokeDasharray = computed(() => {
  switch (props.edge.style.lineStyle) {
    case 'dashed':
      return '8,4'
    case 'dotted':
      return '2,2'
    default:
      return 'none'
  }
})

const markerEnd = computed(() => {
  switch (props.edge.style.endArrow) {
    case 'arrow':
      return 'url(#arrow-end)'
    case 'diamond':
      return 'url(#diamond-end)'
    case 'circle':
      return 'url(#circle-end)'
    default:
      return 'none'
  }
})

const markerStart = computed(() => {
  switch (props.edge.style.startArrow) {
    case 'arrow':
      return 'url(#arrow-start)'
    case 'diamond':
      return 'url(#diamond-start)'
    case 'circle':
      return 'url(#circle-start)'
    default:
      return 'none'
  }
})

const hasLabel = computed(() => {
  return !!(props.edge.text || props.edge.label || props.edge.number)
})

const displayLabel = computed(() => {
  const parts: string[] = []
  if (props.edge.number) parts.push(props.edge.number)
  if (props.edge.label) parts.push(props.edge.label)
  if (props.edge.text && !props.edge.label) parts.push(props.edge.text)
  return parts.join('. ')
})

const labelFontSize = computed(() => {
  return props.edge.number && props.edge.label ? '11' : '12'
})

const textPosition = computed(() => {
  if (props.edge.points.length < 2) return { x: 0, y: 0 }
  const points = props.edge.points
  const source = points[0]
  const target = points[points.length - 1]

  let midX, midY

  if (pathType.value === 'bezier') {
    const t = 0.5
    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const controlOffset = Math.min(distance * 0.5, 100)

    let cp1x, cp1y, cp2x, cp2y
    if (Math.abs(dx) > Math.abs(dy)) {
      cp1x = source.x + controlOffset
      cp1y = source.y
      cp2x = target.x - controlOffset
      cp2y = target.y
    } else {
      cp1x = source.x
      cp1y = source.y + controlOffset
      cp2x = target.x
      cp2y = target.y - controlOffset
    }

    midX = Math.pow(1 - t, 3) * source.x + 3 * Math.pow(1 - t, 2) * t * cp1x + 3 * (1 - t) * t * t * cp2x + Math.pow(t, 3) * target.x
    midY = Math.pow(1 - t, 3) * source.y + 3 * Math.pow(1 - t, 2) * t * cp1y + 3 * (1 - t) * t * t * cp2y + Math.pow(t, 3) * target.y
  } else {
    midX = (source.x + target.x) / 2
    midY = (source.y + target.y) / 2
  }

  const labelPos = props.edge.labelPosition || 'above'
  switch (labelPos) {
    case 'below':
      return { x: midX, y: midY + 12 }
    case 'center':
      return { x: midX, y: midY }
    case 'above':
    default:
      return { x: midX, y: midY - 12 }
  }
})

const labelBackground = computed(() => {
  const pos = textPosition.value
  const text = displayLabel.value
  const fontSize = parseInt(labelFontSize.value)
  const width = Math.max(40, text.length * fontSize * 0.6 + 16)
  const height = fontSize + 10
  return {
    x: pos.x - width / 2,
    y: pos.y - height / 2,
    width,
    height
  }
})
</script>

<style scoped>
.edge :deep(path) {
  transition: stroke 0.2s;
}

.edge-label {
  pointer-events: none;
}
</style>
