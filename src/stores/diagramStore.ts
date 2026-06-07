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
  defaultCanvasState,
  layoutConfig,
  defaultEdgePathType
} from '@/types'
import { hierarchicalLayout, simpleTreeLayout, getDescendantIds, findRootNodes } from '@/utils/layout'

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
    parentId: string | null = null,
    style?: Partial<NodeStyle>
  ): FlowchartNode {
    const nodes = currentDiagram.value?.elements.filter(el => el.type === 'node') as DiagramNode[] || []
    let level = 0
    let isRoot = !parentId
    
    if (parentId) {
      const parent = nodes.find(n => n.id === parentId) as FlowchartNode | MindMapNode | undefined
      if (parent && 'level' in parent) {
        level = parent.level + 1
        isRoot = false
      }
    }

    const baseStyle = { ...defaultNodeStyle, ...style }
    const size = calculateTextSize(text, baseStyle)
    
    let shape = baseStyle.shape || 'rounded-rectangle'
    if (nodeType === 'decision') shape = 'diamond'
    else if (nodeType === 'start' || nodeType === 'end' || nodeType === 'topic') shape = 'ellipse'
    
    return {
      id: uuidv4(),
      type: 'node',
      text,
      position,
      size,
      style: { ...baseStyle, shape },
      nodeType,
      parentId,
      children: [],
      level,
      collapsed: false,
      isRoot
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
    style?: Partial<EdgeStyle>,
    options?: {
      text?: string
      label?: string
      number?: string
      labelPosition?: 'above' | 'below' | 'center'
      pathType?: 'straight' | 'bezier' | 'orthogonal'
    }
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
      style: { ...defaultEdgeStyle, ...style },
      text: options?.text,
      label: options?.label,
      number: options?.number,
      labelPosition: options?.labelPosition || 'above',
      pathType: options?.pathType || defaultEdgePathType
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

  function calculateChildPosition(
    parent: DiagramNode,
    childIndex: number,
    childSize: { width: number; height: number }
  ): Position {
    const parentChildren = 'children' in parent ? (parent as any).children as string[] : []
    const existingChildren = parentChildren
      .map(id => nodes.value.find(n => n.id === id))
      .filter((n): n is DiagramNode => !!n)

    let baseY = parent.position.y + parent.size.height / 2 - childSize.height / 2
    
    if (existingChildren.length > 0) {
      const sortedChildren = [...existingChildren].sort((a, b) => a.position.y - b.position.y)
      const lastChild = sortedChildren[sortedChildren.length - 1]
      baseY = lastChild.position.y + lastChild.size.height + layoutConfig.verticalSpacing
    }

    const baseX = parent.position.x + parent.size.width + layoutConfig.horizontalSpacing

    const position = {
      x: baseX,
      y: baseY
    }

    return clampPositionToViewport(position, childSize)
  }

  function clampPositionToViewport(
    position: Position,
    size: { width: number; height: number }
  ): Position {
    const viewport = getViewportBounds()
    const margin = 50

    let x = position.x
    let y = position.y

    if (x + size.width > viewport.maxX - margin) {
      x = viewport.maxX - size.width - margin
    }
    if (x < viewport.minX + margin) {
      x = viewport.minX + margin
    }
    if (y + size.height > viewport.maxY - margin) {
      y = viewport.maxY - size.height - margin
    }
    if (y < viewport.minY + margin) {
      y = viewport.minY + margin
    }

    return { x, y }
  }

  function getViewportBounds() {
    const canvasState = canvasState
    const zoom = canvasState.value.zoom
    const pan = canvasState.value.pan
    
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    
    const minX = -pan.x / zoom
    const minY = -pan.y / zoom
    const maxX = minX + viewportWidth / zoom
    const maxY = minY + viewportHeight / zoom
    
    return { minX, minY, maxX, maxY }
  }

  function addChildNode(
    parentId: string,
    text: string = '子节点',
    nodeType: FlowchartNode['nodeType'] = 'process',
    style?: Partial<NodeStyle>
  ): FlowchartNode | null {
    if (!currentDiagram.value) return null
    
    const parent = nodes.value.find(n => n.id === parentId)
    if (!parent) return null

    const childIndex = 'children' in parent ? (parent as any).children.length : 0
    const tempStyle = { ...defaultNodeStyle, ...style }
    const childSize = calculateTextSize(text, tempStyle)
    
    const position = calculateChildPosition(parent, childIndex, childSize)

    const childNode = createFlowchartNode(text, position, nodeType, parentId, style)
    
    saveToHistory()
    currentDiagram.value.elements.push(childNode)

    if ('children' in parent) {
      (parent as FlowchartNode).children.push(childNode.id)
    }

    const edge = createEdge(parentId, childNode.id, undefined, {
      pathType: 'bezier'
    })
    if (edge) {
      currentDiagram.value.elements.push(edge)
    }

    currentDiagram.value.updatedAt = Date.now()
    autoSave()
    
    return childNode
  }

  function addTopicNode(
    text: string = '中心主题',
    position: Position = { x: 400, y: 300 },
    style?: Partial<NodeStyle>
  ): FlowchartNode | null {
    if (!currentDiagram.value) return null

    const topicStyle = {
      fillColor: '#e3f2fd',
      fontWeight: 'bold' as const,
      fontSize: 16,
      ...style
    }

    const topicNode = createFlowchartNode(text, position, 'topic', null, topicStyle)
    
    saveToHistory()
    currentDiagram.value.elements.push(topicNode)
    currentDiagram.value.updatedAt = Date.now()
    autoSave()
    
    return topicNode
  }

  function deleteSubtree(nodeId: string) {
    if (!currentDiagram.value) return
    
    const descendantIds = getDescendantIds(nodeId, nodes.value)
    const allIds = [nodeId, ...descendantIds]
    
    deleteElements(allIds)
  }

  function toggleCollapse(nodeId: string) {
    if (!currentDiagram.value) return
    
    const node = nodes.value.find(n => n.id === nodeId)
    if (node && 'collapsed' in node) {
      saveToHistory()
      ;(node as any).collapsed = !(node as any).collapsed
      currentDiagram.value.updatedAt = Date.now()
      autoSave()
    }
  }

  function expandAll(nodeId?: string) {
    if (!currentDiagram.value) return
    saveToHistory()
    
    const targetNodes = nodeId 
      ? [nodeId, ...getDescendantIds(nodeId, nodes.value)]
      : nodes.value.map(n => n.id)
    
    targetNodes.forEach(id => {
      const node = nodes.value.find(n => n.id === id)
      if (node && 'collapsed' in node) {
        (node as any).collapsed = false
      }
    })
    
    currentDiagram.value.updatedAt = Date.now()
    autoSave()
  }

  function collapseAll(nodeId?: string) {
    if (!currentDiagram.value) return
    saveToHistory()
    
    const targetNodes = nodeId 
      ? [nodeId, ...getDescendantIds(nodeId, nodes.value)]
      : nodes.value.map(n => n.id)
    
    targetNodes.forEach(id => {
      const node = nodes.value.find(n => n.id === id)
      if (node && 'collapsed' in node && 'children' in node && (node as any).children.length > 0) {
        (node as any).collapsed = true
      }
    })
    
    currentDiagram.value.updatedAt = Date.now()
    autoSave()
  }

  function autoLayout(rootNodeId?: string) {
    if (!currentDiagram.value || nodes.value.length === 0) return
    
    saveToHistory()
    
    let rootId = rootNodeId
    if (!rootId) {
      const roots = findRootNodes(nodes.value)
      if (roots.length === 0) return
      rootId = roots[0]
    }

    const positions = hierarchicalLayout(nodes.value, rootId, {
      horizontalSpacing: layoutConfig.horizontalSpacing,
      verticalSpacing: layoutConfig.verticalSpacing
    })

    positions.forEach((position, nodeId) => {
      const element = currentDiagram.value!.elements.find(el => el.id === nodeId)
      if (element && element.type === 'node') {
        (element as DiagramNode).position = position
      }
    })

    edges.value.forEach(edge => {
      const source = nodes.value.find(n => n.id === edge.sourceId)
      const target = nodes.value.find(n => n.id === edge.targetId)
      if (source && target) {
        edge.points = calculateEdgePoints(source, target)
      }
    })

    currentDiagram.value.updatedAt = Date.now()
    autoSave()
  }

  function setEdgeLabel(edgeId: string, label: string) {
    updateElement(edgeId, { label } as any)
  }

  function setEdgeNumber(edgeId: string, number: string) {
    updateElement(edgeId, { number } as any)
  }

  function setEdgePathType(edgeId: string, pathType: 'straight' | 'bezier' | 'orthogonal') {
    updateElement(edgeId, { pathType } as any)
  }

  function numberEdgesFromRoot(rootNodeId?: string) {
    if (!currentDiagram.value) return
    saveToHistory()
    
    let rootId = rootNodeId
    if (!rootId) {
      const roots = findRootNodes(nodes.value)
      if (roots.length === 0) return
      rootId = roots[0]
    }

    const edgeNumberMap = new Map<string, string>()
    let edgeCounter = 1

    function traverse(nodeId: string, prefix: string = '') {
      const node = nodes.value.find(n => n.id === nodeId)
      if (!node || !('children' in node)) return

      const children = (node as any).children as string[]
      children.forEach((childId, index) => {
        const edge = edges.value.find(e => e.sourceId === nodeId && e.targetId === childId)
        if (edge) {
          const number = prefix ? `${prefix}.${index + 1}` : `${index + 1}`
          edgeNumberMap.set(edge.id, number)
          edgeCounter++
        }
        traverse(childId, prefix ? `${prefix}.${index + 1}` : `${index + 1}`)
      })
    }

    traverse(rootId)

    edgeNumberMap.forEach((number, edgeId) => {
      const edge = currentDiagram.value!.elements.find(el => el.id === edgeId) as Edge | undefined
      if (edge) {
        edge.number = number
      }
    })

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

  function updateElement(id: string, updates: Partial<DiagramElement>, saveHistory: boolean = true) {
    if (!currentDiagram.value) return
    if (saveHistory) saveToHistory()
    const element = currentDiagram.value.elements.find(el => el.id === id)
    if (element) {
      const oldStyle = { ...(element.style as object) }
      
      const { style, ...otherUpdates } = updates
      Object.assign(element, otherUpdates)
      
      if (style) {
        element.style = { ...oldStyle, ...style } as any
      }
      
      if (element.type === 'node' && element.text && updates.text) {
        element.size = calculateTextSize(element.text, element.style as NodeStyle)
      }
      
      if (updates.position) {
        updateConnectedEdges(id)
      }
    }
    currentDiagram.value.updatedAt = Date.now()
    if (saveHistory) autoSave()
  }

  function updateElementSilent(id: string, updates: Partial<DiagramElement>) {
    updateElement(id, updates, false)
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
    addChildNode,
    addTopicNode,
    deleteSubtree,
    toggleCollapse,
    expandAll,
    collapseAll,
    autoLayout,
    setEdgeLabel,
    setEdgeNumber,
    setEdgePathType,
    numberEdgesFromRoot,
    calculateChildPosition,
    clampPositionToViewport,
    getViewportBounds,
    createTextBox,
    addTextBox,
    updateElement,
    updateElementSilent,
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
