export interface DataLineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  metadata: LineageMetadata;
}

export interface LineageNode {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  properties: NodeProperties;
  metadata: NodeMetadata;
  position?: { x: number; y: number };
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  properties: EdgeProperties;
  metadata: EdgeMetadata;
}

export interface LineageMetadata {
  created: Date;
  updated: Date;
  version: string;
  source: string;
  tags: string[];
}

export type NodeType = 
  | 'dataset' | 'table' | 'column' | 'transformation' 
  | 'pipeline' | 'job' | 'model' | 'report' | 'api';

export type EdgeType = 
  | 'derives_from' | 'transforms_to' | 'depends_on' | 'flows_to' 
  | 'aggregates' | 'joins' | 'filters' | 'enriches';

export interface NodeProperties {
  schema?: ColumnSchema[];
  size?: number;
  rowCount?: number;
  lastUpdated?: Date;
  owner?: string;
  businessGlossary?: string[];
  qualityScore?: number;
  tags?: string[];
  location?: string;
  format?: string;
}

export interface EdgeProperties {
  transformationType?: string;
  columns?: string[];
  conditions?: string[];
  weight?: number;
  confidence?: number;
  lastExecuted?: Date;
  executionCount?: number;
}

export interface NodeMetadata {
  created: Date;
  updated: Date;
  source: string;
  discoveredBy: string;
  verified: boolean;
}

export interface EdgeMetadata {
  created: Date;
  updated: Date;
  source: string;
  discoveredBy: string;
  verified: boolean;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface LineageQuery {
  nodeId: string;
  direction: 'upstream' | 'downstream' | 'both';
  depth?: number;
  includeTypes?: NodeType[];
  excludeTypes?: NodeType[];
  includeColumns?: boolean;
}

export interface LineageAnalysis {
  impactAnalysis: ImpactAnalysisResult;
  rootCauseAnalysis: RootCauseAnalysisResult;
  dataFlowAnalysis: DataFlowAnalysisResult;
  qualityPropagation: QualityPropagationResult;
}

export interface ImpactAnalysisResult {
  affectedNodes: LineageNode[];
  affectedReports: LineageNode[];
  affectedModels: LineageNode[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
}

export interface RootCauseAnalysisResult {
  potentialSources: LineageNode[];
  dataPath: LineageNode[];
  confidence: number;
  recommendations: string[];
}

export interface DataFlowAnalysisResult {
  flowPaths: DataFlowPath[];
  bottlenecks: LineageNode[];
  inefficiencies: DataFlowIssue[];
  optimization: DataFlowOptimization[];
}

export interface QualityPropagationResult {
  qualityPath: QualityMetricNode[];
  degradationPoints: LineageNode[];
  improvementOpportunities: QualityImprovement[];
}

export interface DataFlowPath {
  nodes: LineageNode[];
  edges: LineageEdge[];
  totalLatency: number;
  complexity: number;
}

export interface DataFlowIssue {
  type: 'bottleneck' | 'redundancy' | 'inefficiency';
  nodes: LineageNode[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface DataFlowOptimization {
  type: 'merge' | 'cache' | 'partition' | 'index';
  nodes: LineageNode[];
  description: string;
  estimatedImprovement: string;
}

export interface QualityMetricNode extends LineageNode {
  qualityScore: number;
  qualityTrend: 'improving' | 'stable' | 'degrading';
}

export interface QualityImprovement {
  node: LineageNode;
  currentScore: number;
  potentialScore: number;
  actions: string[];
}

class DataLineageService {
  private static instance: DataLineageService;
  private lineageGraph: DataLineageGraph;

  constructor() {
    this.lineageGraph = {
      nodes: [],
      edges: [],
      metadata: {
        created: new Date(),
        updated: new Date(),
        version: '1.0.0',
        source: 'DataSnap',
        tags: []
      }
    };
  }

  static getInstance(): DataLineageService {
    if (!DataLineageService.instance) {
      DataLineageService.instance = new DataLineageService();
    }
    return DataLineageService.instance;
  }

  // Core lineage operations
  addNode(node: Omit<LineageNode, 'metadata'>): LineageNode {
    const fullNode: LineageNode = {
      ...node,
      metadata: {
        created: new Date(),
        updated: new Date(),
        source: 'manual',
        discoveredBy: 'user',
        verified: false
      }
    };

    this.lineageGraph.nodes.push(fullNode);
    this.updateGraphMetadata();
    return fullNode;
  }

  addEdge(edge: Omit<LineageEdge, 'metadata'>): LineageEdge {
    const fullEdge: LineageEdge = {
      ...edge,
      metadata: {
        created: new Date(),
        updated: new Date(),
        source: 'manual',
        discoveredBy: 'user',
        verified: false
      }
    };

    this.lineageGraph.edges.push(fullEdge);
    this.updateGraphMetadata();
    return fullEdge;
  }

  removeNode(nodeId: string): void {
    this.lineageGraph.nodes = this.lineageGraph.nodes.filter(node => node.id !== nodeId);
    this.lineageGraph.edges = this.lineageGraph.edges.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    );
    this.updateGraphMetadata();
  }

  removeEdge(edgeId: string): void {
    this.lineageGraph.edges = this.lineageGraph.edges.filter(edge => edge.id !== edgeId);
    this.updateGraphMetadata();
  }

  updateNode(nodeId: string, updates: Partial<LineageNode>): LineageNode | null {
    const nodeIndex = this.lineageGraph.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) return null;

    this.lineageGraph.nodes[nodeIndex] = {
      ...this.lineageGraph.nodes[nodeIndex],
      ...updates,
      metadata: {
        ...this.lineageGraph.nodes[nodeIndex].metadata,
        updated: new Date()
      }
    };

    this.updateGraphMetadata();
    return this.lineageGraph.nodes[nodeIndex];
  }

