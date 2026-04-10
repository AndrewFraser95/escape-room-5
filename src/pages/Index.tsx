import { useState, useEffect, useCallback } from "react";
import MatrixRain from "@/components/MatrixRain";
import FlappyBirdChallenge from "@/components/FlappyBirdChallenge";
import IlluminatiChallenge from "@/components/IlluminatiChallenge";
import ObjectDetectionChallenge from "@/components/ObjectDetectionChallenge";
import MapChallenge from "@/components/MapChallenge";
import PasswordReveal from "@/components/PasswordReveal";
import { setProgress, checkAndFlagCheat } from "@/lib/antiCheat";

const TOTAL_CHALLENGES = 4;

const Index = () => {
  const [stage, setStage] = useState(0); // 0=intro, 1-4=challenges, 5=password
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    // Anti-cheat: if they had partial progress and reloaded, flag it
    checkAndFlagCheat();
  }, []);

  const advanceStage = useCallback(() => {
    setTransitioning(true);
    const nextStage = stage + 1;
    setProgress(nextStage);
    setTimeout(() => {
      setStage(nextStage);
      setTransitioning(false);
    }, 1500);
  }, [stage]);

  const startGame = () => {
    setProgress(0);
    setStage(1);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden scanline">
      <MatrixRain />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Transition overlay */}
        {transitioning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90">
            <div className="text-primary glow-text text-2xl font-matrix-title animate-pulse">
              DECRYPTING NEXT CHALLENGE...
            </div>
          </div>
        )}

        {/* Progress bar */}
        {stage >= 1 && stage <= TOTAL_CHALLENGES && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {Array.from({ length: TOTAL_CHALLENGES }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-1 rounded-full transition-all ${
                  i < stage
                    ? "bg-primary glow-border"
                    : i === stage - 1
                    ? "bg-primary animate-pulse"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}

        {/* Intro */}
        {stage === 0 && (
          <div className="text-center space-y-6 max-w-lg">
            <h1 className="text-5xl font-matrix-title glow-text text-primary">
              THE MATRIX
            </h1>
            <p className="text-xl text-primary/70 font-matrix">
              ESCAPE ROOM 5
            </p>
            <div className="border border-primary/20 rounded p-4 space-y-2 text-left">
              <p className="text-muted-foreground text-sm font-matrix">
                &gt; 4 challenges stand between you and freedom
              </p>
              <p className="text-muted-foreground text-sm font-matrix">
                &gt; Your webcam is your only tool
              </p>
              <p className="text-muted-foreground text-sm font-matrix">
                &gt; Do not refresh or the system will know
              </p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-primary text-primary-foreground font-matrix-title text-lg rounded
                hover:bg-accent transition-all glow-box"
            >
              ENTER THE MATRIX
            </button>
          </div>
        )}

        {/* Challenges */}
        {stage === 1 && <FlappyBirdChallenge onComplete={advanceStage} />}
        {stage === 2 && <IlluminatiChallenge onComplete={advanceStage} />}
        {stage === 4 && <ObjectDetectionChallenge onComplete={advanceStage} />}
        {stage === 3 && <MapChallenge onComplete={advanceStage} />}
        {stage === 5 && <PasswordReveal />}
      </div>
    </div>
  );
};

export default Index;
