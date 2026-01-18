import React, { useState, useCallback, useEffect } from 'react';
import FileExplorer from './components/FileExplorer';
import FilePreview from './components/FilePreview';
import AnalysisPanel from './components/AnalysisPanel';
import { TreeNode, FileNode } from './types';
import { analyzeFile, compareImages } from './services/geminiService';
import { SparklesIcon, CloseIcon } from './components/Icons';

// Initial data for the file explorer
const initialTreeData: TreeNode[] = [
  {
    id: '1',
    name: 'Documents',
    type: 'folder',
    path: '/Documents',
    children: [
      {
        id: '2',
        name: 'report.txt',
        type: 'file',
        content: 'This is the final report for Project Alpha. It includes a summary of findings and recommendations.',
        mimeType: 'text/plain',
        path: '/Documents/report.txt'
      },
    ],
  },
  {
    id: '3',
    name: 'Images',
    type: 'folder',
    path: '/Images',
    children: [],
  },
];

const LOCAL_STORAGE_KEY = 'geminiFileAnalyzerTreeData';

const newId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

// Helper to recursively find and update a node
const updateNodeInTree = (nodes: TreeNode[], nodeId: string, updateFn: (node: TreeNode) => TreeNode): TreeNode[] => {
  return nodes.map(node => {
    if (node.id === nodeId) {
      return updateFn(node);
    }
    if (node.type === 'folder') {
      return { ...node, children: updateNodeInTree(node.children, nodeId, updateFn) };
    }
    return node;
  });
};

// Helper to recursively remove a node
const removeNodeFromTree = (nodes: TreeNode[], nodeId: string): TreeNode[] => {
    const newNodes: TreeNode[] = [];
    for (const node of nodes) {
        if (node.id === nodeId) {
            continue; // Skip the node to remove it
        }

        if (node.type === 'folder') {
            const updatedNode = { ...node, children: removeNodeFromTree(node.children, nodeId) };
            newNodes.push(updatedNode);
        } else {
            newNodes.push(node);
        }
    }
    return newNodes;
};

// Helper to find all image files recursively
const findAllImageFiles = (nodes: TreeNode[]): FileNode[] => {
    let imageFiles: FileNode[] = [];
    for (const node of nodes) {
        if (node.type === 'file' && node.mimeType.startsWith('image/')) {
            imageFiles.push(node);
        } else if (node.type === 'folder') {
            imageFiles = [...imageFiles, ...findAllImageFiles(node.children)];
        }
    }
    return imageFiles;
};

// Helper to find a specific node by its ID
const findNodeInTree = (nodes: TreeNode[], nodeId: string): TreeNode | null => {
    for (const node of nodes) {
        if (node.id === nodeId) {
            return node;
        }
        if (node.type === 'folder') {
            const found = findNodeInTree(node.children, nodeId);
            if (found) return found;
        }
    }
    return null;
}


