export * from './types';
export { geminiProvider, GeminiProvider } from './gemini';
export { claudeProvider, ClaudeProvider } from './claude';

import { geminiProvider } from './gemini';
import { claudeProvider } from './claude';
import type { LLMProvider } from './types';

export type ModelType = 'gemini' | 'claude';

export function getProvider(model: ModelType): LLMProvider {
	switch (model) {
		case 'gemini':
			return geminiProvider;
		case 'claude':
			return claudeProvider;
		default:
			throw new Error(`Unknown model: ${model}`);
	}
}
