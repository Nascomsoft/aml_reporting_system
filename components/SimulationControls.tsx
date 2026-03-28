"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/Button";

export type SimulationStatus = "idle" | "running" | "paused";

interface SimulationControlsProps {
  status: SimulationStatus;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  isLoading?: boolean;
}

export function SimulationControls({
  status,
  onStart,
  onStop,
  onPause,
  onResume,
  isLoading = false,
}: SimulationControlsProps) {
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    try {
      setError(null);
      await onStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start simulation");
    }
  }, [onStart]);

  const handleStop = useCallback(async () => {
    try {
      setError(null);
      await onStop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop simulation");
    }
  }, [onStop]);

  const handlePause = useCallback(async () => {
    try {
      setError(null);
      await onPause();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause simulation");
    }
  }, [onPause]);

  const handleResume = useCallback(async () => {
    try {
      setError(null);
      await onResume();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resume simulation");
    }
  }, [onResume]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full animate-pulse ${
              status === "idle"
                ? "bg-gray-400"
                : status === "running"
                  ? "bg-green-500"
                  : "bg-yellow-500"
            }`}
          />
          <span className="text-sm font-medium text-gray-700 capitalize">
            {status === "idle" ? "Stopped" : status}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {status === "idle" ? (
            <Button
              onClick={handleStart}
              disabled={isLoading}
              variant="primary"
              size="sm"
            >
              {isLoading ? "Starting..." : "Start Simulation"}
            </Button>
          ) : status === "running" ? (
            <>
              <Button
                onClick={handlePause}
                disabled={isLoading}
                variant="secondary"
                size="sm"
              >
                {isLoading ? "Pausing..." : "Pause"}
              </Button>
              <Button
                onClick={handleStop}
                disabled={isLoading}
                variant="danger"
                size="sm"
              >
                {isLoading ? "Stopping..." : "Stop"}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleResume}
                disabled={isLoading}
                variant="primary"
                size="sm"
              >
                {isLoading ? "Resuming..." : "Resume"}
              </Button>
              <Button
                onClick={handleStop}
                disabled={isLoading}
                variant="danger"
                size="sm"
              >
                {isLoading ? "Stopping..." : "Stop"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Status Info */}
      <div className="text-xs text-gray-500">
        {status === "running" && (
          <p>📊 Live transactions streaming - new transactions appear every 5-10 seconds</p>
        )}
        {status === "paused" && (
          <p>⏸️ Simulation paused - click Resume to continue</p>
        )}
        {status === "idle" && (
          <p>⏹️ Simulation stopped - click Start Simulation to begin</p>
        )}
      </div>
    </div>
  );
}
