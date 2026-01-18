
export interface AnalysisResult {
  summary: string;
  suggestedName: string;
  tags: string[];
  documentType: string;
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file';
  content: string; // base64 for images, text for others
  mimeType: string;
  analysis?: AnalysisResult;
  path: string;
}

export interface FolderNode {
  id: string;
  name: string;
  type: 'folder';
  children: TreeNode[];
  path: string;
}

export type TreeNode = FileNode | FolderNode;
