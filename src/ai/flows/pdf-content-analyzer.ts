'use server';

/**
 * @fileOverview This flow analyzes PDF content to extract key concepts and create a simplified summary.
 *
 * - analyzePdfContent - A function that handles the PDF content analysis and summarization process.
 * - AnalyzePdfContentInput - The input type for the analyzePdfContent function.
 * - AnalyzePdfContentOutput - The return type for the analyzePdfContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePdfContentInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'The PDF document content as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected typo here
    ),
});
export type AnalyzePdfContentInput = z.infer<typeof AnalyzePdfContentInputSchema>;

const AnalyzePdfContentOutputSchema = z.object({
  summary: z.string().describe('A simplified, animated summary of the PDF content.'),
});
export type AnalyzePdfContentOutput = z.infer<typeof AnalyzePdfContentOutputSchema>;

export async function analyzePdfContent(input: AnalyzePdfContentInput): Promise<AnalyzePdfContentOutput> {
  return analyzePdfContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'pdfContentAnalyzerPrompt',
  input: {schema: AnalyzePdfContentInputSchema},
  output: {schema: AnalyzePdfContentOutputSchema},
  prompt: `You are an expert educator skilled at simplifying complex topics.

  Analyze the content of the following PDF document and create a simplified summary suitable for creating an educational animation. Focus on extracting the key concepts and structuring the summary in a way that is easy to visualize.

  PDF Content: {{media url=pdfDataUri}}`,
});

const analyzePdfContentFlow = ai.defineFlow(
  {
    name: 'analyzePdfContentFlow',
    inputSchema: AnalyzePdfContentInputSchema,
    outputSchema: AnalyzePdfContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
