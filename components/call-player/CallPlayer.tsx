"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Gauge, Sparkles } from "lucide-react";
import type { TranscriptLine } from "@/lib/types";

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

interface Props {
  recordingUrl: string | null;
  transcript?: TranscriptLine[] | null;
  durationSeconds?: number | null;
}

export default function CallPlayer({ recordingUrl, transcript, durationSeconds }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [useSynth, setUseSynth] = useState(false);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);

  // Synth timer interval ref
  const synthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = playing;

  // Approximate total duration from transcript if duration is 0
  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setDuration(durationSeconds);
    } else if (transcript && transcript.length > 0) {
      // Estimate ~3.5 seconds per dialogue line
      setDuration(transcript.length * 3.5);
    }
  }, [durationSeconds, transcript]);

  // Speech synthesis line player
  const speakLine = useCallback(
    (index: number) => {
      if (!transcript || index >= transcript.length || !isPlayingRef.current) {
        setPlaying(false);
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        return;
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setPlaying(false);
        return;
      }

      window.speechSynthesis.cancel();

      const line = transcript[index];
      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.rate = rate;
      utterance.volume = volume;

      // Select distinct voices for Agent vs User
      const voices = window.speechSynthesis.getVoices();
      if (line.role === "AI Agent" || /sofia/i.test(line.speaker)) {
        utterance.pitch = 1.15;
        const femaleVoice = voices.find((v) => /female|samantha|victoria|zira|karen/i.test(v.name));
        if (femaleVoice) utterance.voice = femaleVoice;
      } else {
        utterance.pitch = 0.95;
        const maleVoice = voices.find((v) => /male|david|george|daniel/i.test(v.name));
        if (maleVoice) utterance.voice = maleVoice;
      }

      utterance.onend = () => {
        if (isPlayingRef.current) {
          const nextIdx = index + 1;
          setCurrentLineIdx(nextIdx);
          speakLine(nextIdx);
        }
      };

      utterance.onerror = () => {
        if (isPlayingRef.current) {
          const nextIdx = index + 1;
          setCurrentLineIdx(nextIdx);
          speakLine(nextIdx);
        }
      };

      setCurrentLineIdx(index);
      window.speechSynthesis.speak(utterance);
    },
    [transcript, rate, volume]
  );

  // Stop synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
    };
  }, []);

  if (!recordingUrl && (!transcript || transcript.length === 0)) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-ink-900/15 bg-sand-50 py-10 text-sm text-ink-700/50">
        Recording unavailable
      </div>
    );
  }

  function handleAudioError() {
    // If native audio fails (e.g. 400 Bad Request on private cloudflarestorage URL), switch to synth
    setUseSynth(true);
  }

  function toggle() {
    if (!playing) {
      // Start playing
      setPlaying(true);
      if (useSynth || !recordingUrl) {
        // Speech synth mode
        speakLine(currentLineIdx);
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        synthTimerRef.current = setInterval(() => {
          setCurrent((prev) => {
            if (prev >= duration) {
              setPlaying(false);
              return duration;
            }
            return prev + 0.25;
          });
        }, 250);
      } else {
        const a = audioRef.current;
        if (a) {
          a.play().catch(() => {
            setUseSynth(true);
            speakLine(currentLineIdx);
          });
        }
      }
    } else {
      // Pause
      setPlaying(false);
      if (useSynth || !recordingUrl) {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      } else {
        const a = audioRef.current;
        if (a) a.pause();
      }
    }
  }

  function cycleRate() {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function handleSeek(newTime: number) {
    setCurrent(newTime);
    if (!useSynth && audioRef.current) {
      audioRef.current.currentTime = newTime;
    } else if (transcript && transcript.length > 0 && duration > 0) {
      // Seek to approximate line
      const fraction = newTime / duration;
      const targetIdx = Math.min(Math.floor(fraction * transcript.length), transcript.length - 1);
      setCurrentLineIdx(targetIdx);
      if (playing) {
        speakLine(targetIdx);
      }
    }
  }

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-4 shadow-card">
      {recordingUrl && !useSynth && (
        <audio
          ref={audioRef}
          src={recordingUrl}
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration && Number.isFinite(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration);
            }
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onEnded={() => setPlaying(false)}
          onError={handleAudioError}
        />
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-950 text-white shadow transition hover:bg-ink-900 active:scale-95"
          aria-label={playing ? "Pause recording" : "Play recording"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={current}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="accent-gold-500 w-full cursor-pointer"
            aria-label="Seek audio"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-700/50">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <button
          onClick={cycleRate}
          className="focus-ring flex items-center gap-1 rounded-md border border-ink-900/15 px-2 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60"
          aria-label={`Playback speed ${rate}x`}
        >
          <Gauge size={13} /> {rate}x
        </button>

        <div className="hidden items-center gap-1.5 sm:flex">
          <Volume2 size={15} className="text-ink-700/50" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="accent-gold-500 w-16 cursor-pointer"
            aria-label="Volume control"
          />
        </div>
      </div>

      {useSynth && transcript && transcript.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gold-600">
          <Sparkles size={13} />
          <span>Voice playback ready (AI Dialogue Synthesis)</span>
        </div>
      )}
    </div>
  );
}