  // Lineage discovery and automatic tracking
  async discoverLineageFromDataset(datasetId: string, metadata: Record<string, any>): Promise<void> {
    // Create dataset node
    const datasetNode = this.addNode({
      id: datasetId,
      type: 'dataset',
      name: metadata.name || datasetId,
      description: metadata.description || 'Discovered dataset',
      properties: {
        schema: metadata.schema,
        size: metadata.size,
        rowCount: metadata.rowCount,
        lastUpdated: new Date(metadata.lastUpdated || Date.now()),
        format: metadata.format,
        location: metadata.location,
        tags: metadata.tags || []
      }
    });

    // Discover column lineage if schema is available
    if (metadata.schema) {
      await this.discoverColumnLineage(datasetId, metadata.schema);
    }
  }

  async trackTransformation(
    sourceIds: string[],
    targetId: string,
    transformationType: string,
    transformationDetails: Record<string, any>
  ): Promise<void> {
    // Create transformation node
    const transformationNode = this.addNode({
      id: `transform_${Date.now()}`,
      type: 'transformation',
      name: transformationType,
      description: `${transformationType} transformation`,
      properties: {
        transformationType,
        lastExecuted: new Date(),
        executionCount: 1,
        ...transformationDetails
      }
    });

    // Create edges from sources to transformation
    for (const sourceId of sourceIds) {
      this.addEdge({
        id: `${sourceId}_to_${transformationNode.id}`,
        source: sourceId,
        target: transformationNode.id,
        type: 'flows_to',
        properties: {
          transformationType,
          lastExecuted: new Date()
        }
      });
    }

    // Create edge from transformation to target
    this.addEdge({
      id: `${transformationNode.id}_to_${targetId}`,
      source: transformationNode.id,
      target: targetId,
      type: 'transforms_to',
      properties: {
        transformationType,
        lastExecuted: new Date()
      }
    });
  }

  async trackPipelineExecution(
    pipelineId: string,
    steps: Array<{
      stepId: string;
      inputs: string[];
      outputs: string[];
      transformationType: string;
    }>
  ): Promise<void> {
    // Create or update pipeline node
    let pipelineNode = this.findNode(pipelineId);
    if (!pipelineNode) {
      pipelineNode = this.addNode({
        id: pipelineId,
        type: 'pipeline',
        name: `Pipeline ${pipelineId}`,
        description: 'Data processing pipeline',
        properties: {
          lastExecuted: new Date(),
          executionCount: 1
        }
      });
    } else {
      this.updateNode(pipelineId, {
        properties: {
          ...pipelineNode.properties,
          lastExecuted: new Date(),
          executionCount: (pipelineNode.properties.executionCount || 0) + 1
        }
      });
    }

    // Track each step
    for (const step of steps) {
      await this.trackTransformation(
        step.inputs,
        step.outputs[0], // Simplified - assumes single output
        step.transformationType,
        { stepId: step.stepId, pipelineId }
      );
    }
  }

