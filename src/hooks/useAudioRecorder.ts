"use client";

import { useCallback, useRef, useState } from "react";

export type RecorderStatus = "idle" | "requesting" | "recording" | "stopped";

interface UseAudioRecorderResult {
  status: RecorderStatus;
  audioBlob: Blob | null;
  mimeType: string | null;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  /** Reads the current time-domain waveform data. Returns null when not recording. */
  getWaveformData: () => Uint8Array | null;
}

/**
 * Candidate MIME types in preference order. Modern Chrome/Firefox/Android
 * support opus-in-webm. Older iOS Safari (< 14.3) only supports MP4/AAC and
 * has no MediaRecorder support at all before iOS 14.3.
 */
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
];

function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/**
 * Encapsulates all MediaRecorder + getUserMedia logic, plus a Web Audio
 * API AnalyserNode for driving a live waveform visualization. Microphone
 * permission is only requested when `start()` is called in direct
 * response to user interaction.
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    analyserRef.current = null;
    waveformBufferRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setStatus("requesting");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone access is not supported on this device.");
      setStatus("idle");
      return;
    }

    const supportedType = pickSupportedMimeType();
    if (!supportedType) {
      setError("Audio recording is not supported in this browser.");
      setStatus("idle");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up an analyser for the live waveform visualization.
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      waveformBufferRef.current = new Uint8Array(analyser.frequencyBinCount);

      const recorder = new MediaRecorder(stream, { mimeType: supportedType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: supportedType });
        setAudioBlob(blob);
        setMimeType(supportedType);
        setStatus("stopped");
        stopTracks();
      };

      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
        setStatus("idle");
        stopTracks();
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
    } catch {
      setError("Microphone access was denied.");
      setStatus("idle");
      stopTracks();
    }
  }, [stopTracks]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setAudioBlob(null);
    setMimeType(null);
    setError(null);
    chunksRef.current = [];
  }, []);

  const getWaveformData = useCallback((): Uint8Array | null => {
    const analyser = analyserRef.current;
    const buffer = waveformBufferRef.current;
    if (!analyser || !buffer) return null;
    analyser.getByteTimeDomainData(buffer);
    return buffer;
  }, []);

  return {
    status,
    audioBlob,
    mimeType,
    error,
    start,
    stop,
    reset,
    getWaveformData,
  };
}
