import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

// Ensure the API key is available on the server
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// These enums are duplicated from the frontend to avoid complex import paths in the serverless function
const eras = [
  "Prehistoric", "Ancient", "Classical", "Renaissance", "19th Century",
  "20th Century", "Late 20th Century", "21st Century",
];
const nodeTypes = ["Discipline", "Process"];
const categories = ["Visual", "Narrative", "Auditory", "Kinesthetic", "Hybrid", "Process"];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { task, payload } = req.body;

    switch (task) {
      case 'fillDetails': {
        const { nodeInfo } = payload;
        const prompt = `You are an expert in art history and the ontology of creative disciplines.
        A user is adding a new concept to an ontology graph. Based on the provided name and/or description, please fill in the details for this concept.
        Provided Info:
        - Name: ${nodeInfo.id}
        - Description: ${nodeInfo.description}
        Your task is to return a JSON object with the following fields completed: 'type', 'category', 'era', and a refined, well-written 'description'.
        Constraints for the fields:
        - 'type' must be one of: ${nodeTypes.join(', ')}.
        - 'category' must be one of: ${categories.join(', ')}.
        - 'era' must be one of: ${eras.join(', ')}.
        - 'description' should be a concise, encyclopedic definition of the concept. If a description was provided, refine and expand upon it.
        Return only the JSON object.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: nodeTypes },
                        category: { type: Type.STRING, enum: categories },
                        era: { type: Type.STRING, enum: eras },
                        description: { type: Type.STRING }
                    },
                    required: ['type', 'category', 'era', 'description']
                }
            }
        });
        
        return res.status(200).json(JSON.parse(response.text.trim()));
      }

      case 'suggestConnections': {
        const { newNode, allNodeIds } = payload;
        const prompt = `You are an expert in art history and the ontology of creative disciplines.
        Your task is to identify connections between creative concepts.
        Given the following new creative concept:
        - Name: ${newNode.id}
        - Description: ${newNode.description}
        - Category: ${newNode.category}
        - Era: ${newNode.era}
        - Type: ${newNode.type}
        And the following list of existing concepts in the ontology:
        [${allNodeIds.join(', ')}]
        Identify the most relevant concepts from the existing list that are direct influences or parents of the new concept.
        Return a JSON object with a single key "connections" which is an array of strings. Each string must be an exact ID from the existing concepts list.
        Only suggest up to 5 of the most relevant connections.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                connections: {
                  type: Type.ARRAY,
                  description: "List of IDs of existing nodes that should be connected to the new node.",
                  items: { type: Type.STRING }
                }
              }
            }
          }
        });

        return res.status(200).json(JSON.parse(response.text.trim()));
      }

      case 'startExpansion': {
        const { node, existingNodeIds } = payload;
        const prompt = `You are an expert in art history and the ontology of creative disciplines.
        Based on the creative concept "${node.id}: ${node.description}", suggest up to 3 new, related concepts that are missing from the ontology.
        Do NOT suggest any concepts that already exist in this list: [${existingNodeIds.join(', ')}].
        For each new suggestion, provide a unique 'id', a brief 'description', a 'type', a 'category', and an 'era'.
        - 'type' must be one of: ${nodeTypes.join(', ')}.
        - 'category' must be one of: ${categories.join(', ')}.
        - 'era' must be one of these: ${eras.join(', ')}.
        Also provide a 'connections' array listing IDs from the existing list that the new node should link to. Always include a connection to the original node, "${node.id}".
        Return a JSON object with a single key "suggestions", which is an array of these new node objects.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: nodeTypes },
                                    category: { type: Type.STRING, enum: categories },
                                    era: { type: Type.STRING, enum: eras },
                                    connections: { type: Type.ARRAY, items: { type: Type.STRING } },
                                }
                            }
                        }
                    }
                }
            }
        });
        
        return res.status(200).json(JSON.parse(response.text.trim()));
      }

      default:
        return res.status(400).json({ error: 'Invalid task' });
    }
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({ error: 'Failed to process AI request.', details: errorMessage });
  }
}
