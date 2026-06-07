<template>
  <g 
    class="textbox"
    :class="{ selected }"
    :transform="`translate(${textBox.position.x}, ${textBox.position.y})`"
    @click.stop="$emit('select', $event)"
    @mousedown.stop="$emit('mousedown', $event)"
    @dblclick.stop="$emit('dblclick')"
  >
    <rect
      :width="150"
      :height="30"
      :fill="textBox.style.backgroundColor"
      :stroke="selected ? '#2196f3' : 'transparent'"
      :stroke-width="selected ? 2 : 0"
      stroke-dasharray="4,2"
    />
    <text
      x="5"
      y="20"
      :fill="textBox.style.textColor"
      :font-size="textBox.style.fontSize"
      :font-family="textBox.style.fontFamily"
      :font-weight="textBox.style.fontWeight"
      pointer-events="none"
    >
      {{ textBox.text }}
    </text>
  </g>
</template>

<script setup lang="ts">
import type { TextBox } from '@/types'

defineProps<{
  textBox: TextBox
  selected: boolean
}>()

defineEmits<{
  (e: 'select', event: MouseEvent): void
  (e: 'mousedown', event: MouseEvent): void
  (e: 'dblclick'): void
}>()
</script>

<style scoped>
.textbox {
  cursor: move;
}
</style>
