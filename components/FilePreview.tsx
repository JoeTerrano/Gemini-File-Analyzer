
import React from 'react';
import { FileNode } from '../types';

interface FilePreviewProps {
  file: FileNode | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file }) => {
  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-800 rounded-lg">
        <p className="text-gray-400">Select a file to see its preview</p>
      </div>
    );
  }
  
  const isImage = file.mimeType.startsWith('image/');

  return (
    <div className="bg-gray-800 p-6 rounded-lg h-full overflow-auto">
      <h2 className="text-xl font-bold mb-4 pb-2 border-b border-gray-600">{file.name}</h2>
      {isImage ? (
         <img src={`data:${file.mimeType};base64,${file.content}`} alt={file.name} className="max-w-full max-h-full object-contain mx-auto" />
      ) : (
        <pre className="text-sm whitespace-pre-wrap break-words text-gray-300">
          {file.content}
        </pre>
      )}
    </div>
  );
};

export default FilePreview;
