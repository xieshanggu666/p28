<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span>📦 元素库</span>
    </div>
    
    <div class="sidebar-section">
      <h4>思维导图</h4>
      <div 
        class="element-item" 
        draggable="true"
        @dragstart="handleDragStart($event, 'mindmap-node')"
      >
        <div class="element-preview mindmap-node">
          <span>主题</span>
        </div>
        <span class="element-label">主题节点</span>
      </div>
      <div 
        class="element-item" 
        draggable="true"
        @dragstart="handleDragStart($event, 'mindmap-child')"
      >
        <div class="element-preview mindmap-child">
          <span>子主题</span>
        </div>
        <span class="element-label">子节点</span>
      </div>
    </div>
    
    <div class="sidebar-section">
      <h4>流程图</h4>
      <div 
        class="element-item" 
        draggable="true"
        @dragstart="handleDragStart($event, 'flow-start')"
      >
        <div class="element-preview flow-start">
          <span>开始</span>
        </div>
        <span class="element-label">开始</span>
      </div>
      <div 
        class="element-item" 
        draggable="true"
        @dragstart="handleDragStart($event, 'flow-process')"
      >
        <div class="element-preview flow-process">
          <span>处理</span>
        </div>
        <span class="element-label">处理</span>
      </div>
      <div 
        class="element-item" 
        draggable="true"
        @dragstart="handleDragStart($event, 'flow-decision')"
      >
        <div class="element-preview flow-decision">
          <span>判断</span>
        </div>
        <span class="element-label">判断</span>
      </div>
      <div 
        class="element-item" 
        draggable="true"
        @dragstart="handleDragStart($event, 'flow-input')"
      >
        <div class="element-preview flow-input">
          <span>输入</span>
        </div>
        <span class="element-label">输入/输出</span>
      </div>
      <div 
        class="element-item" 
        draggable="true"
        @dragstart="handleDragStart($event, 'flow-end')"
      >
        <div class="element-preview flow-end">
          <span>结束</span>
        </div>
        <span class="element-label">结束</span>
      </div>
    </div>
    
    <div class="sidebar-section">
      <h4>其他</h4>
      <div 
        class="element-item" 
        draggable="true"
        @dragstart="handleDragStart($event, 'textbox')"
      >
        <div class="element-preview textbox">
          <span>T</span>
        </div>
        <span class="element-label">文本框</span>
      </div>
    </div>
    
    <div class="sidebar-tips">
      <p>💡 提示：</p>
      <ul>
        <li>拖拽元素到画布添加</li>
        <li>双击节点编辑文本</li>
        <li>按 Delete 删除选中</li>
        <li>Ctrl+Z 撤销操作</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'drag-start', type: string): void
}>()

function handleDragStart(event: DragEvent, type: string) {
  if (event.dataTransfer) {
    event.dataTransfer.setData('elementType', type)
    event.dataTransfer.effectAllowed = 'copy'
  }
  emit('drag-start', type)
}
</script>

<style scoped>
.sidebar {
  width: 200px;
  background: #ffffff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  font-weight: 600;
  font-size: 15px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.sidebar-section {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.sidebar-section h4 {
  font-size: 12px;
  color: #888;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.element-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.element-item:hover {
  background: #f5f5f5;
}

.element-item:active {
  cursor: grabbing;
}

.element-preview {
  width: 60px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #555;
  flex-shrink: 0;
}

.mindmap-node {
  background: #e3f2fd;
  border: 2px solid #2196f3;
  border-radius: 8px;
  font-weight: bold;
}

.mindmap-child {
  background: #e8f5e9;
  border: 2px solid #4caf50;
  border-radius: 6px;
}

.flow-start,
.flow-end {
  background: #fff3e0;
  border: 2px solid #ff9800;
  border-radius: 18px;
}

.flow-process {
  background: #e3f2fd;
  border: 2px solid #2196f3;
  border-radius: 4px;
}

.flow-decision {
  width: 36px;
  height: 36px;
  background: #fff8e1;
  border: 2px solid #ffc107;
  transform: rotate(45deg);
  border-radius: 4px;
}

.flow-decision span {
  transform: rotate(-45deg);
}

.flow-input {
  background: #f3e5f5;
  border: 2px solid #9c27b0;
  border-radius: 4px;
  clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);
}

.textbox {
  background: transparent;
  border: 1px dashed #999;
  border-radius: 4px;
  font-weight: bold;
  font-size: 14px;
}

.element-label {
  font-size: 13px;
  color: #555;
}

.sidebar-tips {
  padding: 16px;
  margin-top: auto;
  background: #fafafa;
  font-size: 12px;
  color: #888;
}

.sidebar-tips p {
  margin-bottom: 8px;
  font-weight: 500;
}

.sidebar-tips ul {
  list-style: none;
  padding: 0;
}

.sidebar-tips li {
  margin-bottom: 4px;
  padding-left: 8px;
  position: relative;
}

.sidebar-tips li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #ccc;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    max-height: 180px;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
  }
  
  .sidebar-header {
    display: none;
  }
  
  .sidebar-section {
    padding: 8px 12px;
    border-bottom: none;
    border-right: 1px solid #f0f0f0;
    flex-shrink: 0;
  }
  
  .sidebar-section h4 {
    margin-bottom: 8px;
  }
  
  .element-item {
    flex-direction: column;
    gap: 4px;
    padding: 6px;
    margin-bottom: 4px;
    min-width: 70px;
  }
  
  .element-label {
    font-size: 11px;
    text-align: center;
  }
  
  .sidebar-tips {
    display: none;
  }
}
</style>
