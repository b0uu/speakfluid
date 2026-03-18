export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  icon: string;
  targetExchanges: number;
  tutorRole: string;
  userRole: string;
  situation: string;
  openingLine: string;
  keyVocabulary: string[];
  grammarFocus: string;
  completionTrigger: string;
}

export enum AudioState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  TRANSCRIBING = 'TRANSCRIBING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
}

export type MessageRole = 'tutor' | 'user';
export type MessageType = 'normal' | 'correction' | 'completion' | 'user-input' | 'user-retry';

export interface Message {
  id: string;
  role: MessageRole;
  type: MessageType;
  timestamp: number;
  content: string;
  spanishText?: string;
  englishText?: string;
  correctionExplanation?: string;
  retryPrompt?: string;
  summaryText?: string;
  narratorText?: string;
}

export interface ParsedTutorResponse {
  type: 'normal' | 'correction' | 'completion';
  spanishText?: string;
  englishText?: string;
  correctionExplanation?: string;
  retryPrompt?: string;
  summaryText?: string;
  narratorText?: string;
}

export interface Exchange {
  id: string;
  index: number;
  tutorMessage: Message;
  userMessage?: Message;
  correction?: Message;
  userRetry?: Message;
  narratorText?: string;
}

export interface ApiKeys {
  openai: string;
  elevenlabs: string;
}
