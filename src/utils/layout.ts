import type { DiagramNode, FlowchartNode, MindMapNode, Position } from '@/types'
import { layoutConfig } from '@/types'

interface LayoutNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  children: LayoutNode[]
  level: number
  subtreeWidth: number
  prelim: number
  mod: number
  shift: number
  change: number
  leftSibling: LayoutNode | null
  rightSibling: LayoutNode | null
  parent: LayoutNode | null
  thread: LayoutNode | null
  ancestor: LayoutNode | null
  number: number
}

function buildLayoutTree(nodes: DiagramNode[], rootId: string): LayoutNode | null {
  const nodeMap = new Map<string, DiagramNode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  const rootNode = nodeMap.get(rootId)
  if (!rootNode) return null

  function buildNode(nodeId: string, parent: LayoutNode | null, number: number): LayoutNode {
    const node = nodeMap.get(nodeId)!
    const children = 'children' in node ? node.children : []
    const layoutNode: LayoutNode = {
      id: nodeId,
      x: 0,
      y: 0,
      width: node.size.width,
      height: node.size.height,
      children: [],
      level: 'level' in node ? node.level : 0,
      subtreeWidth: 0,
      prelim: 0,
      mod: 0,
      shift: 0,
      change: 0,
      leftSibling: null,
      rightSibling: null,
      parent,
      thread: null,
      ancestor: null,
      number
    }
    layoutNode.children = children.map((childId, idx) => buildNode(childId, layoutNode, idx + 1))
    return layoutNode
  }

  return buildNode(rootId, null, 1)
}

function firstWalk(node: LayoutNode, horizontalSpacing: number): void {
  node.ancestor = node
  node.prelim = 0
  node.mod = 0
  node.shift = 0
  node.change = 0

  if (node.children.length === 0) {
    const leftSibling = node.leftSibling
    if (leftSibling) {
      node.prelim = leftSibling.prelim + leftSibling.width + horizontalSpacing
    } else {
      node.prelim = 0
    }
  } else {
    let defaultAncestor = node.children[0]
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      if (i > 0) {
        child.leftSibling = node.children[i - 1]
        node.children[i - 1].rightSibling = child
      }
      firstWalk(child, horizontalSpacing)
      defaultAncestor = apportion(child, defaultAncestor, horizontalSpacing)
    }
    executeShifts(node)
    const midpoint = (node.children[0].prelim + node.children[node.children.length - 1].prelim + node.children[node.children.length - 1].width) / 2 - node.width / 2
    if (node.leftSibling) {
      node.prelim = node.leftSibling.prelim + node.leftSibling.width + horizontalSpacing
      node.mod = node.prelim - midpoint
    } else {
      node.prelim = midpoint
    }
  }
}

function apportion(node: LayoutNode, defaultAncestor: LayoutNode, horizontalSpacing: number): LayoutNode {
  const leftSibling = node.leftSibling
  if (leftSibling) {
    let vInnerRight = node
    let vOuterRight = node
    let vInnerLeft = leftSibling
    let vOuterLeft = node.parent ? node.parent.children[0] : null

    let sInnerRight = vInnerRight.mod
    let sOuterRight = vOuterRight.mod
    let sInnerLeft = vInnerLeft.mod
    let sOuterLeft = vOuterLeft ? vOuterLeft.mod : 0

    while (nextRight(vInnerLeft) && nextLeft(vInnerRight)) {
      vInnerLeft = nextRight(vInnerLeft)!
      vInnerRight = nextLeft(vInnerRight)!
      if (vOuterLeft) vOuterLeft = nextLeft(vOuterLeft)!
      if (vOuterRight) vOuterRight = nextRight(vOuterRight)!
      if (vOuterRight) vOuterRight.ancestor = node

      const shift = (vInnerLeft.prelim + sInnerLeft) - (vInnerRight.prelim + sInnerRight) + vInnerLeft.width + horizontalSpacing
      if (shift > 0) {
        const ancestor = (vInnerLeft.ancestor && vInnerLeft.ancestor.parent === node.parent) ? vInnerLeft.ancestor : defaultAncestor
        moveSubtree(ancestor!, node, shift)
        sInnerRight += shift
        sOuterRight += shift
      }

      sInnerLeft += vInnerLeft.mod
      sInnerRight += vInnerRight.mod
      if (vOuterLeft) sOuterLeft += vOuterLeft.mod
      if (vOuterRight) sOuterRight += vOuterRight.mod
    }

    if (nextRight(vInnerLeft) && !nextRight(vOuterRight)) {
      if (vOuterRight) {
        vOuterRight.thread = nextRight(vInnerLeft)
        vOuterRight.mod += sInnerLeft - sOuterRight
      }
    }

    if (nextLeft(vInnerRight) && !nextLeft(vOuterLeft)) {
      if (vOuterLeft) {
        vOuterLeft.thread = nextLeft(vInnerRight)
        vOuterLeft.mod += sInnerRight - sOuterLeft
      }
      defaultAncestor = node
    }
  }
  return defaultAncestor
}

function nextLeft(node: LayoutNode): LayoutNode | null {
  return node.children.length > 0 ? node.children[0] : node.thread
}

function nextRight(node: LayoutNode): LayoutNode | null {
  return node.children.length > 0 ? node.children[node.children.length - 1] : node.thread
}

function moveSubtree(wM: LayoutNode, wP: LayoutNode, shift: number): void {
  const subtrees = wP.number - wM.number
  wP.change -= shift / subtrees
  wP.shift += shift
  wM.change += shift / subtrees
  wP.prelim += shift
  wP.mod += shift
}

