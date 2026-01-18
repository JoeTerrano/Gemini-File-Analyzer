import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, FileNode } from "../types";

// Fix: Initialize the GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Fix: Use a recommended model for text tasks
const model = 'gemini-2.5-flash';

// Fix: Define a JSON schema for the desired analysis output
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A concise summary of the document's content, no more than 3-4 sentences.",
    },
    suggestedName: {
      type: Type.STRING,
      description: "A short, descriptive file name based on the content, using kebab-case (e.g., 'meeting-notes-project-alpha.txt'). Include the original extension if present.",
    },
    tags: {
      type: Type.ARRAY,
      description: "A list of 3-5 relevant keywords or tags.",
      items: {
        type: Type.STRING,
      },
    },
    documentType: {
      type: Type.STRING,
      description: "The type of document (e.g., 'Invoice', 'Meeting Notes', 'Contract', 'Code Snippet', 'Image', 'Receipt').",
    },
  },
  required: ['summary', 'suggestedName', 'tags', 'documentType'],
};

export const analyzeFile = async (fileName: string, content: string, mimeType: string): Promise<AnalysisResult> => {
  const isImage = mimeType.startsWith('image/');
  
  const prompt = `Analyze the following document named "${fileName}". Based on its content, provide a detailed analysis in JSON format according to the provided schema.`;
  
  // Fix: Construct the request payload for text or image content
  const contents = isImage 
    ? {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: content, // content is base64 for images
              mimeType: mimeType,
            },
          },
        ],
      }
    : {
        parts: [
            { text: `--- Document: ${fileName} ---\n\n${content}\n\n--- End of Document ---` },
            { text: prompt },
        ]
    };

  try {
    // Fix: Call the Gemini API to generate content with the specified config
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
      },
    });

    // Fix: Extract and parse the JSON response
    const jsonString = response.text;
    const result = JSON.parse(jsonString) as AnalysisResult;
    return result;

  } catch (error: any) {
    console.error("Error analyzing file with Gemini:", error);
    const message = error?.message || error.toString();
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429') || message.toLowerCase().includes('quota')) {
        throw new Error("API quota exceeded. Please check your plan and billing details. For continued use, you may need to enable billing on your project.");
    }
    throw new Error("Failed to get analysis from Gemini API. Please check your API key and network connection.");
  }
};

export const compareImages = async (sourceImage: FileNode, targetImage: FileNode): Promise<boolean> => {
  const prompt = "The user has tagged the primary subject in the first image. Does the second image contain the exact same primary subject? Please answer with a simple JSON object: {\"match\": boolean}.";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: sourceImage.content,
              mimeType: sourceImage.mimeType,
            },
          },
          {
            inlineData: {
              data: targetImage.content,
              mimeType: targetImage.mimeType,
            },
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            match: { type: Type.BOOLEAN },
          },
          required: ['match'],
        },
      },
    });

    const jsonString = response.text;
    const result = JSON.parse(jsonString) as { match: boolean };
    return result.match;

  } catch (error: any) {
    console.error("Error comparing images with Gemini:", error);
    const message = error?.message || error.toString();
    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429') || message.toLowerCase().includes('quota')) {
       console.error("Gemini API quota exceeded during image comparison. The comparison will be skipped.");
    }
    // Return false on error to avoid incorrect tagging
    return false;
  }
};