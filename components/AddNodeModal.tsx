import React, { useState } from 'react';
import { CreativeNode, NodeType, Category } from '../types';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (newNode: CreativeNode, targets: string[]) => void;
  onSuggestConnections: (nodeDetails: Omit<CreativeNode, 'x'|'y'|'vx'|'vy'|'fx'|'fy'>) => Promise<string[]>;
  onFillDetails: (nodeInfo: {id: string, description: string}) => Promise<Partial<CreativeNode>>;
  allNodes: CreativeNode[];
  eras: string[];
}

const AddNodeModal: React.FC<AddNodeModalProps> = ({ isOpen, onClose, onAddNode, onSuggestConnections, onFillDetails, allNodes, eras }) => {
  const [id, setId] = useState('');
  const [type, setType] = useState<NodeType>(NodeType.Discipline);
  const [category, setCategory] = useState<Category>(Category.Hybrid);
  const [era, setEra] = useState(eras[eras.length-1]);
  const [description, setDescription] = useState('');
  const [exampleUrl, setExampleUrl] = useState('');
  const [targets, setTargets] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isFilling, setIsFilling] = useState(false);

  if (!isOpen) return null;
  
  const sortedNodes = [...allNodes].sort((a, b) => a.id.localeCompare(b.id));

  const handleResetForm = () => {
    setId('');
    setType(NodeType.Discipline);
    setCategory(Category.Hybrid);
    setEra(eras[eras.length-1]);
    setDescription('');
    setExampleUrl('');
    setTargets([]);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !description) {
      setError('Name and Description are required.');
      return;
    }
    if (allNodes.some(node => node.id.toLowerCase() === id.toLowerCase())) {
        setError('A node with this name already exists.');
        return;
    }

    const newNode: CreativeNode = {
      id,
      type,
      category,
      era,
      description,
      ...(exampleUrl && { exampleUrl }),
    };
    onAddNode(newNode, targets);
    handleResetForm();
    onClose();
  };
  
    const handleFillClick = async () => {
        if (!id && !description) {
            setError('Please enter a Name or Description to use the AI filler.');
            return;
        }
        setIsFilling(true);
        setError('');

        try {
            const details = await onFillDetails({ id, description });
            if (details.type) setType(details.type);
            if (details.category) setCategory(details.category);
            if (details.era) setEra(details.era);
            if (details.description) setDescription(details.description);
        } catch (e) {
            setError("AI failed to fill details. Please try again.");
            console.error(e);
        } finally {
            setIsFilling(false);
        }
    };

  const handleSuggestionClick = async () => {
      if (!id) {
          setError('Please enter a Name before suggesting connections.');
          return;
      };
      setIsSuggesting(true);
      setError('');
      
      try {
        const nodeDetails = { id, type, category, era, description };
        const suggestions = await onSuggestConnections(nodeDetails);
        
        if (suggestions.length > 0) {
            setTargets(prevTargets => [...new Set([...prevTargets, ...suggestions])]);
        } else {
            setError("AI couldn't find any relevant connections.");
        }

      } catch (e) {
        setError("Failed to get AI suggestions. Please try again.");
        console.error(e);
      } finally {
        setIsSuggesting(false);
      }
    };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Add to the Ontology</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label htmlFor="id" className="block mb-1 font-semibold text-gray-300">Name / ID</label>
            <input type="text" id="id" value={id} onChange={(e) => setId(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" required/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="type" className="block mb-1 font-semibold text-gray-300">Type</label>
              <select id="type" value={type} onChange={(e) => setType(e.target.value as NodeType)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded">
                {Object.values(NodeType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="category" className="block mb-1 font-semibold text-gray-300">Category</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded">
                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="era" className="block mb-1 font-semibold text-gray-300">Era</label>
              <select id="era" value={era} onChange={(e) => setEra(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded">
                {eras.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block mb-1 font-semibold text-gray-300">Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" rows={3} required></textarea>
          </div>
          
           <div>
            <h3 className="block mb-2 text-base font-semibold text-gray-300">AI Assistance</h3>
            <div className="p-3 bg-gray-800/70 border border-gray-700 rounded-md space-y-3">
                <div>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300">Auto-fill details</label>
                        <button
                            type="button"
                            onClick={handleFillClick}
                            disabled={isFilling || (!id && !description)}
                            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-white"
                        >
                            {isFilling ? 'Working...' : 'Fill Form'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Provide a name and/or description, and AI will complete the type, category, era, and description.</p>
                </div>
                <div>
                    <div className="flex justify-between items-center">
                        <label className="text-gray-300">Suggest connections</label>
                        <button
                            type="button"
                            onClick={handleSuggestionClick}
                            disabled={isSuggesting || !id}
                            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-1 focus:ring-white"
                        >
                            {isSuggesting ? 'Suggesting...' : 'Suggest'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">After filling details, AI can suggest connections to existing concepts.</p>
                </div>
            </div>
          </div>
          
          <div>
            <label htmlFor="exampleUrl" className="block mb-1 font-semibold text-gray-300">"Learn More" URL (Optional)</label>
            <input type="url" id="exampleUrl" value={exampleUrl} onChange={(e) => setExampleUrl(e.target.value)} className="w-full p-2 bg-gray-800 border border-gray-600 rounded" />
          </div>
          <div>
             <label htmlFor="connections" className="block mb-1 font-semibold text-gray-300">Connections (Manual Selection)</label>
             <select 
                id="connections" 
                multiple 
                value={targets} 
                onChange={(e) => setTargets(Array.from(e.target.selectedOptions, (option) => (option as HTMLOptionElement).value))}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded h-32"
             >
                {sortedNodes.map(node => <option key={node.id} value={node.id}>{node.id}</option>)}
             </select>
             <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple.</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end space-x-4 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-white">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-white">Add Node</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNodeModal;
