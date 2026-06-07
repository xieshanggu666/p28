<template>
  <div class="style-panel">
    <div class="panel-header">
      <span>🎨 样式设置</span>
    </div>
    
    <div v-if="!hasSelection" class="empty-state">
      <p>选择元素以编辑样式</p>
    </div>
    
    <template v-else-if="selectedType === 'node'">
      <div class="style-section">
        <h4>填充</h4>
        <div class="color-inputs">
          <div class="color-item">
            <label>背景色</label>
            <input 
              type="color" 
              :value="selectedNode?.style.fillColor || '#ffffff'"
              @input="updateStyle('fillColor', $event)"
            />
          </div>
          <div class="color-item">
            <label>边框色</label>
            <input 
              type="color" 
              :value="selectedNode?.style.strokeColor || '#333333'"
              @input="updateStyle('strokeColor', $event)"
            />
          </div>
          <div class="color-item">
            <label>文字色</label>
            <input 
              type="color" 
              :value="selectedNode?.style.textColor || '#333333'"
              @input="updateStyle('textColor', $event)"
            />
          </div>
        </div>
      </div>
      
      <div class="style-section">
        <h4>边框</h4>
        <div class="style-row">
          <label>边框宽度</label>
          <input 
            type="range" 
            min="1" 
            max="8" 
            :value="selectedNode?.style.strokeWidth || 2"
            @input="updateStyle('strokeWidth', $event)"
          />
          <span>{{ selectedNode?.style.strokeWidth || 2 }}px</span>
        </div>
        <div class="style-row">
          <label>圆角</label>
          <input 
            type="range" 
            min="0" 
            max="20" 
            :value="selectedNode?.style.borderRadius || 8"
            @input="updateStyle('borderRadius', $event)"
          />
          <span>{{ selectedNode?.style.borderRadius || 8 }}px</span>
        </div>
      </div>
      
      <div class="style-section">
        <h4>形状</h4>
        <div class="shape-options">
          <button 
            v-for="shape in shapes" 
            :key="shape.value"
            :class="{ active: selectedNode?.style.shape === shape.value }"
            @click="updateStyle('shape', shape.value)"
          >
            {{ shape.label }}
          </button>
        </div>
      </div>
      
      <div class="style-section">
        <h4>文字</h4>
        <div class="style-row">
          <label>字号</label>
          <input 
            type="range" 
            min="10" 
            max="32" 
            :value="selectedNode?.style.fontSize || 14"
            @input="updateStyle('fontSize', $event)"
          />
          <span>{{ selectedNode?.style.fontSize || 14 }}px</span>
        </div>
        <div class="style-row">
          <label>字体</label>
          <select :value="selectedNode?.style.fontFamily" @change="updateStyle('fontFamily', $event)">
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Microsoft YaHei', sans-serif">微软雅黑</option>
            <option value="SimSun, serif">宋体</option>
          </select>
        </div>
        <div class="style-row">
          <label>粗体</label>
          <button 
            :class="{ active: selectedNode?.style.fontWeight === 'bold' }"
            @click="updateStyle('fontWeight', selectedNode?.style.fontWeight === 'bold' ? 'normal' : 'bold')"
          >
            <strong>B</strong>
          </button>
        </div>
      </div>
    </template>
    
    <template v-else-if="selectedType === 'edge'">
      <div class="style-section">
        <h4>线条</h4>
        <div class="color-item">
          <label>颜色</label>
          <input 
            type="color" 
            :value="selectedEdge?.style.strokeColor || '#666666'"
            @input="updateEdgeStyle('strokeColor', $event)"
          />
        </div>
        <div class="style-row">
          <label>宽度</label>
          <input 
            type="range" 
            min="1" 
            max="8" 
            :value="selectedEdge?.style.strokeWidth || 2"
            @input="updateEdgeStyle('strokeWidth', $event)"
          />
          <span>{{ selectedEdge?.style.strokeWidth || 2 }}px</span>
        </div>
      </div>
      
      <div class="style-section">
        <h4>样式</h4>
        <div class="line-styles">
          <button 
            v-for="style in lineStyles" 
            :key="style.value"
            :class="{ active: selectedEdge?.style.lineStyle === style.value }"
            @click="updateEdgeStyle('lineStyle', style.value)"
          >
            {{ style.label }}
          </button>
        </div>
      </div>
      
      <div class="style-section">
        <h4>箭头</h4>
        <div class="style-row">
          <label>起点</label>
          <select :value="selectedEdge?.style.startArrow" @change="updateEdgeStyle('startArrow', $event)">
            <option value="none">无</option>
            <option value="arrow">箭头</option>
            <option value="diamond">菱形</option>
            <option value="circle">圆形</option>
          </select>
        </div>
        <div class="style-row">
          <label>终点</label>
          <select :value="selectedEdge?.style.endArrow" @change="updateEdgeStyle('endArrow', $event)">
            <option value="none">无</option>
            <option value="arrow">箭头</option>
            <option value="diamond">菱形</option>
            <option value="circle">圆形</option>
          </select>
        </div>
      </div>
    </template>
    
    <template v-else-if="selectedType === 'textbox'">
      <div class="style-section">
        <h4>文字</h4>
        <div class="color-item">
          <label>颜色</label>
          <input 
            type="color" 
            :value="selectedTextBox?.style.textColor || '#333333'"
            @input="updateTextBoxStyle('textColor', $event)"
          />
        </div>
        <div class="style-row">
          <label>字号</label>
          <input 
            type="range" 
            min="10" 
            max="32" 
            :value="selectedTextBox?.style.fontSize || 14"
            @input="updateTextBoxStyle('fontSize', $event)"
          />
          <span>{{ selectedTextBox?.style.fontSize || 14 }}px</span>
        </div>
        <div class="style-row">
          <label>粗体</label>
          <button 
            :class="{ active: selectedTextBox?.style.fontWeight === 'bold' }"
            @click="updateTextBoxStyle('fontWeight', selectedTextBox?.style.fontWeight === 'bold' ? 'normal' : 'bold')"
          >
            <strong>B</strong>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDiagramStore } from '@/stores/diagramStore'
