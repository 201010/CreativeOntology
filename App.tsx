import React, { useState, useMemo } from 'react';
import ForceGraph from './components/ForceGraph';
import EraFilter from './components/EraFilter';
import AddNodeModal from './components/AddNodeModal';
import AIExpansionModal from './components/AIExpansionModal';
import NodeInspector from './components/NodeInspector';
import { creativityData, categoryColors } from './data/creativityOntology';
import { NodeType, CreativeNode, GraphData, Category, SuggestedNode, CreativeLink } from './types';
import { GoogleGenAI, Type } from "@google/genai";


// Define eras in chronological order
const eras = [
  "Prehistoric",
  "Ancient",
  "Classical",
  "Renaissance",
  "19th Century",
  "20th Century",
  "Late 20th Century",
  "21st Century",
];

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>(creativityData);
  const [selectedEraRange, setSelectedEraRange] = useState<[number, number]>([0, eras.length - 1]);
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set(Object.values(Category)));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedNode, setSelectedNode] = useState<CreativeNode | null>(null);
  const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false);
  const [suggestedExpansions, setSuggestedExpansions] = useState<SuggestedNode[]>([]);
  const [isSuggestingExpansions, setIsSuggestingExpansions] = useState(false);


  const filteredData = useMemo(() => {
    const [startIndex, endIndex] = selectedEraRange;
    const activeEras = new Set(eras.slice(startIndex, endIndex + 1));

    const visibleNodes = graphData.nodes.filter(node => {
      const isInEra = node.era ? activeEras.has(node.era) : false;
      const isInCategories = activeCategories.has(node.category);
      return isInEra && isInCategories;
    });

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    const visibleLinks = graphData.links.filter(link =>
      visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target)
    );

    return {
      nodes: visibleNodes,
      links: visibleLinks,
    };
  }, [selectedEraRange, graphData, activeCategories]);

  const handleAddNode = (newNode: CreativeNode, targets: string[]) => {
    const newLinks = targets.map(targetId => ({ source: newNode.id, target: targetId }));
    
    setGraphData(prevData => ({
      nodes: [...prevData.nodes, newNode],
      links: [...prevData.links, ...newLinks],
    }));
  };

  const handleCategoryToggle = (categoryToToggle: Category) => {
    setActiveCategories(prevCategories => {
      const newCategories = new Set(prevCategories);
      if (newCategories.has(categoryToToggle)) {
        newCategories.delete(categoryToToggle);
      } else {
        newCategories.add(categoryToToggle);
      }
      return newCategories;
    });
  };

  const handleShowAllCategories = () => {
    setActiveCategories(new Set(Object.values(Category)));
  };
  
  const handleFillNodeDetails = async (nodeInfo: {id: string, description: string}): Promise<Partial<CreativeNode>> => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `You are an expert in art history and the ontology of creative disciplines.
        A user is adding a new concept to an ontology graph. Based on the provided name and/or description, please fill in the details for this concept.
        
        Provided Info:
        - Name: ${nodeInfo.id}
        - Description: ${nodeInfo.description}
        
        Your task is to return a JSON object with the following fields completed: 'type', 'category', 'era', and a refined, well-written 'description'.
        
        Constraints for the fields:
        - 'type' must be one of: ${Object.values(NodeType).join(', ')}.
        - 'category' must be one of: ${Object.values(Category).join(', ')}.
        - 'era' must be one of: ${eras.join(', ')}.
        - 'description' should be a concise, encyclopedic definition of the concept. If a description was provided, refine and expand upon it.
        
        Return only the JSON object.
        `;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: Object.values(NodeType) },
                        category: { type: Type.STRING, enum: Object.values(Category) },
                        era: { type: Type.STRING, enum: eras },
                        description: { type: Type.STRING }
                    },
                    required: ['type', 'category', 'era', 'description']
                }
            }
        });
        
        const result = JSON.parse(response.text.trim());
        return result as Partial<CreativeNode>;

      } catch (error) {
        console.error("AI fill details failed:", error);
        throw error;
      }
    };

  const handleSuggestConnections = async (newNode: Omit<CreativeNode, 'x'|'y'|'vx'|'vy'|'fx'|'fy'>): Promise<string[]> => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const allNodeIds = graphData.nodes.map(n => n.id);

        const prompt = `You are an expert in art history and the ontology of creative disciplines.
        Your task is to identify connections between creative concepts.
        Given the following new creative concept:
        - Name: ${newNode.id}
        - Description: ${newNode.description}
        - Category: ${newNode.category}
        - Era: ${newNode.era}
        - Type: ${newNode.type}

        And the following list of existing concepts in the ontology:
        [${allNodeIds.join(', ')}]

        Identify the most relevant concepts from the existing list that are direct influences or parents of the new concept.
        Return a JSON object with a single key "connections" which is an array of strings. Each string must be an exact ID from the existing concepts list.
        Only suggest up to 5 of the most relevant connections.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                connections: {
                  type: Type.ARRAY,
                  description: "List of IDs of existing nodes that should be connected to the new node.",
                  items: { type: Type.STRING }
                }
              }
            }
          }
        });

        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        
        if (result.connections && Array.isArray(result.connections)) {
          const validConnections = result.connections.filter(id => allNodeIds.includes(id as string));
          return validConnections;
        }
        return [];
      } catch (error) {
        console.error("AI suggestion failed:", error);
        throw error;
      }
  };

  const handleStartExpansion = async (node: CreativeNode) => {
    setSelectedNode(null); // Deselect node on graph to remove highlight
    setIsExpansionModalOpen(true);
    setIsSuggestingExpansions(true);
    setSuggestedExpansions([]);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const existingNodeIds = graphData.nodes.map(n => n.id);
        
        const prompt = `You are an expert in art history and the ontology of creative disciplines.
        Based on the creative concept "${node.id}: ${node.description}", suggest up to 3 new, related concepts that are missing from the ontology.
        Do NOT suggest any concepts that already exist in this list: [${existingNodeIds.join(', ')}].

        For each new suggestion, provide a unique 'id', a brief 'description', a 'type', a 'category', and an 'era'.
        - 'type' must be one of: ${Object.values(NodeType).join(', ')}.
        - 'category' must be one of: ${Object.values(Category).join(', ')}.
        - 'era' must be one of these: ${eras.join(', ')}.

        Also provide a 'connections' array listing IDs from the existing list that the new node should link to. Always include a connection to the original node, "${node.id}".

        Return a JSON object with a single key "suggestions", which is an array of these new node objects.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: Object.values(NodeType) },
                                    category: { type: Type.STRING, enum: Object.values(Category) },
                                    era: { type: Type.STRING, enum: eras },
                                    connections: { type: Type.ARRAY, items: { type: Type.STRING } },
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const result = JSON.parse(response.text.trim());
        if (result.suggestions && Array.isArray(result.suggestions)) {
            const newSuggestions = result.suggestions.filter(
                (s: SuggestedNode) => s && s.id && !existingNodeIds.some(id => id.toLowerCase() === s.id.toLowerCase())
            );
            setSuggestedExpansions(newSuggestions);
        }

    } catch (error) {
        console.error("AI expansion suggestion failed:", error);
    } finally {
        setIsSuggestingExpansions(false);
    }
  };
  
  const handleAddSuggestedNodes = (nodesToAdd: SuggestedNode[]) => {
    const newNodes: CreativeNode[] = [];
    const newLinks: CreativeLink[] = [];

    const existingNodeIds = new Set(graphData.nodes.map(n => n.id));

    nodesToAdd.forEach(node => {
        if (existingNodeIds.has(node.id)) return; // Failsafe to prevent duplicates

        const { connections, ...newNodeDetails } = node;
        newNodes.push(newNodeDetails as CreativeNode);
        existingNodeIds.add(newNodeDetails.id);
        
        if (connections && Array.isArray(connections)) {
          connections.forEach(targetId => {
              if (graphData.nodes.some(n => n.id === targetId) || nodesToAdd.some(n => n.id === targetId)) {
                  newLinks.push({ source: newNodeDetails.id, target: targetId });
              }
          });
        }
    });

    setGraphData(prevData => ({
      nodes: [...prevData.nodes, ...newNodes],
      links: [...prevData.links, ...newLinks],
    }));
    
    setIsExpansionModalOpen(false);
  };

  return (
    <main className="bg-black text-white min-h-screen flex flex-col items-center p-4 font-sans relative">
      <div className="text-center my-4 z-10">
        <h1 className="text-4xl font-bold tracking-wider">An Ontology of Human Creativity</h1>
        <p className="text-gray-400 mt-2">Click nodes to inspect them. Drag to explore. Zoom and pan to navigate.</p>
      </div>
      
      <div className="absolute top-4 right-4 bg-gray-900/70 rounded-lg z-10 border border-gray-700 w-72">
        {selectedNode ? (
          <NodeInspector 
            node={selectedNode}
            onStartExpansion={handleStartExpansion}
            onClearSelection={() => setSelectedNode(null)}
          />
        ) : (
          <div className="p-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">Categories</h3>
              <button 
                onClick={handleShowAllCategories}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors focus:outline-none focus:ring-1 focus:ring-white rounded"
              >
                Show All
              </button>
            </div>
            <div className="text-xs space-y-1 mt-3">
              {Object.entries(categoryColors).map(([category, color]) => {
                const isActive = activeCategories.has(category as Category);
                return (
                  <button 
                    key={category} 
                    className={`w-full flex items-center p-1 rounded transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-white ${isActive ? 'bg-gray-700/50' : 'opacity-50 hover:opacity-100 hover:bg-gray-800/50'}`}
                    onClick={() => handleCategoryToggle(category as Category)}
                  >
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></span>
                    <span>{category}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <div className="p-3 border-t border-gray-700">
           <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-full p-2 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-1 focus:ring-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              <span>Add Concept Manually</span>
            </button>
        </div>
      </div>

      <div className="w-full h-screen absolute top-0 left-0">
        <ForceGraph 
          data={filteredData}
          selectedNode={selectedNode}
          onNodeClick={setSelectedNode}
        />
      </div>

      <EraFilter 
        eras={eras}
        selectedRange={selectedEraRange}
        onRangeChange={setSelectedEraRange}
      />

      <AddNodeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddNode={handleAddNode}
        onSuggestConnections={handleSuggestConnections}
        onFillDetails={handleFillNodeDetails}
        allNodes={graphData.nodes}
        eras={eras}
      />

      <AIExpansionModal
        isOpen={isExpansionModalOpen}
        onClose={() => setIsExpansionModalOpen(false)}
        isLoading={isSuggestingExpansions}
        suggestions={suggestedExpansions}
        onAddNodes={handleAddSuggestedNodes}
      />
    </main>
  );
};

export default App;
