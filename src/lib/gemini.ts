import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type QuestionType = 'MCQ' | 'Assertion-Reason' | 'Statement-Based' | 'Matching';

export interface GeneratedQuestion {
  id?: string;
  type?: QuestionType;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  thoughtProcess?: string;
  reason?: string;
  statement2?: string;
  matchingPairs?: { left: string; right: string }[];
}

export async function generateQuizFromText(
  text: string, 
  count: number = 5, 
  difficulty: string = 'Medium',
  questionTypes: QuestionType[] = ['MCQ', 'Assertion-Reason', 'Statement-Based', 'Matching'],
  imageData?: { data: string; mimeType: string }
): Promise<GeneratedQuestion[]> {
  const prompt = `You are an expert NEET (National Eligibility cum Entrance Test) exam paper setter. 
    Generate a high-quality, FACTUALLY ACCURATE quiz with ${count} questions based on the provided content.
    
    CRITICAL INSTRUCTIONS:
    1. FACTUAL ACCURACY: Every question and answer MUST be scientifically and factually correct based on the provided content or general medical/biological knowledge.
    2. TRICKY & CONCEPTUAL: Questions should be challenging and test deep understanding. 
       - Use "Word-Swap" techniques: Change one critical word in a statement (e.g., "always" to "usually", "increase" to "decrease", "primary" to "secondary", "direct" to "indirect", "except" to "including") to create tricky options.
       - Focus on exceptions, specific conditions, and nuanced differences.
       - For Statement-Based questions, make statements that look correct at first glance but have a subtle error or are common misconceptions.
       - Ensure that the "incorrect" options are plausible and not obviously wrong.
    3. CORRECT ANSWER INDEX: The 'correctAnswer' field MUST be the EXACT index (0, 1, 2, or 3) of the correct option in the 'options' array.
    4. EXPLANATION: Provide a clear, logical explanation for why the chosen answer is correct and why others are incorrect.
    5. NO HALLUCINATION: Do not create false facts. If the content is insufficient, use your internal knowledge of Biology/Chemistry/Physics to supplement NEET-level questions.
    6. MATCHING LOGIC: For 'Matching' questions:
       - List I (A, B, C, D) and List II (1, 2, 3, 4) must have clear relationships.
       - Construct the 'options' such that only ONE option correctly matches all 4 pairs.
       - DOUBLE CHECK the 'correctAnswer' index. If Option A is correct, correctAnswer must be 0. If Option B is correct, correctAnswer must be 1, and so on.
    7. DOUBLE CHECK: Before finalizing, verify that the 'correctAnswer' index actually points to the correct option.

    Content: ${text}
    Difficulty: ${difficulty}

    ONLY generate the following question types: ${questionTypes.join(', ')}.
    
    Instructions for each type:
    - MCQ: Standard multiple choice.
    - Assertion-Reason:
       - Assertion (A) and Reason (R) must be clearly stated.
       - Options MUST be:
         0: Both (A) and (R) are true and (R) is the correct explanation of (A).
         1: Both (A) and (R) are true but (R) is not the correct explanation of (A).
         2: (A) is true but (R) is false.
         3: (A) is false but (R) is true.
    - Statement-Based:
       - Statement I and Statement II must be clearly stated.
       - Options MUST be:
         0: Both Statement I and Statement II are correct.
         1: Both Statement I and Statement II are incorrect.
         2: Statement I is correct and Statement II is incorrect.
         3: Statement I is incorrect and Statement II is correct.
    - Matching:
       - Provide 'matchingPairs' with 4 pairs (left: List I, right: List II).
       - Options should be formatted like "A-I, B-II, C-III, D-IV" or "(A)-(i), (B)-(ii), (C)-(iii), (D)-(iv)".
       - Ensure the 'correctAnswer' index points to the option that correctly matches List I with List II.

    Ensure exactly 4 options for every question.`;

  const contents: any[] = [{ text: prompt }];
  if (imageData) {
    contents.push({
      inlineData: {
        data: imageData.data,
        mimeType: imageData.mimeType
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: contents },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { 
              type: Type.STRING,
              enum: ['MCQ', 'Assertion-Reason', 'Statement-Based', 'Matching']
            },
            question: { type: Type.STRING },
            reason: { type: Type.STRING, description: "Required for Assertion-Reason" },
            statement2: { type: Type.STRING, description: "Required for Statement-Based" },
            matchingPairs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  left: { type: Type.STRING },
                  right: { type: Type.STRING }
                },
                required: ["left", "right"]
              },
              description: "Required for Matching type (4 pairs)"
            },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              minItems: 4,
              maxItems: 4
            },
            correctAnswer: { 
              type: Type.INTEGER,
              description: "Index of the correct option (0-3)"
            },
            thoughtProcess: {
              type: Type.STRING,
              description: "Internal reasoning to determine the correct answer and verify the index. (Not shown to user)"
            },
            explanation: { type: Type.STRING }
          },
          required: ["type", "question", "options", "correctAnswer", "explanation", "thoughtProcess"]
        }
      }
    }
  });

  try {
    const result = JSON.parse(response.text || "[]");
    return result.map((q: any) => ({
      ...q,
      id: crypto.randomUUID()
    }));
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    throw new Error("Failed to generate quiz questions. Please try again.");
  }
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchPdfs(query: string): Promise<SearchResult[]> {
  const prompt = `Find high-quality educational PDF documents related to: "${query}". 
    Focus on academic resources, textbooks, or detailed study materials.
    Return a list of at least 5 relevant PDF links with their titles and a brief snippet of what they contain.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            url: { type: Type.STRING },
            snippet: { type: Type.STRING }
          },
          required: ["title", "url", "snippet"]
        }
      }
    }
  });

  try {
    const result = JSON.parse(response.text || "[]");
    // Filter for PDF links if possible, though the prompt already asks for them
    return result.filter((item: SearchResult) => item.url.toLowerCase().endsWith('.pdf') || item.snippet.toLowerCase().includes('pdf'));
  } catch (error) {
    console.error("Failed to parse search results:", error);
    return [];
  }
}

export async function identifyTopics(text: string): Promise<string[]> {
  const prompt = `Analyze the following text and identify the main educational topics or sub-topics covered. 
    Return a list of 5-10 specific topics that could be used to generate quiz questions.
    
    Text: ${text.substring(0, 15000)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Failed to parse topics:", error);
    return [];
  }
}
