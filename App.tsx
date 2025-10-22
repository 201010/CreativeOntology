import React, { useState, useMemo, useEffect } from 'react';
import ForceGraph from './components/ForceGraph';
import EraFilter from './components/EraFilter';
import AddNodeModal from './components/AddNodeModal';
import AIExpansionModal from './components/AIExpansionModal';
import NodeInspector from './components/NodeInspector';
import { creativityData, categoryColors } from './data/creativityOntology';
import { NodeType, CreativeNode, GraphData, Category, SuggestedNode, CreativeLink } from './types';

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
  const [copyButtonText, setCopyButtonText] = useState('Share Current View');

  useEffect(() => {
    // On initial load, parse URL parameters to set the state
    const params = new URLSearchParams(window.location.search);
    
    const eraStart = params.get('era_start');
    const eraEnd = params.get('era_end');
    if (eraStart !== null && eraEnd !== null) {
      const start = parseInt(eraStart, 10);
      const end = parseInt(eraEnd, 10);
      if (!isNaN(start) && !isNaN(end) && start >= 0 && end < eras.length && start <= end) {
        setSelectedEraRange([start, end]);
      }
    }

    const categoriesParam = params.get('categories');
    if (categoriesParam) {
      const urlCategories = new Set(categoriesParam.split(',') as Category[]);
      const validCategories = Object.values(Category);
      const filteredCategories = new Set([...urlCategories].filter(cat => validCategories.includes(cat)));
      if (filteredCategories.size > 0) {
        setActiveCategories(filteredCategories);
      }
    }

    const selectedNodeId = params.get('selected_node');
    if (selectedNodeId) {
      const nodeToSelect = creativityData.nodes.find(n => n.id === selectedNodeId);
      if (nodeToSelect) {
        setSelectedNode(nodeToSelect);
      }
    }
  }, []); // Empty dependency array ensures this runs only once on mount

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
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'fillDetails',
                payload: { nodeInfo }
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }
        return await response.json();
      } catch (error) {
        console.error("AI fill details failed:", error);
        throw error;
      }
    };

  const handleSuggestConnections = async (newNode: Omit<CreativeNode, 'x'|'y'|'vx'|'vy'|'fx'|'fy'>): Promise<string[]> => {
      try {
        const allNodeIds = graphData.nodes.map(n => n.id);
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'suggestConnections',
                payload: { newNode, allNodeIds }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }
        
        const result = await response.json();
        if (result.connections && Array.isArray(result.connections)) {
          // Final validation on the client-side to ensure suggestions are valid
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
        const existingNodeIds = graphData.nodes.map(n => n.id);
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                task: 'startExpansion',
                payload: { node, existingNodeIds }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }
        
        const result = await response.json();
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

  const handleShare = () => {
    const params = new URLSearchParams();
    
    params.set('era_start', selectedEraRange[0].toString());
    params.set('era_end', selectedEraRange[1].toString());

    if (activeCategories.size < Object.values(Category).length) {
      params.set('categories', Array.from(activeCategories).join(','));
    }

    if (selectedNode) {
      params.set('selected_node', selectedNode.id);
    }

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;

    navigator.clipboard.writeText(url).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Share Current View'), 2000);
    }).catch(err => {
      console.error('Failed to copy URL: ', err);
      setCopyButtonText('Copy Failed');
      setTimeout(() => setCopyButtonText('Share Current View'), 2000);
    });
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
        <div className="p-3 border-t border-gray-700 space-y-2">
           <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-full p-2 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-1 focus:ring-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="http://www.w3.org/2000/svg" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              <span>Add Concept Manually</span>
            </button>
            <button 
              onClick={handleShare}
              className="w-full p-2 text-sm bg-gray-800 hover:bg-gray-700 rounded transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-1 focus:ring-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              <span>{copyButtonText}</span>
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