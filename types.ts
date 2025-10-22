
export enum Category {
  Visual = "Visual",
  Narrative = "Narrative",
  Auditory = "Auditory",
  Kinesthetic = "Kinesthetic",
  Hybrid = "Hybrid",
  Process = "Process", // Represents a process or artifact within a discipline
}

export enum NodeType {
  Discipline = "Discipline",
  Process = "Process",
}

export interface CreativeNode {
  id: string;
  type: NodeType;
  category: Category;
  era?: string;
  description: string;
  exampleUrl?: string;
  phase?: string;
  // D3 properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface CreativeLink {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: CreativeNode[];
  links: CreativeLink[];
}

export interface SuggestedNode extends Omit<CreativeNode, 'x'|'y'|'vx'|'vy'|'fx'|'fy'> {
  connections: string[];
}
