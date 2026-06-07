<template>
  <g class="edge" :class="{ selected }">
    <path
      :d="edgePath"
      fill="none"
      :stroke="selected ? '#2196f3' : edge.style.strokeColor"
      :stroke-width="selected ? 3 : edge.style.strokeWidth"
      :stroke-dasharray="strokeDasharray"
      marker-end="url(#arrow-end)"
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
    <text
      v-if="edge.text"
      :x="textPosition.x"
      :y="textPosition.y"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="#666"
      font-size="12"
      pointer-events="none"
    >
      {{ edge.text }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Edge } from '@/types'

const props = defineProps<{
  edge: Edge
  selected: boolean
}>()

defineEmits<{
  (e: 'select', event: MouseEvent): void
}>()

const edgePath = computed(() => {
  if (props.edge.points.length < 2) return ''
  const points = props.edge.points
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`
  }
  return path
})

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

const textPosition = computed(() => {
  if (props.edge.points.length < 2) return { x: 0, y: 0 }
  const points = props.edge.points
  const midIndex = Math.floor(points.length / 2)
  if (points.length % 2 === 0) {
    const p1 = points[midIndex - 1]
    const p2 = points[midIndex]
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2 - 8
    }
  }
  return {
    x: points[midIndex].x,
    y: points[midIndex].y - 8
  }
})
</script>

<style scoped>
.edge :deep(path) {
  transition: stroke 0.2s;
}
</style>