function executeShifts(node: LayoutNode): void {
  let shift = 0
  let change = 0
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]
    child.prelim += shift
    child.mod += shift
    change += child.change
    shift += child.shift + change
  }
}

function secondWalk(node: LayoutNode, m: number, level: number, verticalSpacing: number): void {
  node.x = node.prelim + m
  node.y = level * (node.height + verticalSpacing)
  for (const child of node.children) {
    secondWalk(child, m + node.mod, level + 1, verticalSpacing)
  }
}

function calculateSubtreeWidths(node: LayoutNode, horizontalSpacing: number): void {
  if (node.children.length === 0) {
    node.subtreeWidth = node.width
  } else {
    let totalWidth = 0
    for (let i = 0; i < node.children.length; i++) {
      calculateSubtreeWidths(node.children[i], horizontalSpacing)
      totalWidth += node.children[i].subtreeWidth
      if (i > 0) totalWidth += horizontalSpacing
    }
    node.subtreeWidth = Math.max(node.width, totalWidth)
  }
}

function collectPositions(layoutNode: LayoutNode, positions: Map<string, Position>): void {
  positions.set(layoutNode.id, { x: layoutNode.x, y: layoutNode.y })
  for (const child of layoutNode.children) {
    collectPositions(child, positions)
  }
}

export function hierarchicalLayout(
  nodes: DiagramNode[],
  rootId: string,
  options?: {
    horizontalSpacing?: number
    verticalSpacing?: number
    centerX?: number
    centerY?: number
  }
): Map<string, Position> {
  const {
    horizontalSpacing = layoutConfig.horizontalSpacing,
    verticalSpacing = layoutConfig.verticalSpacing,
    centerX = 400,
    centerY = 100
  } = options || {}

  const layoutTree = buildLayoutTree(nodes, rootId)
  if (!layoutTree) return new Map()

  calculateSubtreeWidths(layoutTree, horizontalSpacing)
  firstWalk(layoutTree, horizontalSpacing)
  secondWalk(layoutTree, 0, 0, verticalSpacing)

  const positions = new Map<string, Position>()
  collectPositions(layoutTree, positions)

  const rootPos = positions.get(rootId)
  if (rootPos) {
    const offsetX = centerX - rootPos.x
    const offsetY = centerY - rootPos.y
    positions.forEach((pos, id) => {
      positions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY })
    })
  }

  return positions
}

export function simpleTreeLayout(
  nodes: DiagramNode[],
  rootId: string,
  options?: {
    horizontalSpacing?: number
    verticalSpacing?: number
    startX?: number
    startY?: number
  }
): Map<string, Position> {
  const {
    horizontalSpacing = layoutConfig.horizontalSpacing,
    verticalSpacing = layoutConfig.verticalSpacing,
    startX = 100,
    startY = 100
  } = options || {}

  const positions = new Map<string, Position>()
  const nodeMap = new Map<string, DiagramNode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  const levelWidths = new Map<number, { count: number; totalWidth: number }>()
  const nodesByLevel = new Map<number, string[]>()

  function processLevel(nodeId: string, level: number): void {
    if (!levelWidths.has(level)) {
      levelWidths.set(level, { count: 0, totalWidth: 0 })
      nodesByLevel.set(level, [])
    }
    const node = nodeMap.get(nodeId)
    if (node) {
      const lw = levelWidths.get(level)!
      lw.count++
      lw.totalWidth += node.size.width
      nodesByLevel.get(level)!.push(nodeId)

      if ('children' in node) {
        node.children.forEach(childId => processLevel(childId, level + 1))
      }
    }
  }

  processLevel(rootId, 0)

  const maxLevel = Math.max(...levelWidths.keys())
  const levelHeights = new Map<number, number>()
  let currentY = startY

  for (let level = 0; level <= maxLevel; level++) {
    const nodeIds = nodesByLevel.get(level) || []
    let maxHeight = 0
    nodeIds.forEach(id => {
      const node = nodeMap.get(id)
      if (node) maxHeight = Math.max(maxHeight, node.size.height)
    })
    levelHeights.set(level, currentY)
    currentY += maxHeight + verticalSpacing
  }

  for (let level = 0; level <= maxLevel; level++) {
    const nodeIds = nodesByLevel.get(level) || []
    const lw = levelWidths.get(level)!
    const totalWidth = lw.totalWidth + (nodeIds.length - 1) * horizontalSpacing
    let currentX = startX + (800 - totalWidth) / 2

    nodeIds.forEach(nodeId => {
      const node = nodeMap.get(nodeId)
      if (node) {
        positions.set(nodeId, { x: currentX, y: levelHeights.get(level)! })
        currentX += node.size.width + horizontalSpacing
      }
    })
  }

  return positions
}

export function getDescendantIds(nodeId: string, nodes: DiagramNode[]): string[] {
  const descendants: string[] = []
  const nodeMap = new Map<string, DiagramNode>()
  nodes.forEach(n => nodeMap.set(n.id, n))

  function collect(id: string): void {
    const node = nodeMap.get(id)
    if (node && 'children' in node) {
      node.children.forEach(childId => {
        descendants.push(childId)
        collect(childId)
      })
    }
  }

  collect(nodeId)
  return descendants
}

export function findRootNodes(nodes: DiagramNode[]): string[] {
  const roots: string[] = []
  nodes.forEach(node => {
    if ('isRoot' in node && node.isRoot) {
      roots.push(node.id)
    } else if ('parentId' in node && !node.parentId) {
      roots.push(node.id)
    }
  })
  return roots
}
