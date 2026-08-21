"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, Gauge, Sparkles, Loader2 } from "lucide-react";
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
  const [isBuffering, setIsBuffering] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [useSynth, setUseSynth] = useState(false);
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Synth timer interval ref
  const synthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = playing;

  const currentLineRef = useRef(0);
  currentLineRef.current = currentLineIdx;

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    function updateVoices() {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    }

    updateVoices();
    window.speechSynthesis.addEventListener("voiceschanged", updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

  // Approximate total duration from transcript if duration is 0
  useEffect(() => {
    if (durationSeconds && durationSeconds > 0) {
      setDuration(durationSeconds);
    } else if (transcript && transcript.length > 0) {
      setDuration(transcript.length * 4);
    }
  }, [durationSeconds, transcript]);

  // Keep speech synthesis alive in Chrome (prevents auto-pausing after 15s)
  const startKeepAlive = useCallback(() => {
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    keepAliveRef.current = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  // Speech synthesis line player
  const speakLine = useCallback(
    (index: number) => {
      if (!transcript || index >= transcript.length || !isPlayingRef.current) {
        setPlaying(false);
        setIsBuffering(false);
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        stopKeepAlive();
        return;
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setPlaying(false);
        setIsBuffering(false);
        return;
      }

      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const line = transcript[index];
      const textToSpeak = line.text.replace(/^[A-Za-z0-9\s]+:\s*/, "");
      const utterance = new SpeechSynthesisUtterance(textToSpeak || line.text);
      utterance.rate = rate;
      utterance.volume = volume;

      // Select distinct natural voices
      const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      if (line.role === "AI Agent" || /sofia|assistant|agent/i.test(line.speaker)) {
        utterance.pitch = 1.1;
        const femaleVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (/female|samantha|victoria|zira|karen|aria|jenny|natural/i.test(v.name) || /female/i.test(v.name))
        );
        if (femaleVoice) utterance.voice = femaleVoice;
      } else {
        utterance.pitch = 0.95;
        const maleVoice = voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (/male|david|george|daniel|guy|natural/i.test(v.name) || /male/i.test(v.name))
        );
        if (maleVoice) utterance.voice = maleVoice;
      }

      utterance.onend = () => {
        if (isPlayingRef.current) {
          const nextIdx = index + 1;
          setCurrentLineIdx(nextIdx);
          if (transcript && duration > 0) {
            setCurrent(Math.min(duration, ((nextIdx) / transcript.length) * duration));
          }
          speakLine(nextIdx);
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== "canceled" && isPlayingRef.current) {
          const nextIdx = index + 1;
          setCurrentLineIdx(nextIdx);
          speakLine(nextIdx);
        }
      };

      setCurrentLineIdx(index);
      if (transcript && duration > 0) {
        setCurrent((index / transcript.length) * duration);
      }
      window.speechSynthesis.speak(utterance);
      startKeepAlive();
    },
    [transcript, rate, volume, availableVoices, duration, startKeepAlive, stopKeepAlive]
  );

  // Stop synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (synthTimerRef.current) clearInterval(synthTimerRef.current);
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    };
  }, []);

  if (!recordingUrl && (!transcript || transcript.length === 0)) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-ink-900/15 bg-sand-50 py-8 text-sm text-ink-700/50">
        Recording unavailable
      </div>
    );
  }

  function startSynthPlayback(fromIdx = 0) {
    setUseSynth(true);
    setPlaying(true);
    setIsBuffering(false);
    setCurrentLineIdx(fromIdx);
    speakLine(fromIdx);

    if (synthTimerRef.current) clearInterval(synthTimerRef.current);
    synthTimerRef.current = setInterval(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
        setCurrent((prev) => {
          if (prev >= duration && duration > 0) {
            setPlaying(false);
            return duration;
          }
          return prev + 0.25;
        });
      }
    }, 250);
  }

  function handleAudioError() {
    // If native audio fails (e.g. 404 or network error), auto-fallback to synth if transcript is present
    if (transcript && transcript.length > 0) {
      startSynthPlayback(currentLineRef.current);
    } else {
      setIsBuffering(false);
      setPlaying(false);
    }
  }

  function toggle() {
    if (!playing) {
      // If already in synth mode or no direct audio URL
      if (useSynth || !recordingUrl) {
        startSynthPlayback(currentLineIdx);
        return;
      }

      // Try native HTML5 audio
      const a = audioRef.current;
      if (a) {
        setIsBuffering(true);
        a.play()
          .then(() => {
            setPlaying(true);
            setIsBuffering(false);
          })
          .catch(() => {
            // If browser audio playback fails, switch to speech synthesis
            startSynthPlayback(currentLineIdx);
          });
      } else {
        startSynthPlayback(currentLineIdx);
      }
    } else {
      // Pause
      setPlaying(false);
      setIsBuffering(false);
      if (useSynth || !recordingUrl) {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
        if (synthTimerRef.current) clearInterval(synthTimerRef.current);
        stopKeepAlive();
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
    if (useSynth && playing) {
      speakLine(currentLineIdx);
    }
  }

  function handleSeek(newTime: number) {
    setCurrent(newTime);
    if (!useSynth && audioRef.current) {
      audioRef.current.currentTime = newTime;
    } else if (transcript && transcript.length > 0 && duration > 0) {
      const fraction = Math.max(0, Math.min(1, newTime / duration));
      const targetIdx = Math.min(Math.floor(fraction * transcript.length), transcript.length - 1);
      setCurrentLineIdx(targetIdx);
      if (playing) {
        speakLine(targetIdx);
      }
    }
  }

  const currentSpeaker = transcript && transcript[currentLineIdx] ? transcript[currentLineIdx].speaker : "Sofia";
  const currentText = transcript && transcript[currentLineIdx] ? transcript[currentLineIdx].text : null;

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white p-4 shadow-card">
      {recordingUrl && !useSynth && (
        <audio
          ref={audioRef}
          src={recordingUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration && Number.isFinite(e.currentTarget.duration)) {
              setDuration(e.currentTarget.duration);
            }
            setIsBuffering(false);
          }}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          onPlaying={() => {
            setPlaying(true);
            setIsBuffering(false);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            setIsBuffering(false);
          }}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false);
            setIsBuffering(false);
            setCurrent(duration);
          }}
          onError={handleAudioError}
        />
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={isBuffering}
          className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-950 text-white shadow transition hover:bg-ink-900 active:scale-95 cursor-pointer disabled:opacity-80"
          aria-label={playing ? "Pause voice playback" : "Play voice recording"}
        >
          {isBuffering ? (
            <Loader2 size={16} className="animate-spin text-white" />
          ) : playing ? (
            <Pause size={16} />
          ) : (
            <Play size={16} className="ml-0.5" />
          )}
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
          type="button"
          onClick={cycleRate}
          className="focus-ring flex items-center gap-1 rounded-md border border-ink-900/15 px-2 py-1 text-xs font-medium text-ink-700 hover:border-gold-400/60 cursor-pointer"
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

      {/* Real-time speech synthesizer indicator and active dialogue caption */}
      {useSynth && transcript && transcript.length > 0 && (
        <div className="mt-3.5 rounded-lg border border-gold-400/20 bg-gold-400/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gold-700">
              <Sparkles size={13} className="text-gold-500 animate-pulse" />
              <span>Voice Playback Engine ({playing ? "Active" : "Ready"})</span>
            </div>
            <span className="text-[11px] text-ink-700/50">
              Line {currentLineIdx + 1} of {transcript.length}
            </span>
          </div>
          {currentText && (
            <p className="mt-1.5 text-xs leading-relaxed text-ink-900">
              <strong className="text-ink-950 font-semibold">{currentSpeaker}: </strong>
              <span>{currentText}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

