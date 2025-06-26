// topic-simplifier.ts
'use server';
/**
 * @fileOverview A topic simplification AI agent.
 *
 * - simplifyTopic - A function that handles the topic simplification process.
 * - SimplifyTopicInput - The input type for the simplifyTopic function.
 * - SimplifyTopicOutput - The return type for the simplifyTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimplifyTopicInputSchema = z.object({
  topic: z.string().describe('The complex topic to simplify.'),
});
export type SimplifyTopicInput = z.infer<typeof SimplifyTopicInputSchema>;

const SimplifyTopicOutputSchema = z.object({
  summary: z.string().describe('A simplified summary of the topic suitable for students.'),
  animationScenario: z.string().describe('A scenario for an animation that explains the topic.'),
});
export type SimplifyTopicOutput = z.infer<typeof SimplifyTopicOutputSchema>;

export async function simplifyTopic(input: SimplifyTopicInput): Promise<SimplifyTopicOutput> {
  return simplifyTopicFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simplifyTopicPrompt',
  input: {schema: SimplifyTopicInputSchema},
  output: {schema: SimplifyTopicOutputSchema},
  prompt: `You are an expert educator specializing in simplifying complex topics for students.

You will use the following topic to create a simplified summary and an animation scenario that explains the topic.

Topic: {{{topic}}}

Summary:
{{summary}}

Animation Scenario:
{{animationScenario}}`,
});

const simplifyTopicFlow = ai.defineFlow(
  {
    name: 'simplifyTopicFlow',
    inputSchema: SimplifyTopicInputSchema,
    outputSchema: SimplifyTopicOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
