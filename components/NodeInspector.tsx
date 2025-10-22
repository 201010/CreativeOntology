import React from 'react';
import { CreativeNode } from '../types';
import { categoryColors } from '../data/creativityOntology';

interface NodeInspectorProps {
    node: CreativeNode;
    onStartExpansion: (node: CreativeNode) => void;
    onClearSelection: () => void;
}

const NodeInspector: React.FC<NodeInspectorProps> = ({ node, onStartExpansion, onClearSelection }) => {
    return (
        <div className="p-3">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-base mr-2" style={{ color: categoryColors[node.category] }}>
                    {node.id}
                </h3>
                <button 
                    onClick={onClearSelection} 
                    className="text-gray-500 hover:text-white transition-colors rounded-full p-1 focus:outline-none focus:ring-1 focus:ring-white"
                    aria-label="Close inspector"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">
                <strong>{node.type}</strong> | {node.era || node.phase}
            </p>
            <p className="text-gray-300 text-sm mb-4">{node.description}</p>
            {node.exampleUrl && (
                <a 
                href={node.exampleUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-400 hover:text-blue-300 underline text-sm mb-4 block rounded focus:outline-none focus:ring-1 focus:ring-white"
                >
                Learn more
                </a>
            )}
            <button 
                onClick={() => onStartExpansion(node)}
                className="w-full p-2 text-sm bg-amber-600 hover:bg-amber-500 rounded transition-colors duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-1 focus:ring-white"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
                <span>Discover with AI</span>
            </button>
        </div>
    );
};

export default NodeInspector;
