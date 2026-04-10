import { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

interface Props {
  onComplete: () => void;
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

const BIRD_SIZE = 30;
const PIPE_WIDTH = 50;
const GAP_SIZE = 150;
const PIPE_SPEED = 2.5;
const SCORE_TO_WIN = 5;

const FlappyBirdChallenge = ({ onComplete }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handYRef = useRef(0.5);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const pipesRef = useRef<Pipe[]>([]);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  const initHandTracking = useCallback(async () => {
    try {
      const video = videoRef.current!;
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      video.srcObject = stream;
      await video.play();

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
          delegate: "GPU",
        },
        numHands: 1,
        runningMode: "VIDEO",
      });

      setLoading(false);

      const detect = () => {
        if (video.readyState >= 2) {
          const results = handLandmarker.detectForVideo(video, performance.now());
          if (results.landmarks && results.landmarks.length > 0) {
            handYRef.current = results.landmarks[0][9].y;
          }
        }
        requestAnimationFrame(detect);
      };
      detect();
    } catch (err) {
      console.error("Hand tracking init failed:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initHandTracking();
  }, [initHandTracking]);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = 600, H = 400;
    canvas.width = W;
    canvas.height = H;

    pipesRef.current = [];
    scoreRef.current = 0;
    gameOverRef.current = false;
    frameRef.current = 0;

    const addPipe = () => {
      pipesRef.current.push({
        x: W,
        gapY: Math.random() * (H - GAP_SIZE - 80) + 40,
        passed: false,
      });
    };

    const gameLoop = () => {
      if (gameOverRef.current) return;
      frameRef.current++;

      if (frameRef.current % 120 === 0) addPipe();

      const birdY = handYRef.current * H;
      const birdX = 80;

      // Update pipes
      const pipes = pipesRef.current;
      for (const pipe of pipes) {
        pipe.x -= PIPE_SPEED;
        if (!pipe.passed && pipe.x + PIPE_WIDTH < birdX) {
          pipe.passed = true;
          scoreRef.current++;
          setScore(scoreRef.current);
          if (scoreRef.current >= SCORE_TO_WIN) {
            gameOverRef.current = true;
            setGameOver(true);
            onComplete();
            return;
          }
        }
        // Collision
        if (
          birdX + BIRD_SIZE > pipe.x && birdX < pipe.x + PIPE_WIDTH &&
          (birdY < pipe.gapY || birdY + BIRD_SIZE > pipe.gapY + GAP_SIZE)
        ) {
          // Reset on collision
          pipesRef.current = [];
          scoreRef.current = 0;
          setScore(0);
          frameRef.current = 0;
        }
      }
      pipesRef.current = pipes.filter(p => p.x > -PIPE_WIDTH);

      // Draw
      ctx.fillStyle = "#000800";
      ctx.fillRect(0, 0, W, H);

      // Draw grid
      ctx.strokeStyle = "rgba(0,255,65,0.05)";
      for (let i = 0; i < W; i += 20) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
      }
      for (let i = 0; i < H; i += 20) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
      }

      // Draw pipes
      ctx.fillStyle = "#00aa2a";
      ctx.shadowColor = "#00ff41";
      ctx.shadowBlur = 10;
      for (const pipe of pipesRef.current) {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY);
        ctx.fillRect(pipe.x, pipe.gapY + GAP_SIZE, PIPE_WIDTH, H - pipe.gapY - GAP_SIZE);
      }

      // Draw bird
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#00ff41";
      ctx.beginPath();
      ctx.arc(birdX + BIRD_SIZE / 2, birdY + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Score
      ctx.fillStyle = "#00ff41";
      ctx.font = "20px 'Orbitron', sans-serif";
      ctx.fillText(`${scoreRef.current}/${SCORE_TO_WIN}`, W - 80, 30);

      animRef.current = requestAnimationFrame(gameLoop);
    };

    addPipe();
    animRef.current = requestAnimationFrame(gameLoop);

    return () => cancelAnimationFrame(animRef.current);
  }, [loading, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-2xl font-matrix-title glow-text text-primary">
        CHALLENGE 1: FLAPPY ESCAPE
      </h2>
      <p className="text-muted-foreground text-sm">
        Control the bird with your hand. Pass {SCORE_TO_WIN} pipes to escape.
      </p>
      <video ref={videoRef} className="absolute w-0 h-0 opacity-0" playsInline muted />
      {loading ? (
        <div className="w-[600px] h-[400px] border border-primary/30 glow-border flex items-center justify-center">
          <p className="text-primary animate-pulse glow-text">INITIALIZING HAND TRACKING...</p>
        </div>
      ) : (
        <canvas ref={canvasRef} className="border border-primary/30 glow-border rounded" />
      )}
      {gameOver && (
        <p className="text-primary glow-text text-xl font-matrix-title animate-pulse">
          ✓ PIPE MATRIX CLEARED
        </p>
      )}
    </div>
  );
};

export default FlappyBirdChallenge;
