import React, { useState } from 'react';
import { TreeNode, FileNode } from '../types';
import { FolderIcon, FileIcon, TrashIcon } from './Icons';

interface FileExplorerProps {
  nodes: TreeNode[];
  onSelectNode: (node: FileNode) => void;
  onRemoveNode: (nodeId: string) => void;
  selectedNodeId?: string;
  level?: number;
}

const TreeNodeComponent: React.FC<{ node: TreeNode; onSelectNode: (node: FileNode) => void; onRemoveNode: (nodeId: string) => void; selectedNodeId?: string; level: number }> = ({ node, onSelectNode, onRemoveNode, selectedNodeId, level }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveNode(node.id);
  };

  if (node.type === 'folder') {
    return (
      <div style={{ paddingLeft: `${level * 1.5}rem` }}>
        <div className="flex items-center justify-between p-2 hover:bg-gray-700 rounded-md group">
          <div 
            className="flex items-center flex-grow cursor-pointer"
            onClick={() => setIsOpen(!isOpen)}
          >
            <FolderIcon className="w-5 h-5 mr-2 text-sky-400" />
            <span className="font-medium">{node.name}</span>
          </div>
          <button onClick={handleRemove} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-1 rounded-full transition-opacity shrink-0">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
        {isOpen && (
          <FileExplorer nodes={node.children} onSelectNode={onSelectNode} onRemoveNode={onRemoveNode} selectedNodeId={selectedNodeId} level={level + 1} />
        )}
      </div>
    );
  } else { // File node
    const isSelected = node.id === selectedNodeId;
    return (
      <div style={{ paddingLeft: `${level * 1.5}rem` }}>
        <div 
          className={`flex items-center justify-between p-2 cursor-pointer rounded-md group ${isSelected ? 'bg-sky-600' : 'hover:bg-gray-700'}`}
        >
          <div className="flex items-center flex-grow" onClick={() => onSelectNode(node)}>
            <FileIcon className="w-5 h-5 mr-2 text-gray-400" />
            <span>{node.name}</span>
          </div>
          <button onClick={handleRemove} className={`opacity-0 group-hover:opacity-100 p-1 rounded-full transition-opacity shrink-0 ${isSelected ? 'text-white hover:text-red-300' : 'text-gray-400 hover:text-red-400'}`}>
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
};

const FileExplorer: React.FC<FileExplorerProps> = ({ nodes, onSelectNode, onRemoveNode, selectedNodeId, level = 0 }) => {
  return (
    <div>
      {nodes.map(node => (
        <TreeNodeComponent key={node.id} node={node} onSelectNode={onSelectNode} onRemoveNode={onRemoveNode} selectedNodeId={selectedNodeId} level={level} />
      ))}
    </div>
  );
};

export default FileExplorer;