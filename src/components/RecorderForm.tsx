"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Check, Play, Pause, Trash2, Mic } from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { submitRecording, InvalidSpeakerError } from "@/lib/submit-recording";
import Waveform from "@/components/Waveform";
import type { Prompt } from "@/lib/types";
import { getTranslation, type Translation } from "@/lib/i18n";

type Phase = "idle" | "recording" | "review" | "uploading" | "success";

interface RecorderFormProps {
  language: string;
  prompts: Prompt[];
  speakerId: string;
  speakerName?: string | null;
  initialCompletedCount?: number;
  /**
   * Called when the server reports that this speakerId no longer exists
   * (e.g. deleted via the admin panel, or a stale localStorage value
   * from a reset dev database). The parent should clear the stored
   * speaker id and send the visitor back through onboarding.
   */
  onInvalidSpeaker: () => void;
  onChangeUser: () => void;
}

export default function RecorderForm({
  language,
  prompts,
  speakerId,
  speakerName,
  initialCompletedCount = 0,
  onInvalidSpeaker,
  onChangeUser, // Destructure here
}: RecorderFormProps) {
  const t = getTranslation(language);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const completedCount = initialCompletedCount + savedCount;

  const {
    status,
    audioBlob,
    mimeType,
    error,
    start,
    stop,
    reset,
    getWaveformData,
  } = useAudioRecorder();

  const currentPrompt: Prompt | undefined = prompts[currentPromptIndex];

  // Derive the visible phase purely from state: recording while the
  // recorder is live, review once a take exists but hasn't been
  // submitted yet, otherwise whatever `phase` last was explicitly set to.
  const displayPhase: Phase =
    status === "requesting" || status === "recording"
      ? "recording"
      : status === "stopped" && audioBlob && phase === "idle"
        ? "review"
        : phase;

  const handleRecordTap = () => {
    if (displayPhase === "recording") {
      stop();
      return;
    }
    if (!currentPrompt || displayPhase !== "idle") return;
    setSubmitError(null);
    start();
  };

  const handleRedo = useCallback(() => {
    reset();
    setPhase("idle");
  }, [reset]);

  const handleSave = useCallback(() => {
    if (!audioBlob || !mimeType || !currentPrompt) return;
    setPhase("uploading");
    setSubmitError(null);

    submitRecording({
      audioBlob,
      mimeType,
      speakerId,
      promptId: currentPrompt.id,
    })
      .then(() => {
        setPhase("success");
        setSavedCount((prev) => prev + 1);
        setTimeout(() => {
          setCurrentPromptIndex((index) => index + 1);
          setPhase("idle");
          reset();
        }, 1200);
      })
      .catch((err) => {
        if (err instanceof InvalidSpeakerError) {
          onInvalidSpeaker();
          return;
        }
        setSubmitError(err instanceof Error ? err.message : t.somethingWrong);
        setPhase("review");
      });
  }, [
    audioBlob,
    mimeType,
    speakerId,
    currentPrompt,
    reset,
    t,
    onInvalidSpeaker,
  ]);

  if (prompts.length === 0) {
    return (
      <CenteredMessage
        endonym={t.endonym}
        message={t.noPromptsAvailable(t.endonym)}
        speakerName={speakerName}
        completedCount={completedCount}
        t={t}
      />
    );
  }

  if (currentPromptIndex >= prompts.length) {
    return (
      <CenteredMessage
        endonym={t.endonym}
        message={t.allDone}
        speakerName={speakerName}
        completedCount={completedCount}
        t={t}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FDFBF7] dark:bg-[#181615] px-6 text-[#2C2825] dark:text-[#EDE8E1] transition-colors duration-300">
      {/* The Orbiting Satellite Button */}
      <button
        onClick={onChangeUser}
        // dir="auto"
        className="absolute top-6 end-6 text-sm font-semibold text-[#8C827A] dark:text-[#D8D2C9] hover:text-[#2C2825] dark:hover:text-[#FFFFFF] transition-colors duration-300">
        {typeof t.notYou === "function"
          ? t.notYou(speakerName ?? "")
          : t.notYou}
      </button>
      <div className="w-full max-w-xs">
        <div className="space-y-12">
          {/* Header area with soft gratitude greeting, stats, and low-contrast progress counter */}
          <div className="space-y-2 text-center">
            {speakerName && (
              <div className="space-y-0.5" dir="auto">
                {/*
        Clean, readable, single line.
        High contrast text color so it's readable,
        but normal size/weight so it doesn't fight the prompt.
      */}
                <p className="text-base font-medium text-[#2C2825] dark:text-[#EDE8E1]">
                  {t.welcomeThankYou(speakerName)}
                </p>

                <p className="text-xs font-normal text-[#8C827A] dark:text-[#8C827A]">
                  {t.recordedCount(completedCount)}
                </p>
              </div>
            )}

            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#8C827A]">
                {t.endonym} • {currentPromptIndex + 1} / {prompts.length}
              </span>
            </div>
          </div>

          {/* Prompt display with maximum whitespace and organic literary serif typography */}
          <PromptDisplay word={currentPrompt.word_or_phrase} />

          <div className="flex flex-col items-center gap-4">
            {displayPhase === "review" && audioBlob ? (
              <ReviewPanel
                audioBlob={audioBlob}
                t={t}
                onRedo={handleRedo}
                onSave={handleSave}
              />
            ) : (
              <>
                <RecordButton
                  phase={displayPhase}
                  t={t}
                  onTap={handleRecordTap}
                />
                {displayPhase === "recording" && (
                  <Waveform getData={getWaveformData} />
                )}
                <Status phase={displayPhase} t={t} />
              </>
            )}
          </div>
        </div>
      </div>

      {(error || submitError) && (
        <p className="fixed bottom-8 left-1/2 -translate-x-1/2 text-sm text-[#8C827A]">
          {error ?? submitError}
        </p>
      )}

      <Toast show={phase === "success"} text={t.saved} />
    </div>
  );
}

/** Massive, organic, literary serif display of the word/phrase to be pronounced. */
function PromptDisplay({ word }: { word: string }) {
  return (
    <p className="py-6 text-center font-serif text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#2C2825] dark:text-[#FFFFFF]">
      {word}
    </p>
  );
}

function CenteredMessage({
  endonym,
  message,
  speakerName,
  completedCount,
  t,
}: {
  endonym: string;
  message: string;
  speakerName?: string | null;
  completedCount?: number;
  t: Translation;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FDFBF7] dark:bg-[#181615] px-6 text-[#2C2825] dark:text-[#EDE8E1] transition-colors duration-300">
      <div className="w-full max-w-xs space-y-5 text-center">
        {speakerName && (
          <div className="space-y-0.5">
            <p className="text-xs font-normal text-[#8C827A]">
              {t.welcomeThankYou(speakerName)}
            </p>
            {completedCount !== undefined && (
              <p className="text-[11px] font-medium text-[#8C827A]/80">
                {t.recordedCount(completedCount)}
              </p>
            )}
          </div>
        )}
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-[#8C827A]">
            {endonym}
          </span>
          <p className="mt-2 font-serif text-3xl font-medium text-[#2C2825] dark:text-[#EDE8E1]">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

function RecordButton({
  phase,
  t,
  onTap,
}: {
  phase: Phase;
  t: Translation;
  onTap: () => void;
}) {
  const isRecording = phase === "recording";
  const isUploading = phase === "uploading";
  const isSuccess = phase === "success";
  const disabled = isUploading || isSuccess;

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label={isRecording ? t.stopRecording : t.startRecording}
      className={`flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2825] focus-visible:ring-offset-4 disabled:cursor-not-allowed ${
        isRecording
          ? "bg-[#A83820] shadow-md scale-105"
          : disabled
            ? "bg-[#E8E2D9] dark:bg-[#2A2624]"
            : "bg-[#C85A32] hover:bg-[#B54E29] active:scale-95 shadow-sm"
      }`}>
      {isUploading ? (
        <Loader2 className="h-8 w-8 animate-spin text-[#8C827A]" />
      ) : isSuccess ? (
        <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
      ) : isRecording ? (
        <span className="h-7 w-7 animate-pulse rounded-sm bg-white" />
      ) : (
        <Mic className="h-8 w-8 text-white" strokeWidth={2} />
      )}
    </button>
  );
}

/**
 * Explicit review step: play back the take, redo (discard) it, or save it.
 * Nothing is uploaded until "Save" is tapped.
 */
function ReviewPanel({
  audioBlob,
  t,
  onRedo,
  onSave,
}: {
  audioBlob: Blob;
  t: Translation;
  onRedo: () => void;
  onSave: () => void;
}) {
  const audioUrl = useMemo(() => URL.createObjectURL(audioBlob), [audioBlob]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      });
    } else {
      audio.pause();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <button
        type="button"
        onClick={togglePlayback}
        aria-label={isPlaying ? t.pausePlayback : t.playRecording}
        className="flex h-24 w-24 items-center justify-center rounded-full bg-[#2C2825] dark:bg-[#EDE8E1] text-[#FDFBF7] dark:text-[#181615] transition-all duration-300 ease-out active:scale-95 shadow-sm">
        {isPlaying ? (
          <Pause className="h-8 w-8" strokeWidth={2} />
        ) : (
          <Play className="h-8 w-8 translate-x-0.5" strokeWidth={2} />
        )}
      </button>

      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={onRedo}
          aria-label={t.redoRecording}
          className="flex h-12 w-12 items-center justify-center rounded-full text-[#8C827A] hover:text-[#2C2825] dark:hover:text-[#EDE8E1] transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2825] focus-visible:ring-offset-4">
          <Trash2 className="h-6 w-6" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onSave}
          aria-label={t.saveRecording}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#587057] hover:bg-[#495E48] text-white transition-all duration-300 ease-out active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#587057] focus-visible:ring-offset-4 shadow-sm">
          <Check className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>

      <p className="text-sm text-[#8C827A]">{t.playBackRedoOrSave}</p>
    </div>
  );
}

function Status({ phase, t }: { phase: Phase; t: Translation }) {
  const text =
    phase === "recording"
      ? t.recordingTapToStop
      : phase === "uploading"
        ? t.saving
        : phase === "success"
          ? t.saved
          : t.tapToRecord;

  return (
    <p className="text-lg font-medium text-[#8C827A] dark:text-[#D8D2C9]">
      {text}
    </p>
  );
}

function Toast({ show, text }: { show: boolean; text: string }) {
  return (
    <div
      className={`pointer-events-none fixed top-8 left-1/2 -translate-x-1/2 rounded-full border border-[#D2E0D2] bg-[#E8F0E8] px-5 py-2.5 text-sm font-medium text-[#587057] shadow-sm transition-all duration-300 ease-out ${
        show ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}>
      {text}
    </div>
  );
}
