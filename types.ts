
import React from 'react';

export type SentimentType = 'Positive' | 'Negative' | 'Neutral';
export type ProviderType = 'flash' | 'pro' | 'compare';

export interface SentimentAnalysis {
  provider: string;
  sentiment: SentimentType;
  confidence: number;
  keywords: string[];
  explanation: string;
}

export interface SentimentResult {
  id: string;
  text: string;
  timestamp: string;
  analyses: SentimentAnalysis[]; // Support multiple analyses for comparison
}

export interface BatchAnalysis {
  id: string;
  name: string;
  results: SentimentResult[];
  date: string;
}

export interface MetricCard {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
}