import type { DiagramNode, Edge, TextBox, NodeShape, LineStyle, ArrowType } from '@/types'

const diagramStore = useDiagramStore()

const shapes = [
  { value: 'rectangle' as NodeShape, label: '矩形' },
  { value: 'rounded-rectangle' as NodeShape, label: '圆角' },
  { value: 'ellipse' as NodeShape, label: '椭圆' },
  { value: 'diamond' as NodeShape, label: '菱形' },
  { value: 'parallelogram' as NodeShape, label: '平行' }
]

const lineStyles = [
  { value: 'solid' as LineStyle, label: '实线' },
  { value: 'dashed' as LineStyle, label: '虚线' },
  { value: 'dotted' as LineStyle, label: '点线' }
]

const selection = computed(() => diagramStore.selection)
const hasSelection = computed(() => selection.value.elementIds.length > 0)
const selectedType = computed(() => selection.value.type)

const selectedNode = computed((): DiagramNode | null => {
  if (selectedType.value !== 'node' || selection.value.elementIds.length === 0) return null
  return diagramStore.nodes.find(n => n.id === selection.value.elementIds[0]) || null
})

const selectedEdge = computed((): Edge | null => {
  if (selectedType.value !== 'edge' || selection.value.elementIds.length === 0) return null
  return diagramStore.edges.find(e => e.id === selection.value.elementIds[0]) || null
})

const selectedTextBox = computed((): TextBox | null => {
  if (selectedType.value !== 'textbox' || selection.value.elementIds.length === 0) return null
  return diagramStore.textBoxes.find(t => t.id === selection.value.elementIds[0]) || null
})

function updateStyle(key: keyof DiagramNode['style'], value: any) {
  if (!selectedNode.value) return
  const targetValue = value instanceof Event 
    ? (value.target as HTMLInputElement | HTMLSelectElement).value 
    : value
  const numericKeys = ['strokeWidth', 'borderRadius', 'fontSize']
  const finalValue = numericKeys.includes(key) ? Number(targetValue) : targetValue
  diagramStore.updateElement(selectedNode.value.id, {
    style: { [key]: finalValue }
  } as any)
}

function updateEdgeStyle(key: keyof Edge['style'], value: any) {
  if (!selectedEdge.value) return
  const targetValue = value instanceof Event 
    ? (value.target as HTMLInputElement | HTMLSelectElement).value 
    : value
  const numericKeys = ['strokeWidth']
  const finalValue = numericKeys.includes(key) ? Number(targetValue) : targetValue
  diagramStore.updateElement(selectedEdge.value.id, {
    style: { [key]: finalValue }
  } as any)
}

function updateTextBoxStyle(key: keyof TextBox['style'], value: any) {
  if (!selectedTextBox.value) return
  const targetValue = value instanceof Event 
    ? (value.target as HTMLInputElement).value 
    : value
  const numericKeys = ['fontSize']
  const finalValue = numericKeys.includes(key) ? Number(targetValue) : targetValue
  diagramStore.updateElement(selectedTextBox.value.id, {
    style: { [key]: finalValue }
  } as any)
}
</script>

<style scoped>
.style-panel {
  width: 250px;
  background: #ffffff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-header {
  padding: 16px;
  font-weight: 600;
  font-size: 15px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 13px;
}

.style-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.style-section h4 {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.color-inputs {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.color-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-item label {
  font-size: 11px;
  color: #666;
}

.color-item input[type="color"] {
  width: 40px;
  height: 30px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 2px;
}

.style-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.style-row:last-child {
  margin-bottom: 0;
}

.style-row label {
  font-size: 12px;
  color: #666;
  min-width: 50px;
}

.style-row input[type="range"] {
  flex: 1;
  cursor: pointer;
}

.style-row span {
  font-size: 11px;
  color: #888;
  min-width: 35px;
  text-align: right;
}

.style-row select {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

.style-row button {
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.style-row button:hover {
  background: #f5f5f5;
}

.style-row button.active {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

.shape-options,
.line-styles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.shape-options button,
.line-styles button {
  padding: 4px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.shape-options button:hover,
.line-styles button:hover {
  background: #f5f5f5;
}

.shape-options button.active,
.line-styles button.active {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
}

@media (max-width: 768px) {
  .style-panel {
    width: 100%;
    max-height: 200px;
    border-left: none;
    border-top: 1px solid #e0e0e0;
  }
  
  .panel-header {
    padding: 10px 12px;
    font-size: 13px;
  }
  
  .style-section {
    padding: 10px 12px;
  }
}
</style>
