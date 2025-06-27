'use server';
/**
 * @fileOverview A topic simplification AI agent that can generate animations or diagrams.
 *
 * - simplifyTopicGetScript - Generates a summary and scene descriptions for a topic.
 * - simplifyTopicAsDiagram - Generates a single diagram for a topic.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { generateSvg } from '@/ai/actions/generate-svg';
import { 
    SimplifyTopicInputSchema, 
    TopicAnimationScriptSchema, 
    type SimplifyTopicInput,
    type TopicAnimationScript,
    type SimplifyTopicDiagramOutput
} from '@/ai/schemas';


const topicAnimationScriptPrompt = ai.definePrompt({
  name: 'topicAnimationScriptPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: TopicAnimationScriptSchema},
  prompt: `You are an expert educator. Your responses must be in Turkish. Take the following topic and create:
1.  A simplified summary of the topic.
2.  A list of 3 to 5 single-sentence scene descriptions for an educational animation. These descriptions should be literal and concrete, describing tangible scenes with recognizable people and objects that an illustrator can draw. For example, for "severance pay", describe "A smiling person receiving a bag of money from a business person in front of an office building." Avoid abstract concepts.

Topic: {{{topic}}}
`,
});


const topicDiagramDescriptionPrompt = ai.definePrompt({
  name: 'topicDiagramDescriptionPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: z.string()},
  prompt: `You are an expert educator and visual designer specializing in simplifying complex topics for students. Your responses must be in Turkish.

Your task is to take a topic and create a detailed description for a visual diagram that explains the key concepts and their relationships. This description will be used to generate an SVG. Be very specific about the elements. For example: "Draw a central circle with the text 'Main Idea'. From this circle, draw three arrows pointing to three separate rectangles. Label the first rectangle 'Concept A', the second 'Concept B', and the third 'Concept C'." The diagram should be structured like a flowchart or a mind map.

Topic: {{{topic}}}
`,
});


// EXPORTED FUNCTIONS
export async function simplifyTopicGetScript(input: SimplifyTopicInput): Promise<TopicAnimationScript> {
  try {
    const { output: script } = await topicAnimationScriptPrompt(input);
    if (!script || !script.scenes || script.scenes.length === 0) {
      console.error("Failed to generate animation script for topic.");
      return {
          summary: "Konu özeti oluşturulamadı. Lütfen farklı bir konuyla tekrar deneyin.",
          scenes: []
      };
    }
    return script;
  } catch(error) {
    console.error("Crashed in simplifyTopicGetScript flow:", error);
    return {
        summary: "Konu basitleştirilirken beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        scenes: []
    };
  }
}

export async function simplifyTopicAsDiagram(input: SimplifyTopicInput): Promise<SimplifyTopicDiagramOutput> {
  try {
    const { output: diagramDescription } = await topicDiagramDescriptionPrompt(input);
    const svgCode = await generateSvg(diagramDescription || "");
    return { svg: svgCode };
  } catch(error) {
    console.error("Crashed in simplifyTopicAsDiagram flow:", error);
    const fallbackSvg = await generateSvg("");
    return { svg: fallbackSvg };
  }
}
