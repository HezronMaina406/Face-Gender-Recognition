
import { GoogleGenAI, Type } from '@google/genai';
import type { KnownPerson, RecognitionOptions, DetectedFace } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const base64ToGenerativePart = (base64: string, mimeType: string = 'image/jpeg') => {
    return {
        inlineData: { data: base64.split(',')[1], mimeType }
    };
}


export const detectAndRecognizeFaces = async (
  mainImage: File | string, // Can be a File object or a base64 string
  knownPeople: KnownPerson[],
  options: RecognitionOptions
): Promise<{ faces: DetectedFace[], personCount: number }> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const genderPrompt = options.recognizeGender ? "For each face, also determine the apparent gender (e.g., 'Male', 'Female')." : "";
  const promptText = `
    Analyze the primary image. Your task is to perform face detection and recognition.
    1. Detect all human faces and provide their bounding box coordinates (x, y, width, height) as percentages of the image dimensions, from 0.0 to 1.0.
    2. Compare each detected face against the provided reference images of known people.
    3. If a face in the primary image strongly matches a reference image, label it with that person's name from the reference. Otherwise, label it as 'Unknown'.
    4. Provide a confidence score from 0.0 to 1.0 for each recognition. For 'Unknown' faces, this can be the detection confidence.
    ${genderPrompt}
    5. Provide a total count of all detected persons.
    6. Respond ONLY with a single JSON object. Do not include markdown formatting or any other text.
  `;
  
  const properties: any = {
      box: {
        type: Type.OBJECT,
        properties: {
          x: { type: Type.NUMBER },
          y: { type: Type.NUMBER },
          width: { type: Type.NUMBER },
          height: { type: Type.NUMBER },
        },
      },
      name: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
  };
    
  if (options.recognizeGender) {
      properties.gender = { type: Type.STRING };
  }
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
        faces: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: properties,
            },
        },
        personCount: {
            type: Type.INTEGER,
        }
    }
  };

  const mainImagePart = typeof mainImage === 'string' 
    ? base64ToGenerativePart(mainImage)
    : await fileToGenerativePart(mainImage);
    
  const contents = [
      { text: promptText },
      { text: "Primary image to analyze:"},
      mainImagePart,
      ...knownPeople.flatMap(person => [
          { text: `Reference image for ${person.name}:` },
          base64ToGenerativePart(person.image)
      ])
  ];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);
    return {
        faces: result.faces || [],
        personCount: result.personCount || 0
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Failed to analyze image with Gemini API.');
  }
};
