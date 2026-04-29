export interface LlmIntentOutput {
  intent: string;
  entities: Record<string, any>;
}
