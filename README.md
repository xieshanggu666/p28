# 在线思维导图与流程图生成器

基于 Vue 3 + TypeScript 构建的在线思维导图和流程图编辑工具。

## 功能特性

### 🎨 核心功能
- **双模式支持**：思维导图和流程图两种图表类型
- **丰富的图形元素**：节点、连接线、文本框等多种元素
- **拖拽式操作**：直观的拖拽编辑界面
- **样式自定义**：颜色、线条样式、字体等完全可配置
- **撤销/重做**：完整的历史记录功能
- **多格式导出**：支持 JSON、PNG、SVG 格式导出
- **实时保存**：自动保存到本地存储

### 📱 用户体验
- **响应式设计**：完美适配桌面端和移动端
- **流畅渲染**：优化的 SVG 渲染，支持 100+ 节点
- **快捷键支持**：常用操作的键盘快捷键
- **网格对齐**：精确的网格对齐功能

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000 开始使用。

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

## 使用指南

### 基础操作

#### 添加节点
1. 从左侧元素库拖拽所需元素到画布
2. 或点击画布空白处后使用快捷键（扩展功能）

#### 编辑文本
- 双击节点或文本框进入编辑模式
- 按 Enter 确认修改，按 Esc 取消修改

#### 移动元素
- 选中元素后拖拽即可移动
- 元素会自动吸附到网格

#### 连接节点
1. 选中源节点
2. 点击节点右侧的连接点
3. 拖拽到目标节点释放

#### 删除元素
- 选中元素后按 Delete 或 Backspace 键
- 或使用工具栏的删除功能

### 样式设置

选中元素后，右侧面板会显示样式设置选项：

#### 节点样式
- **填充色**：节点背景颜色
- **边框色**：节点边框颜色
- **文字色**：节点文字颜色
- **边框宽度**：1-8px 可调
- **圆角大小**：0-20px 可调
- **形状**：矩形、圆角矩形、椭圆、菱形、平行四边形
- **字体设置**：字号、字体、粗体

#### 连接线样式
- **线条颜色**：连接线颜色
- **线条宽度**：1-8px 可调
- **线条样式**：实线、虚线、点线
- **箭头设置**：起点和终点箭头类型

### 视图操作

#### 缩放
- 鼠标滚轮缩放
- 工具栏 +/- 按钮
- 快捷键：Ctrl++ / Ctrl+-

#### 平移
- 按住画布空白处拖拽
- 或使用触摸板双指滑动

#### 重置视图
- 点击工具栏"重置"按钮恢复默认视图

### 文件操作

#### 导出
- **JSON**：导出完整的图表数据，可重新导入编辑
- **SVG**：矢量图形格式，可无损缩放
- **PNG**：位图格式，适合分享

#### 导入
- 点击工具栏"导入"按钮
- 选择之前导出的 JSON 文件

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl + Z | 撤销 |
| Ctrl + Y | 重做 |
| Ctrl + + | 放大 |
| Ctrl + - | 缩小 |
| Delete / Backspace | 删除选中元素 |
| 双击节点 | 编辑文本 |
| 拖拽画布 | 平移视图 |
| 滚轮 | 缩放视图 |

## 项目架构

### 目录结构
```
src/
├── components/          # Vue 组件
│   ├── Canvas.vue       # 主画布组件
│   ├── Toolbar.vue      # 工具栏组件
│   ├── Sidebar.vue      # 左侧元素库
│   ├── StylePanel.vue   # 右侧样式面板
│   ├── NodeComponent.vue    # 节点渲染组件
│   ├── EdgeComponent.vue    # 连接线组件
│   └── TextBoxComponent.vue # 文本框组件
├── stores/              # Pinia 状态管理
│   └── diagramStore.ts  # 图表状态管理
├── types/               # TypeScript 类型定义
│   └── index.ts         # 核心类型定义
├── utils/               # 工具函数
│   ├── performance.ts   # 性能优化工具
│   └── geometry.ts      # 几何计算工具
├── styles/              # 全局样式
│   └── global.css       # 全局 CSS
├── App.vue              # 根组件
└── main.ts              # 应用入口
```

### 核心数据结构

#### Diagram (图表)
```typescript
interface Diagram {
  id: string
  name: string
  type: 'mindmap' | 'flowchart'
  elements: DiagramElement[]
  createdAt: number
  updatedAt: number
  version: string
}
```

#### DiagramNode (节点)
```typescript
interface DiagramNode {
  id: string
  type: 'node'
  text: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  style: NodeStyle
  // 思维导图特有
  parentId?: string | null
  children?: string[]
  level?: number
  collapsed?: boolean
  // 流程图特有
  nodeType?: 'process' | 'decision' | 'start' | 'end' | 'input' | 'output'
}
```

#### Edge (连接线)
```typescript
interface Edge {
  id: string
  type: 'edge'
  sourceId: string
  targetId: string
  points: Position[]
  style: EdgeStyle
  text?: string
}
```

## API 文档

### useDiagramStore

Pinia 状态管理 store，提供所有图表操作方法。

#### 状态
- `currentDiagram: Diagram | null` - 当前图表
- `selection: Selection` - 当前选中元素
- `canvasState: CanvasState` - 画布状态（缩放、平移等）
- `nodes: DiagramNode[]` - 所有节点（计算属性）
- `edges: Edge[]` - 所有连接线（计算属性）
- `canUndo: boolean` - 是否可撤销
- `canRedo: boolean` - 是否可重做

#### 方法

##### 图表管理
- `init(): void` - 初始化，从本地存储加载
- `createNewDiagram(type?, name?): Diagram` - 创建新图表
- `loadDiagram(diagram): void` - 加载图表
- `exportToJSON(): string` - 导出为 JSON 字符串
- `importFromJSON(json): boolean` - 从 JSON 导入

##### 节点操作
- `createMindMapNode(text, position, parentId?, style?): MindMapNode`
- `createFlowchartNode(text, position, nodeType?, style?): FlowchartNode`
- `addNode(node): void`
- `updateElement(id, updates): void`
- `deleteElements(ids): void`

##### 连接线操作
- `createEdge(sourceId, targetId, style?): Edge | null`
- `addEdge(edge): void`

##### 文本框操作
- `createTextBox(text, position): TextBox`
- `addTextBox(textBox): void`

##### 选择操作
- `selectElement(id, type, multiSelect?): void`
- `clearSelection(): void`

##### 视图操作
- `setZoom(zoom): void`
- `setPan(pan): void`
- `toggleGrid(): void`

##### 历史记录
- `undo(): void`
- `redo(): void`

## 性能优化

### 已实现的优化
1. **SVG 分层渲染**：将边、节点、文本框分图层渲染
2. **计算属性缓存**：使用 Pinia 计算属性避免重复计算
3. **事件节流**：鼠标移动等高频事件节流处理
4. **按需渲染**：折叠的节点不渲染子节点
5. **虚拟路径检测**：使用透明宽边提高点击检测区域
6. **本地存储自动保存**：防抖处理避免频繁写入

### 扩展建议
- 对于超大规模图表（500+节点），建议实现：
  - 视口裁剪（只渲染可见区域）
  - Web Worker 离线计算
  - WebGL 渲染加速

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

移动端：
- iOS Safari 14+
- Android Chrome 90+

## 技术栈

- **框架**：Vue 3.4 (Composition API)
- **语言**：TypeScript 5.3
- **构建工具**：Vite 4.5
- **状态管理**：Pinia 2.1
- **图形渲染**：原生 SVG
- **PNG 导出**：html2canvas
- **唯一ID**：uuid

## 许可证

MIT License
