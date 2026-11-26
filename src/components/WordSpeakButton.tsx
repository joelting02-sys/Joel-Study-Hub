import React, { useEffect, useState } from 'react';
import { Loader2, Play, Volume2 } from 'lucide-react';
import {
  getSpeechState,
  makeSpeechKey,
  speakWord,
  subscribeSpeechState,
  type SpeechState,
} from '../lib/speech';
import type { SpeechAccent, SpeechEngine, SpeechRate } from '../types/studyhub';

interface WordSpeakButtonProps {
  text: string;
  accent: SpeechAccent;
  rate: SpeechRate;
  engine: SpeechEngine;
  size?: 'xs' | 'sm';
  title?: string;
  className?: string;
}

export const WordSpeakButton: React.FC<WordSpeakButtonProps> = ({
  text,
  accent,
  rate,
  engine,
  size = 'xs',
  title,
  className = '',
}) => {
  const [speechState, setSpeechState] = useState<SpeechState>(getSpeechState);

  useEffect(() => subscribeSpeechState(setSpeechState), []);

  const myKey = makeSpeechKey(text, accent);
  const isActive = speechState.speakingKey === myKey && speechState.status !== 'idle';
  const isLoading = isActive && speechState.status === 'loading';
  const isPlaying = isActive && speechState.status === 'playing';

  const dimClass = size === 'sm' ? 'h-7 w-7' : 'h-6 w-6';
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  return (
    <button
      type="button"
      data-study-speak="true"
      aria-label={title || `朗读 ${text}`}
      title={title || `点我朗读 (${accent === 'en-GB' ? '英音' : '美音'})`}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void speakWord(text, { accent, rate, engine });
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${dimClass} ${
        isActive
          ? 'border-blue-500 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-500'
          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-300'
      } ${className}`}
    >
      {isLoading ? (
        <Loader2 className={`${iconClass} animate-spin`} />
      ) : isPlaying ? (
        <Volume2 className={`${iconClass} animate-pulse`} />
      ) : (
        <Play className={`${iconClass} translate-x-[0.5px] fill-current`} />
      )}
    </button>
  );
};
