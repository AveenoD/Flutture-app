"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Clock, Download, ChevronUp, ChevronDown, Volume2, Plus } from "lucide-react";
import { GenericList } from "@/components/ui/lists/GenericList";

export type CallRecording = {
  id: string;
  title: string;
  duration: string;
  createdAt: string;
  transcription?: string;
  audioUrl?: string;
};

type CallRecordingListProps = {
  title?: string;
  recordings: CallRecording[];
  maxItems?: number;
  onPlay?: (recording: CallRecording) => void;
  onDownload?: (recording: CallRecording) => void;
  onAddRecording?: () => void;
  className?: string;
};

// Individual Call Recording Card with Audio Player and Transcription
function CallRecordingCard({
  recording,
  onPlay,
  onDownload,
}: {
  recording: CallRecording;
  onPlay?: (recording: CallRecording) => void;
  onDownload?: (recording: CallRecording) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Parse duration to seconds for progress calculation
  const parseDuration = (duration: string): number => {
    const parts = duration.split(":");
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const totalDuration = parseDuration(recording.duration);
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      onPlay?.(recording);
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    onDownload?.(recording);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate waveform bars (simulated)
  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const height = Math.random() * 60 + 20; // Random height between 20-80
    return (
      <div
        key={i}
        className="w-1 bg-slate-300 rounded-full transition-all"
        style={{ height: `${height}%` }}
      />
    );
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
      {/* Hidden audio element */}
      {recording.audioUrl && (
        <audio
          ref={audioRef}
          src={recording.audioUrl}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setCurrentTime(0);
              audioRef.current.volume = volume;
            }
          }}
        />
      )}

      {/* Header: Date/Time and Download */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock className="w-4 h-4" />
          <span>{recording.createdAt}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">{recording.duration}</span>
          <button
            onClick={handleDownload}
            className="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors"
            aria-label="Download recording"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Audio Player */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--primary-base)] text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all flex-shrink-0"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
            )}
          </button>

          {/* Waveform Visualization */}
          <div className="flex-1 flex items-center gap-0.5 h-10 sm:h-12 bg-slate-50 rounded-lg px-2 sm:px-3 overflow-hidden">
            {waveformBars}
          </div>

          {/* Time Display */}
          <div className="text-xs sm:text-sm font-medium text-slate-700 min-w-[2.5rem] sm:min-w-[3rem] text-right">
            {formatTime(currentTime)}
          </div>

          {/* Volume Control - Icon only, slider on hover (appears above to stay in card) */}
          <div className="relative group flex-shrink-0">
            <button
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Volume control"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            {/* Volume slider - appears on hover above icon */}
            <div className="absolute right-0 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-10 bg-white rounded-lg shadow-lg p-2 border border-slate-200">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value);
                  setVolume(newVolume);
                  if (audioRef.current) {
                    audioRef.current.volume = newVolume;
                  }
                }}
                className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--primary-base) 0%, var(--primary-base) ${volume * 100}%, #e2e8f0 ${volume * 100}%, #e2e8f0 100%)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Progress Bar - Below waveform, aligned with waveform start */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" /> {/* Spacer for play button */}
          <div className="flex-1 h-0.5 sm:h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary-base)] transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="w-8 flex-shrink-0" /> {/* Spacer for time and volume */}
        </div>
      </div>

      {/* Transcription Section */}
      {recording.transcription && (
        <div className="border-t border-slate-200 pt-4">
          <button
            onClick={() => setIsTranscriptionOpen(!isTranscriptionOpen)}
            className="w-full flex items-center justify-between text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            <span>Transcribe</span>
            {isTranscriptionOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isTranscriptionOpen && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed">
              {recording.transcription}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CallRecordingList({
  title = "Call Recordings",
  recordings,
  maxItems = 5,
  onPlay,
  onDownload,
  onAddRecording,
  className = "",
}: CallRecordingListProps) {
  const displayRecordings = recordings.slice(0, maxItems);

  const handleAddRecording = () => {
    // Future: Implement add recording functionality
    if (onAddRecording) {
      onAddRecording();
    } else {
      console.log("Add recording clicked - functionality to be implemented");
    }
  };

  if (recordings.length === 0) {
    return (
      <div className={className}>
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          )}
          <button
            onClick={handleAddRecording}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-700 flex items-center justify-center transition-colors"
            aria-label="Add recording"
            title="Add Recording (Coming soon)"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-slate-500 text-center py-8">
          No call recordings available
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        {title && (
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        )}
        <button
          onClick={handleAddRecording}
          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-700 flex items-center justify-center transition-colors"
          aria-label="Add recording"
          title="Add Recording (Coming soon)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-4">
        {displayRecordings.map((recording) => (
          <CallRecordingCard
            key={recording.id}
            recording={recording}
            onPlay={onPlay}
            onDownload={onDownload}
          />
        ))}
      </div>
    </div>
  );
}