  // Lineage querying
  queryLineage(query: LineageQuery): DataLineageGraph {
    const { nodeId, direction, depth = 10, includeTypes, excludeTypes, includeColumns } = query;
    
    const visitedNodes = new Set<string>();
    const resultNodes: LineageNode[] = [];
    const resultEdges: LineageEdge[] = [];

    const traverse = (currentNodeId: string, currentDepth: number, dir: 'upstream' | 'downstream') => {
      if (currentDepth >= depth || visitedNodes.has(currentNodeId)) return;
      
      visitedNodes.add(currentNodeId);
      const currentNode = this.findNode(currentNodeId);
      if (!currentNode) return;

      // Filter by node type
      if (includeTypes && !includeTypes.includes(currentNode.type)) return;
      if (excludeTypes && excludeTypes.includes(currentNode.type)) return;

      resultNodes.push(currentNode);

      // Find connected edges based on direction
      const relevantEdges = this.lineageGraph.edges.filter(edge => {
        if (dir === 'upstream') {
          return edge.target === currentNodeId;
        } else {
          return edge.source === currentNodeId;
        }
      });

      for (const edge of relevantEdges) {
        resultEdges.push(edge);
        const nextNodeId = dir === 'upstream' ? edge.source : edge.target;
        traverse(nextNodeId, currentDepth + 1, dir);
      }
    };

    // Start traversal
    if (direction === 'upstream' || direction === 'both') {
      traverse(nodeId, 0, 'upstream');
    }
    if (direction === 'downstream' || direction === 'both') {
      traverse(nodeId, 0, 'downstream');
    }

    // Include the query node itself if not already included
    const queryNode = this.findNode(nodeId);
    if (queryNode && !resultNodes.find(n => n.id === nodeId)) {
      resultNodes.push(queryNode);
    }

    return {
      nodes: resultNodes,
      edges: resultEdges.filter(edge => 
        resultNodes.some(n => n.id === edge.source) && 
        resultNodes.some(n => n.id === edge.target)
      ),
      metadata: { ...this.lineageGraph.metadata }
    };
  }

  getUpstreamLineage(nodeId: string, depth?: number): DataLineageGraph {
    return this.queryLineage({ nodeId, direction: 'upstream', depth });
  }

  getDownstreamLineage(nodeId: string, depth?: number): DataLineageGraph {
    return this.queryLineage({ nodeId, direction: 'downstream', depth });
  }

  getFullLineage(nodeId: string, depth?: number): DataLineageGraph {
    return this.queryLineage({ nodeId, direction: 'both', depth });
  }

  // Analysis functions
  async performImpactAnalysis(nodeId: string): Promise<ImpactAnalysisResult> {
    const downstreamLineage = this.getDownstreamLineage(nodeId);
    
    const affectedNodes = downstreamLineage.nodes.filter(n => n.id !== nodeId);
    const affectedReports = affectedNodes.filter(n => n.type === 'report');
    const affectedModels = affectedNodes.filter(n => n.type === 'model');
    
    // Determine risk level based on number and type of affected nodes
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (affectedReports.length > 10 || affectedModels.length > 5) {
      riskLevel = 'critical';
    } else if (affectedReports.length > 5 || affectedModels.length > 2) {
      riskLevel = 'high';
    } else if (affectedNodes.length > 10) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      affectedNodes,
      affectedReports,
      affectedModels,
      riskLevel,
      estimatedImpact: `${affectedNodes.length} downstream assets will be affected`
    };
  }

  async performRootCauseAnalysis(nodeId: string): Promise<RootCauseAnalysisResult> {
    const upstreamLineage = this.getUpstreamLineage(nodeId);
    
    // Find data sources (nodes with no incoming edges)
    const potentialSources = upstreamLineage.nodes.filter(node => 
      node.type === 'dataset' && 
      !upstreamLineage.edges.some(edge => edge.target === node.id)
    );

    // Create simplified data path from sources to target
    const dataPath = this.findShortestPath(potentialSources[0]?.id, nodeId);

    return {
      potentialSources,
      dataPath,
      confidence: potentialSources.length > 0 ? 0.8 : 0.3,
      recommendations: [
        'Verify data quality at source datasets',
        'Check transformation logic in pipeline steps',
        'Monitor data freshness and update frequencies'
      ]
    };
  }

  async analyzeDataFlow(nodeId?: string): Promise<DataFlowAnalysisResult> {
    const lineage = nodeId ? this.getFullLineage(nodeId) : this.lineageGraph;
    
    // Find all flow paths
    const flowPaths = this.findAllFlowPaths(lineage);
    
    // Identify bottlenecks (nodes with high fan-in or fan-out)
    const bottlenecks = lineage.nodes.filter(node => {
      const incomingEdges = lineage.edges.filter(e => e.target === node.id).length;
      const outgoingEdges = lineage.edges.filter(e => e.source === node.id).length;
      return incomingEdges > 5 || outgoingEdges > 5;
    });

    // Find inefficiencies
    const inefficiencies: DataFlowIssue[] = [];
    
    // Look for redundant transformations
    const transformationGroups = lineage.nodes
      .filter(n => n.type === 'transformation')
      .reduce((groups, node) => {
        const key = node.properties.transformationType || 'unknown';
        if (!groups[key]) groups[key] = [];
        groups[key].push(node);
        return groups;
      }, {} as Record<string, LineageNode[]>);

    Object.entries(transformationGroups).forEach(([type, nodes]) => {
      if (nodes.length > 3) {
        inefficiencies.push({
          type: 'redundancy',
          nodes,
          description: `Multiple ${type} transformations detected`,
          severity: 'medium',
          recommendation: `Consider consolidating ${type} operations`
        });
      }
    });

    return {
      flowPaths,
      bottlenecks,
      inefficiencies,
      optimization: [
        {
          type: 'cache',
          nodes: bottlenecks.slice(0, 3),
          description: 'Cache frequently accessed intermediate results',
          estimatedImprovement: 'Up to 40% faster pipeline execution'
        }
      ]
    };
  }

