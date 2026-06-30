"use client";

import { useState } from "react";
import { Play, Pause, SpeakerHigh, CaretDown, CaretUp } from "phosphor-react";

export interface CallRecordingData {
  timestamp: string;
  duration: string;
  currentTime: string;
  transcription: string;
}

export interface CallRecordingCardProps {
  recording: CallRecordingData;
  onDownload?: () => void;
  className?: string;
  showTitle?: boolean;
}

export function CallRecordingCard({
  recording,
  onDownload,
  className = "",
  showTitle = false,
}: CallRecordingCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleTranscription = () => {
    setShowTranscription(!showTranscription);
  };

  return (
    <div className={className}>
      {showTitle && (
        <h2 className="text-base sm:text-lg lg:text-xl font-bold text-[#2D3748] mb-4 sm:mb-5 lg:mb-6">
          Calls Recording
        </h2>
      )}
      <div className="bg-white rounded-xl border border-[#E3E6F0] p-4 sm:p-5 lg:p-6 xl:p-7 shadow-sm hover:shadow-md hover:border-slate-300 transition-shadow transition-colors">
        {/* Time Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-3 text-xs sm:text-sm text-[#718096]">
          <span className="truncate">🕒 {recording.timestamp}</span>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
            <button
              onClick={onDownload}
              className="w-4 h-4 sm:w-5 sm:h-5 bg-[var(--primary-base)] text-white rounded-full flex items-center justify-center text-[8px] sm:text-[10px] hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
              aria-label="Download recording"
            >
              ↓
            </button>
            <span className="whitespace-nowrap">{recording.duration}</span>
          </div>
        </div>

        {/* Audio Player */}
        <div className="bg-[#F8F9FC] rounded-full px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <button
            onClick={togglePlay}
            className="w-7 h-7 sm:w-8 sm:h-8 bg-[var(--primary-base)] text-white rounded-full flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors flex-shrink-0 active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause size={14} weight="fill" className="sm:w-4 sm:h-4" />
            ) : (
              <Play size={14} weight="fill" className="ml-0.5 sm:w-4 sm:h-4" />
            )}
          </button>
          <div
            className="flex-1 h-4 sm:h-5 rounded-sm min-w-0"
            style={{
              background: "repeating-linear-gradient(90deg, #CBD5E0 0px, #CBD5E0 2px, transparent 2px, transparent 4px)",
            }}
          ></div>
          <span className="text-[10px] sm:text-xs text-[#718096] flex-shrink-0 whitespace-nowrap">
            {recording.currentTime}
          </span>
          <button
            className="text-base sm:text-lg cursor-pointer hover:opacity-70 transition-opacity flex-shrink-0 active:scale-95"
            aria-label="Volume"
          >
            <SpeakerHigh size={16} weight="regular" className="sm:w-[18px] sm:h-[18px]" />
          </button>
        </div>

        {/* Transcription Toggle */}
        <button
          onClick={toggleTranscription}
          className="text-xs sm:text-sm font-semibold text-[var(--primary-base)] flex items-center gap-1 hover:opacity-80 transition-opacity active:scale-95"
        >
          Transcribe {showTranscription ? <CaretUp size={14} className="sm:w-4 sm:h-4" /> : <CaretDown size={14} className="sm:w-4 sm:h-4" />}
        </button>

        {/* Transcription Box */}
        {showTranscription && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[#E3E6F0] text-xs sm:text-sm text-[#718096] leading-relaxed">
            {recording.transcription}
          </div>
        )}
      </div>
    </div>
  );
}