const App: React.FC = () => {
  const [treeData, setTreeData] = useState<TreeNode[]>(() => {
    try {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        return savedData ? JSON.parse(savedData) : initialTreeData;
    } catch (error) {
        console.error("Could not load saved data from localStorage", error);
        return initialTreeData;
    }
  });
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propagationStatus, setPropagationStatus] = useState<{ running: boolean; message: string }>({ running: false, message: '' });
  const [saveStatus, setSaveStatus] = useState('All changes saved');

  // Effect to save treeData to localStorage whenever it changes
  useEffect(() => {
    setSaveStatus('Saving...');
    try {
        const timeoutId = setTimeout(() => {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(treeData));
            setSaveStatus('All changes saved');
        }, 500); // Debounce saving to avoid rapid writes
        return () => clearTimeout(timeoutId);
    } catch (error) {
        console.error("Could not save data to localStorage", error);
        setSaveStatus('Error saving');
    }
  }, [treeData]);

  const handleSelectNode = useCallback(async (node: FileNode) => {
    setSelectedFile(node);
    setError(null);

    if (node.analysis) {
      return; // Already analyzed
    }

    try {
      setIsLoading(true);
      const analysisResult = await analyzeFile(node.name, node.content, node.mimeType);
      
      const updateAnalysis = (n: TreeNode): TreeNode => {
        if (n.id === node.id) {
          return { ...n, analysis: analysisResult } as FileNode;
        }
        return n;
      };

      setTreeData(prevTree => updateNodeInTree(prevTree, node.id, updateAnalysis));
      
      setSelectedFile(prevFile => prevFile && prevFile.id === node.id ? { ...prevFile, analysis: analysisResult } : prevFile);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze the file. An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = (e) => {
            const content = e.target?.result as string;
            const isImage = file.type.startsWith('image/');
            // For data URLs, the content is `data:mime/type;base64,the_base_64_string`. We want only the latter part.
            const fileContent = isImage ? content.split(',')[1] : content;

            const newFile: FileNode = {
                id: newId(),
                name: file.name,
                type: 'file',
                content: fileContent,
                mimeType: file.type,
                path: `/${file.name}`,
            };
            
            // For simplicity, adding to root. A real app might have a target folder.
            setTreeData(prev => [...prev, newFile]);
        };
        
        reader.onerror = () => {
            console.error("Error reading file");
            setError(`Error reading file: ${file.name}`);
        }

        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    }
    event.target.value = ''; // Reset input to allow re-uploading the same file
  };
  
  const handleResetWorkspace = () => {
    if (window.confirm("Are you sure you want to reset your workspace? All uploaded files and changes will be lost.")) {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setTreeData(initialTreeData);
        setSelectedFile(null);
    }
  };

  const handleRemoveNode = (nodeId: string) => {
      setTreeData(prev => removeNodeFromTree(prev, nodeId));
      if (selectedFile?.id === nodeId) {
          setSelectedFile(null);
      }
  };

  const handleUpdateFileName = (fileId: string, newName: string) => {
      const updateName = (n: TreeNode) => ({ ...n, name: newName });
      setTreeData(prev => updateNodeInTree(prev, fileId, updateName));
      setSelectedFile(prev => prev && prev.id === fileId ? { ...prev, name: newName } : prev);
  };
  
    const propagateTagToSimilarImages = async (sourceFile: FileNode, newTag: string) => {
        setPropagationStatus({ running: true, message: 'Scanning for similar images... This may take a moment.' });
        
        const allImages = findAllImageFiles(treeData);
        const otherImages = allImages.filter(img => img.id !== sourceFile.id && (!img.analysis?.tags.includes(newTag)));

        if (otherImages.length === 0) {
            setPropagationStatus({ running: true, message: 'No other images found to compare.' });
            setTimeout(() => setPropagationStatus({ running: false, message: '' }), 3000);
            return;
        }

        let updatedCount = 0;
        const updatedImageIds = new Set<string>();

        for (let i = 0; i < otherImages.length; i++) {
            const targetFile = otherImages[i];
            setPropagationStatus({ running: true, message: `Comparing image ${i + 1} of ${otherImages.length}...` });
            try {
                const isMatch = await compareImages(sourceFile, targetFile);
                if (isMatch) {
                    updatedCount++;
                    updatedImageIds.add(targetFile.id);
                }
            } catch (error) {
                console.error(`Error comparing image ${targetFile.name}:`, error);
            }
        }
        
        if (updatedImageIds.size > 0) {
            const recursivelyUpdateTags = (nodes: TreeNode[]): TreeNode[] => {
                return nodes.map(node => {
                    if (node.type === 'file' && updatedImageIds.has(node.id)) {
                        const fileNode = node as FileNode;
                        const newTags = [...(fileNode.analysis?.tags || []), newTag];
                        const newAnalysis = fileNode.analysis 
                            ? { ...fileNode.analysis, tags: Array.from(new Set(newTags)) } 
                            : { summary: '', suggestedName: '', documentType: '', tags: [newTag] };
                        return { ...fileNode, analysis: newAnalysis };
                    }
                    if (node.type === 'folder') {
                        return { ...node, children: recursivelyUpdateTags(node.children) };
                    }
                    return node;
                });
            };
            setTreeData(prevTree => recursivelyUpdateTags(prevTree));
        }
        
        setPropagationStatus({ running: true, message: `Smart tag applied! ${updatedCount} other image(s) were updated.` });
        setTimeout(() => setPropagationStatus({ running: false, message: '' }), 5000);
    };

    const handlePropagateTag = async (fileId: string, tag: string) => {
        const sourceFile = findNodeInTree(treeData, fileId) as FileNode | null;
        if (!sourceFile || sourceFile.type !== 'file' || !sourceFile.mimeType.startsWith('image/')) {
            console.error("Source file not found or is not an image.");
            return;
        }

        // First, add the tag to the source image itself
        handleAddTag(fileId, tag);

        // Then, propagate to others
        // We use a timeout to allow the state from handleAddTag to settle before starting propagation
        setTimeout(() => {
            const freshSourceFile = findNodeInTree(treeData, fileId) as FileNode;
            propagateTagToSimilarImages(freshSourceFile, tag);
        }, 100);
    };

    const handleAddTag = (fileId: string, newTag: string) => {
        let updatedNode: FileNode | null = null;
        const updateFn = (n: TreeNode): TreeNode => {
            if (n.id === fileId && n.type === 'file') {
                const fileNode = n as FileNode;
                const analysis = fileNode.analysis ?? { summary: '', suggestedName: '', tags: [], documentType: 'Unknown' };
                if (analysis.tags.includes(newTag)) {
                    updatedNode = fileNode; // It already exists, no change needed
                    return fileNode;
                }
                const newTags = [...analysis.tags, newTag];
                updatedNode = { ...fileNode, analysis: { ...analysis, tags: newTags } };
                return updatedNode;
            }
            return n;
        };
    
        setTreeData(prev => updateNodeInTree(prev, fileId, updateFn));
        if (updatedNode) {
            setSelectedFile(updatedNode);
        }
    };

  const handleRemoveTag = (fileId: string, tagToRemove: string) => {
    const updateFn = (n: TreeNode): TreeNode => {
        const fileNode = n as FileNode;
        if (fileNode.analysis) {
            const newTags = fileNode.analysis.tags.filter(tag => tag !== tagToRemove);
            return { ...fileNode, analysis: { ...fileNode.analysis, tags: newTags }};
        }
        return n;
    };
    setTreeData(prev => updateNodeInTree(prev, fileId, updateFn));
    setSelectedFile(prev => {
        if (prev && prev.id === fileId && prev.analysis) {
            const newTags = prev.analysis.tags.filter(tag => tag !== tagToRemove);
            return { ...prev, analysis: { ...prev.analysis, tags: newTags }};
        }
        return prev;
    });
  };
  
  return (
    <div className="bg-gray-900 text-white h-screen flex flex-col font-sans">
        <header className="bg-gray-800/50 border-b border-gray-700 p-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                 <h1 className="text-xl font-bold text-sky-400">Gemini File Analyzer</h1>
                 <span className="text-xs text-gray-400">{saveStatus}</span>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={handleResetWorkspace} className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-500 transition-colors cursor-pointer">
                    Reset Workspace
                </button>
                <label className="bg-sky-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sky-500 transition-colors cursor-pointer">
                    Upload Files
                    <input type="file" multiple hidden onChange={handleFileUpload} />
                </label>
            </div>
        </header>
        
        {propagationStatus.running && (
            <div className="bg-sky-900/50 text-sky-300 p-3 flex items-center justify-center text-sm gap-2 transition-opacity duration-300">
                <SparklesIcon className="w-5 h-5" />
                <span>{propagationStatus.message}</span>
            </div>
        )}

        {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 text-sm relative mx-4 mt-4 rounded-lg flex items-start justify-between">
                <div className="pr-4">
                    <p className="font-semibold mb-1">Analysis Failed</p>
                    <p>{error}</p>
                    {error.toLowerCase().includes('quota') && (
                        <p className="mt-2 text-xs">
                            This indicates you've hit the free tier API limit.
                            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-red-100 ml-1">
                                Learn about billing to increase limits.
                            </a>
                        </p>
                    )}
                </div>
                <button onClick={() => setError(null)} className="p-1 rounded-full hover:bg-red-500/20 transition-colors shrink-0">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
        )}
        
        <main className="flex-grow flex p-4 gap-4 overflow-hidden">
            <aside className="w-1/4 bg-gray-800/50 rounded-lg p-4 overflow-y-auto">
                <h2 className="text-lg font-semibold mb-4 text-gray-300">File Explorer</h2>
                <FileExplorer 
                    nodes={treeData} 
                    onSelectNode={handleSelectNode} 
                    onRemoveNode={handleRemoveNode}
                    selectedNodeId={selectedFile?.id} 
                />
            </aside>
            <section className="w-1/2 flex flex-col gap-4">
                 <FilePreview file={selectedFile} />
            </section>
            <aside className="w-1/4">
                <AnalysisPanel 
                    file={selectedFile} 
                    onUpdateFileName={handleUpdateFileName}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    onPropagateTag={handlePropagateTag}
                    isLoading={isLoading} 
                />
            </aside>
        </main>
    </div>
  );
}

export default App;