  // Helper methods
  private async discoverColumnLineage(datasetId: string, schema: ColumnSchema[]): Promise<void> {
    for (const column of schema) {
      this.addNode({
        id: `${datasetId}.${column.name}`,
        type: 'column',
        name: column.name,
        description: column.description || `Column ${column.name}`,
        properties: {
          schema: [column],
          tags: []
        }
      });

      // Connect column to dataset
      this.addEdge({
        id: `${datasetId}_contains_${column.name}`,
        source: datasetId,
        target: `${datasetId}.${column.name}`,
        type: 'depends_on',
        properties: {}
      });
    }
  }

  private updateGraphMetadata(): void {
    this.lineageGraph.metadata.updated = new Date();
  }

  private findNode(nodeId: string): LineageNode | undefined {
    return this.lineageGraph.nodes.find(node => node.id === nodeId);
  }

  private findShortestPath(sourceId: string, targetId: string): LineageNode[] {
    if (!sourceId || !targetId) return [];
    
    const visited = new Set<string>();
    const queue: { nodeId: string; path: LineageNode[] }[] = [
      { nodeId: sourceId, path: [this.findNode(sourceId)!] }
    ];

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (nodeId === targetId) {
        return path;
      }
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const outgoingEdges = this.lineageGraph.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        const nextNode = this.findNode(edge.target);
        if (nextNode && !visited.has(edge.target)) {
          queue.push({
            nodeId: edge.target,
            path: [...path, nextNode]
          });
        }
      }
    }

    return [];
  }

  private findAllFlowPaths(lineage: DataLineageGraph): DataFlowPath[] {
    // Simplified implementation - finds paths from sources to sinks
    const sources = lineage.nodes.filter(node => 
      !lineage.edges.some(edge => edge.target === node.id)
    );
    
    const sinks = lineage.nodes.filter(node => 
      !lineage.edges.some(edge => edge.source === node.id)
    );

    const paths: DataFlowPath[] = [];
    
    for (const source of sources.slice(0, 5)) { // Limit to prevent exponential explosion
      for (const sink of sinks.slice(0, 5)) {
        const pathNodes = this.findShortestPath(source.id, sink.id);
        if (pathNodes.length > 1) {
          const pathEdges = this.getEdgesForPath(pathNodes);
          paths.push({
            nodes: pathNodes,
            edges: pathEdges,
            totalLatency: pathNodes.length * 100, // Simplified calculation
            complexity: pathEdges.length
          });
        }
      }
    }

    return paths;
  }

  private getEdgesForPath(pathNodes: LineageNode[]): LineageEdge[] {
    const edges: LineageEdge[] = [];
    
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const edge = this.lineageGraph.edges.find(e => 
        e.source === pathNodes[i].id && e.target === pathNodes[i + 1].id
      );
      if (edge) {
        edges.push(edge);
      }
    }

    return edges;
  }

  // Export/Import functionality
  exportLineage(): DataLineageGraph {
    return JSON.parse(JSON.stringify(this.lineageGraph));
  }

  importLineage(lineage: DataLineageGraph): void {
    this.lineageGraph = lineage;
  }

  // Search and filtering
  searchNodes(query: string, types?: NodeType[]): LineageNode[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.lineageGraph.nodes.filter(node => {
      const matchesType = !types || types.includes(node.type);
      const matchesText = 
        node.name.toLowerCase().includes(lowercaseQuery) ||
        node.description.toLowerCase().includes(lowercaseQuery) ||
        (node.properties.tags && node.properties.tags.some(tag => 
          tag.toLowerCase().includes(lowercaseQuery)
        ));
      
      return matchesType && matchesText;
    });
  }

  getNodesByType(type: NodeType): LineageNode[] {
    return this.lineageGraph.nodes.filter(node => node.type === type);
  }

  getNodesByTag(tag: string): LineageNode[] {
    return this.lineageGraph.nodes.filter(node => 
      node.properties.tags?.includes(tag)
    );
  }
}

export default DataLineageService;