export type DiagramType = 'mindmap' | 'flowchart'

export type NodeShape = 'rectangle' | 'rounded-rectangle' | 'ellipse' | 'diamond' | 'parallelogram'

export type LineStyle = 'solid' | 'dashed' | 'dotted'

export type ArrowType = 'none' | 'arrow' | 'diamond' | 'circle'

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface NodeStyle {
  fillColor: string
  strokeColor: string
  strokeWidth: number
  textColor: string
  fontSize: number
  fontFamily: string
  fontWeight: 'normal' | 'bold'
  borderRadius: number
  shape: NodeShape
  padding: number
}

export interface EdgeStyle {
  strokeColor: string
  strokeWidth: number
  lineStyle: LineStyle
  startArrow: ArrowType
  endArrow: ArrowType
}

export interface MindMapNode {
  id: string
  type: 'node'
  text: string
  position: Position
  size: Size
  style: NodeStyle
  parentId: string | null
  children: string[]
  level: number
  collapsed: boolean
}

export interface FlowchartNode {
  id: string
  type: 'node'
  text: string
  position: Position
  size: Size
  style: NodeStyle
  nodeType: 'process' | 'decision' | 'start' | 'end' | 'input' | 'output' | 'topic'
  parentId: string | null
  children: string[]
  level: number
  collapsed: boolean
  isRoot: boolean
}

export type DiagramNode = MindMapNode | FlowchartNode

export interface Edge {
  id: string
  type: 'edge'
  sourceId: string
  targetId: string
  sourcePosition?: Position
  targetPosition?: Position
  points: Position[]
  style: EdgeStyle
  text?: string
  label?: string
  number?: string
  labelPosition?: 'above' | 'below' | 'center'
  pathType?: 'straight' | 'bezier' | 'orthogonal'
}

export interface TextBox {
  id: string
  type: 'textbox'
  text: string
  position: Position
  style: {
    fontSize: number
    fontFamily: string
    fontWeight: 'normal' | 'bold'
    textColor: string
    backgroundColor: string
  }
}

export type DiagramElement = DiagramNode | Edge | TextBox

export interface Diagram {
  id: string
  name: string
  type: DiagramType
  elements: DiagramElement[]
  createdAt: number
  updatedAt: number
  version: string
}

export interface Selection {
  elementIds: string[]
  type: 'node' | 'edge' | 'textbox' | null
}

export interface CanvasState {
  zoom: number
  pan: Position
  gridVisible: boolean
  gridSize: number
}

export interface HistoryState {
  past: Diagram[]
  future: Diagram[]
}

export interface Command {
  execute(): void
  undo(): void
  redo(): void
}

export const defaultNodeStyle: NodeStyle = {
  fillColor: '#ffffff',
  strokeColor: '#333333',
  strokeWidth: 2,
  textColor: '#333333',
  fontSize: 14,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal',
  borderRadius: 8,
  shape: 'rounded-rectangle',
  padding: 12
}

export const defaultEdgeStyle: EdgeStyle = {
  strokeColor: '#666666',
  strokeWidth: 2,
  lineStyle: 'solid',
  startArrow: 'none',
  endArrow: 'arrow'
}

export const defaultTextBoxStyle = {
  fontSize: 14,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal' as const,
  textColor: '#333333',
  backgroundColor: 'transparent'
}

export const defaultCanvasState: CanvasState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
  gridVisible: true,
  gridSize: 20
}

export const layoutConfig = {
  horizontalSpacing: 80,
  verticalSpacing: 60,
  nodeWidth: 140,
  nodeHeight: 50,
  topicNodeWidth: 180,
  topicNodeHeight: 60
}

export const defaultEdgePathType = 'bezier' as const
