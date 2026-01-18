import React, { useState, useEffect } from 'react';
import { FileNode } from '../types';
import { Spinner, CloseIcon, PlusIcon, SparklesIcon } from './Icons';

interface AnalysisPanelProps {
  file: FileNode | null;
  onUpdateFileName: (fileId: string, newName: string) => void;
  onAddTag: (fileId: string, newTag: string) => void;
  onRemoveTag: (fileId: string, tagToRemove: string) => void;
  onPropagateTag: (fileId: string, tag: string) => void; // New prop for smart tagging
  isLoading: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ file, onUpdateFileName, onAddTag, onRemoveTag, onPropagateTag, isLoading }) => {
    const [newTag, setNewTag] = useState('');
    const [smartTag, setSmartTag] = useState('');
    const [editableName, setEditableName] = useState('');

    useEffect(() => {
        if (file?.analysis?.suggestedName) {
            setEditableName(file.analysis.suggestedName);
        } else {
            setEditableName('');
        }
    }, [file?.analysis?.suggestedName]);

    const handleApplyName = () => {
        if (file && editableName.trim() !== '') {
            onUpdateFileName(file.id, editableName.trim());
        }
    };

    const handleNameInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleApplyName();
        }
    };

    const handleAddTag = () => {
        if (file && newTag.trim() !== '') {
            onAddTag(file.id, newTag.trim());
            setNewTag('');
        }
    };
    
    const handleSmartTagApply = () => {
        if (file && smartTag.trim() !== '') {
            onPropagateTag(file.id, smartTag.trim());
            setSmartTag('');
        }
    };

    const handleTagInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAddTag();
        }
    };
    
    const handleSmartTagInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSmartTagApply();
        }
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <Spinner className="w-12 h-12 text-sky-400" />
                    <p className="mt-4 text-gray-300">Analyzing document...</p>
                </div>
            );
        }

        if (!file) {
            return <div className="text-center text-gray-400 p-4">Select a file to analyze.</div>;
        }

        if (!file.analysis) {
             return <div className="text-center text-gray-400 p-4">Analysis will appear here once you select a file.</div>;
        }

        const { summary, tags, documentType } = file.analysis;
        const isImage = file.mimeType.startsWith('image/');

        return (
            <div className="p-4 space-y-6">
                <div>
                    <h3 className="font-semibold text-sky-400">Document Type</h3>
                    <p className="mt-1 text-sm bg-gray-700/50 p-2 rounded">{documentType}</p>
                </div>
                <div>
                    <h3 className="font-semibold text-sky-400">Suggested Name</h3>
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            type="text"
                            value={editableName}
                            onChange={(e) => setEditableName(e.target.value)}
                            onKeyPress={handleNameInputKeyPress}
                            className="bg-gray-700/50 text-sm p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-sky-500 flex-grow break-all"
                            placeholder="Enter a file name"
                        />
                        <button 
                            onClick={handleApplyName}
                            className="bg-sky-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-sky-500 transition-colors shrink-0"
                        >
                            Apply
                        </button>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-sky-400 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                            <span key={index} className="flex items-center bg-gray-600 text-gray-200 text-xs font-medium pl-2.5 pr-1 py-1 rounded-full">
                                {tag}
                                <button onClick={() => onRemoveTag(file.id, tag)} className="ml-1.5 text-gray-400 hover:text-white hover:bg-gray-500 rounded-full">
                                    <CloseIcon className="w-3 h-3"/>
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                         <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={handleTagInputKeyPress}
                            placeholder="Add a new tag"
                            className="bg-gray-700/50 text-sm p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <button
                            onClick={handleAddTag}
                            className="bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-md transition-colors shrink-0"
                        >
                            <PlusIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                {isImage && (
                    <div>
                        <h3 className="font-semibold text-sky-400 flex items-center gap-2 mb-2">
                            <SparklesIcon className="w-5 h-5"/>
                            Smart Tag Similar Images
                        </h3>
                        <p className="text-xs text-gray-400 mb-3">Apply a tag to this image and all other images with the same subject.</p>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={smartTag}
                                onChange={(e) => setSmartTag(e.target.value)}
                                onKeyPress={handleSmartTagInputKeyPress}
                                placeholder="Enter tag to apply"
                                className="bg-gray-700/50 text-sm p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                             <button 
                                onClick={handleSmartTagApply}
                                className="bg-sky-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-sky-500 transition-colors shrink-0"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                )}
                
                <div>
                    <h3 className="font-semibold text-sky-400">Summary</h3>
                    <p className="mt-1 text-sm text-gray-300 bg-gray-700/50 p-3 rounded leading-relaxed">{summary}</p>
                </div>
            </div>
        );
    }
  
    return (
        <div className="bg-gray-800 rounded-lg h-full overflow-y-auto">
            <h2 className="text-lg font-bold p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">AI Analysis</h2>
            {renderContent()}
        </div>
    );
};

export default AnalysisPanel;