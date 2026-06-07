import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type {
  Diagram,
  DiagramElement,
  DiagramNode,
  Edge,
  TextBox,
  Selection,
  CanvasState,
  MindMapNode,
  FlowchartNode,
  NodeStyle,
  EdgeStyle,
  DiagramType,
  Position
} from '@/types'
import {
  defaultNodeStyle,
  defaultEdgeStyle,
  defaultTextBoxStyle,
  defaultCanvasState
} from '@/types'

const STORAGE_KEY = 'mindmap-flowchart-data'
const AUTO_SAVE_INTERVAL = 5000
const MAX_HISTORY = 50

export const useDiagramStore = defineStore('diagram', () => {
  const currentDiagram = ref<Diagram | null>(null)
  const selection = ref<Selection>({ elementIds: [], type: null })
  const canvasState = ref<CanvasState>({ ...defaultCanvasState })
  const history = ref<{ past: Diagram[]; future: Diagram[] }>({ past: [], future: [] })
  const isDragging = ref(false)
  const dragStartPosition = ref<Position | null>(null)
  const connectingEdge = ref<{ sourceId: string; tempPoints: Position[] } | null>(null)

  const nodes = computed(() => {
    if (!currentDiagram.value) return []
    return currentDiagram.value.elements.filter((el): el is DiagramNode => el.type === 'node')
  })

  const edges = computed(() => {
    if (!currentDiagram.value) return []
    return currentDiagram.value.elements.filter((el): el is Edge => el.type === 'edge')
  })

  const textBoxes = computed(() => {
    if (!currentDiagram.value) return []
    return currentDiagram.value.elements.filter((el): el is TextBox => el.type === 'textbox')
  })

  const selectedElements = computed(() => {
    if (!currentDiagram.value || selection.value.elementIds.length === 0) return []
    return currentDiagram.value.elements.filter(el => selection.value.elementIds.includes(el.id))
  })

  const canUndo = computed(() => history.value.past.length > 0)
  const canRedo = computed(() => history.value.future.length > 0)

  function saveToHistory() {
    if (!currentDiagram.value) return
    const snapshot = JSON.parse(JSON.stringify(currentDiagram.value))
    history.value.past.push(snapshot)
    if (history.value.past.length > MAX_HISTORY) {
      history.value.past.shift()
    }
    history.value.future = []
  }

  function undo() {
    if (history.value.past.length === 0 || !currentDiagram.value) return
    const current = JSON.parse(JSON.stringify(currentDiagram.value))
    history.value.future.unshift(current)
    const previous = history.value.past.pop()!
    currentDiagram.value = previous
    clearSelection()
  }

  function redo() {
    if (history.value.future.length === 0 || !currentDiagram.value) return
    const current = JSON.parse(JSON.stringify(currentDiagram.value))
    history.value.past.push(current)
    const next = history.value.future.shift()!
    currentDiagram.value = next
    clearSelection()
  }

  function createNewDiagram(type: DiagramType = 'mindmap', name: string = '未命名图表'): Diagram {
    const now = Date.now()
    return {
      id: uuidv4(),
      name,
      type,
      elements: [],
      createdAt: now,
      updatedAt: now,
      version: '1.0.0'
    }
  }

  function loadDiagram(diagram: Diagram) {
    saveToHistory()
    currentDiagram.value = JSON.parse(JSON.stringify(diagram))
    clearSelection()
  }

  function createMindMapNode(
    text: string,
    position: Position,
    parentId: string | null = null,
    style?: Partial<NodeStyle>
  ): MindMapNode {
    const nodes = currentDiagram.value?.elements.filter(el => el.type === 'node') as DiagramNode[] || []
    let level = 0
    if (parentId) {
      const parent = nodes.find(n => n.id === parentId) as MindMapNode | undefined
      level = parent ? parent.level + 1 : 0
    }

    const size = calculateTextSize(text, { ...defaultNodeStyle, ...style })
    
    return {
      id: uuidv4(),
      type: 'node',
      text,
      position,
      size,
      style: { ...defaultNodeStyle, ...style },
      parentId,
      children: [],
      level,
      collapsed: false
    }
  }

  function createFlowchartNode(
    text: string,
    position: Position,
    nodeType: FlowchartNode['nodeType'] = 'process',
    style?: Partial<NodeStyle>
  ): FlowchartNode {
    const size = calculateTextSize(text, { ...defaultNodeStyle, ...style })
    
    let shape = style?.shape || 'rounded-rectangle'
    if (nodeType === 'decision') shape = 'diamond'
    else if (nodeType === 'start' || nodeType === 'end') shape = 'ellipse'
    
    return {
      id: uuidv4(),
      type: 'node',
      text,
      position,
      size,
      style: { ...defaultNodeStyle, shape, ...style },
      nodeType
    }
  }

  function calculateTextSize(text: string, style: NodeStyle): { width: number; height: number } {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return { width: 150, height: 50 }
    
    ctx.font = `${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`
    const metrics = ctx.measureText(text)
    const width = Math.max(80, metrics.width + style.padding * 2)
    const height = Math.max(40, style.fontSize * 1.5 + style.padding * 2)
    
    return { width, height }
  }

  function addNode(node: DiagramNode) {
    if (!currentDiagram.value) return
    saveToHistory()
    currentDiagram.value.elements.push(node)
    
    if ('parentId' in node && node.parentId) {
      const parent = currentDiagram.value.elements.find(
        el => el.id === node.parentId
      ) as MindMapNode | undefined
      if (parent && 'children' in parent) {
        parent.children.push(node.id)
      }
    }
    
    currentDiagram.value.updatedAt = Date.now()
    autoSave()
  }

  function createEdge(
    sourceId: string,
    targetId: string,
    style?: Partial<EdgeStyle>
  ): Edge | null {
    if (!currentDiagram.value) return null
    
    const sourceNode = nodes.value.find(n => n.id === sourceId)
    const targetNode = nodes.value.find(n => n.id === targetId)
    
    if (!sourceNode || !targetNode) return null
    
    const points = calculateEdgePoints(sourceNode, targetNode)
    
    return {
      id: uuidv4(),
      type: 'edge',
      sourceId,
      targetId,
      points,
      style: { ...defaultEdgeStyle, ...style }
    }
  }

  function calculateEdgePoints(source: DiagramNode, target: DiagramNode): Position[] {
    const sourceCenter = {
      x: source.position.x + source.size.width / 2,
      y: source.position.y + source.size.height / 2
    }
    const targetCenter = {
      x: target.position.x + target.size.width / 2,
      y: target.position.y + target.size.height / 2
    }
    
    const dx = targetCenter.x - sourceCenter.x
    const dy = targetCenter.y - sourceCenter.y
    
    const sourcePoint = getNodeBorderPoint(source, dx, dy)
    const targetPoint = getNodeBorderPoint(target, -dx, -dy)
    
    return [sourcePoint, targetPoint]
  }

  function getNodeBorderPoint(node: DiagramNode, dx: number, dy: number): Position {
    const centerX = node.position.x + node.size.width / 2
    const centerY = node.position.y + node.size.height / 2
    const halfW = node.size.width / 2
    const halfH = node.size.height / 2
    
    if (Math.abs(dx) * halfH > Math.abs(dy) * halfW) {
      return {
        x: centerX + (dx > 0 ? halfW : -halfW),
        y: centerY + (dy / dx) * (dx > 0 ? halfW : -halfW)
      }
    } else {
      return {
        x: centerX + (dx / dy) * (dy > 0 ? halfH : -halfH),
        y: centerY + (dy > 0 ? halfH : -halfH)
      }
    }
  }

  function addEdge(edge: Edge) {
    if (!currentDiagram.value) return
    saveToHistory()
    currentDiagram.value.elements.push(edge)
    currentDiagram.value.updatedAt = Date.now()
    autoSave()
  }

  function createTextBox(text: string, position: Position): TextBox {
    return {
      id: uuidv4(),
      type: 'textbox',
      text,
      position,
      style: { ...defaultTextBoxStyle }
    }
  }

  function addTextBox(textBox: TextBox) {
    if (!currentDiagram.value) return
    saveToHistory()
    currentDiagram.value.elements.push(textBox)
    currentDiagram.value.updatedAt = Date.now()
    autoSave()
  }

  function updateElement(id: string, updates: Partial<DiagramElement>) {
    if (!currentDiagram.value) return
    saveToHistory()
    const element = currentDiagram.value.elements.find(el => el.id === id)
    if (element) {
      Object.assign(element, updates)
      element.style = { ...element.style, ...updates.style }
      
      if (element.type === 'node' && element.text) {
        element.size = calculateTextSize(element.text, element.style as NodeStyle)
      }
      
      updateConnectedEdges(id)
    }
    currentDiagram.value.updatedAt = Date.now()
    autoSave()
  }

  function updateConnectedEdges(nodeId: string) {
    if (!currentDiagram.value) return
    const node = nodes.value.find(n => n.id === nodeId)
    if (!node) return
    
    edges.value.forEach(edge => {
      if (edge.sourceId === nodeId || edge.targetId === nodeId) {
        const source = nodes.value.find(n => n.id === edge.sourceId)
        const target = nodes.value.find(n => n.id === edge.targetId)
        if (source && target) {
          edge.points = calculateEdgePoints(source, target)
        }
      }
    })
  }

  function deleteElements(ids: string[]) {
    if (!currentDiagram.value) return
    saveToHistory()
    
    ids.forEach(id => {
      const element = currentDiagram.value!.elements.find(el => el.id === id)
      
      if (element?.type === 'node' && 'parentId' in element && element.parentId) {
        const parent = currentDiagram.value!.elements.find(
          el => el.id === element.parentId
        ) as MindMapNode | undefined
        if (parent && 'children' in parent) {
          parent.children = parent.children.filter(cid => cid !== id)
        }
      }
      
      if (element?.type === 'node' && 'children' in element) {
        element.children.forEach(childId => {
          const child = currentDiagram.value!.elements.find(el => el.id === childId) as MindMapNode | undefined
          if (child) child.parentId = null
        })
      }
    })
    
    currentDiagram.value.elements = currentDiagram.value.elements.filter(
      el => !ids.includes(el.id) && !(el.type === 'edge' && (ids.includes(el.sourceId) || ids.includes(el.targetId)))
    )
    
    clearSelection()
    currentDiagram.value.updatedAt = Date.now()
    autoSave()
  }

  function selectElement(id: string, type: 'node' | 'edge' | 'textbox', multiSelect: boolean = false) {
    if (multiSelect) {
      if (selection.value.elementIds.includes(id)) {
        selection.value.elementIds = selection.value.elementIds.filter(eid => eid !== id)
        if (selection.value.elementIds.length === 0) {
          selection.value.type = null
        }
      } else {
        selection.value.elementIds.push(id)
        selection.value.type = type
      }
    } else {
      selection.value = { elementIds: [id], type }
    }
  }

  function clearSelection() {
    selection.value = { elementIds: [], type: null }
  }

  function setZoom(zoom: number) {
    canvasState.value.zoom = Math.max(0.1, Math.min(3, zoom))
  }

  function setPan(pan: Position) {
    canvasState.value.pan = pan
  }

  function toggleGrid() {
    canvasState.value.gridVisible = !canvasState.value.gridVisible
  }

  function exportToJSON(): string {
    if (!currentDiagram.value) return ''
    return JSON.stringify(currentDiagram.value, null, 2)
  }

  function importFromJSON(json: string) {
    try {
      const diagram = JSON.parse(json) as Diagram
      if (validateDiagram(diagram)) {
        loadDiagram(diagram)
        return true
      }
    } catch (e) {
      console.error('Failed to import JSON:', e)
    }
    return false
  }

  function validateDiagram(diagram: unknown): diagram is Diagram {
    if (typeof diagram !== 'object' || diagram === null) return false
    const d = diagram as Record<string, unknown>
    return (
      typeof d.id === 'string' &&
      typeof d.name === 'string' &&
      (d.type === 'mindmap' || d.type === 'flowchart') &&
      Array.isArray(d.elements)
    )
  }

  function autoSave() {
    if (!currentDiagram.value) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentDiagram.value))
    } catch (e) {
      console.error('Failed to auto-save:', e)
    }
  }

  function loadFromStorage(): Diagram | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const diagram = JSON.parse(data) as Diagram
        if (validateDiagram(diagram)) {
          return diagram
        }
      }
    } catch (e) {
      console.error('Failed to load from storage:', e)
    }
    return null
  }

  function init() {
    const saved = loadFromStorage()
    if (saved) {
      currentDiagram.value = saved
    } else {
      const newDiagram = createNewDiagram('mindmap', '我的思维导图')
      const rootNode = createMindMapNode('中心主题', { x: 400, y: 300 })
      rootNode.style.fillColor = '#e3f2fd'
      rootNode.style.fontWeight = 'bold'
      rootNode.style.fontSize = 18
      newDiagram.elements.push(rootNode)
      currentDiagram.value = newDiagram
      autoSave()
    }
  }

  return {
    currentDiagram,
    selection,
    canvasState,
    history,
    isDragging,
    dragStartPosition,
    connectingEdge,
    nodes,
    edges,
    textBoxes,
    selectedElements,
    canUndo,
    canRedo,
    createNewDiagram,
    loadDiagram,
    createMindMapNode,
    createFlowchartNode,
    addNode,
    createEdge,
    addEdge,
    createTextBox,
    addTextBox,
    updateElement,
    deleteElements,
    selectElement,
    clearSelection,
    setZoom,
    setPan,
    toggleGrid,
    undo,
    redo,
    exportToJSON,
    importFromJSON,
    init
  }
})
