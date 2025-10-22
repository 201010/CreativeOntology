import React, { useState, useEffect } from 'react';
import { SuggestedNode } from '../types';
import { categoryColors } from '../data/creativityOntology';

interface AIExpansionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  suggestions: SuggestedNode[];
  onAddNodes: (nodes: SuggestedNode[]) => void;
}

const AIExpansionModal: React.FC<AIExpansionModalProps> = ({ isOpen, onClose, isLoading, suggestions, onAddNodes }) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      // Reset selections when modal opens
      const allSelected = new Set(suggestions.map((_, i) => i));
      setSelectedIndices(allSelected);
    }
  }, [isOpen, suggestions]);

  if (!isOpen) return null;

  const handleToggleSelection = (index: number) => {
    setSelectedIndices(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(index)) {
        newSelection.delete(index);
      } else {
        newSelection.add(index);
      }
      return newSelection;
    });
  };

  const handleAddClick = () => {
    const nodesToAdd = suggestions.filter((_, index) => selectedIndices.has(index));
    onAddNodes(nodesToAdd);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-4">AI Suggestions for Expansion</h2>
        <div className="flex-grow overflow-y-auto pr-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg className="animate-spin h-8 w-8 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p>Discovering related concepts...</p>
            </div>
          )}
          {!isLoading && suggestions.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>The AI could not find any new concepts to suggest.</p>
            </div>
          )}
          {!isLoading && suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((node, index) => (
                <div key={node.id} className="bg-gray-800 p-3 rounded-lg flex items-start space-x-4">
                  <input
                    type="checkbox"
                    className="mt-1.5 h-4 w-4 rounded bg-gray-700 border-gray-600 text-amber-500 focus:ring-amber-500 focus:ring-1 focus:ring-offset-0 focus:ring-offset-gray-800"
                    checked={selectedIndices.has(index)}
                    onChange={() => handleToggleSelection(index)}
                  />
                  <div className="flex-1">
                    <h3 className="font-bold" style={{ color: categoryColors[node.category] }}>{node.id}</h3>
                    <p className="text-xs text-gray-400 mb-1">{node.type} | {node.era}</p>
                    <p className="text-sm text-gray-300 mb-2">{node.description}</p>
                    <p className="text-xs text-gray-500">
                      Connects to: <span className="text-gray-400">{node.connections?.join(', ') || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-white">Cancel</button>
          <button 
            type="button" 
            onClick={handleAddClick} 
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-white"
            disabled={isLoading || selectedIndices.size === 0}
          >
            Add Selected ({selectedIndices.size})
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIExpansionModal;
