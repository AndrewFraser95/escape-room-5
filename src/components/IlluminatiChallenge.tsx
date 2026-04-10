import { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

interface Props {
  onComplete: () => void;
}

const HOLD_TIME = 3000;

const TriangleChallenge = ({ onComplete }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const triangleStartRef = useRef<number | null>(null);

  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const checkTriangle = useCallback((landmarks: any[]) => {
    if (landmarks.length < 2) return false;
    const h1 = landmarks[0];
    const h2 = landmarks[1];

    // Thumb tips (4) and index tips (8)
    const thumb1 = h1[4], thumb2 = h2[4];
    const index1 = h1[8], index2 = h2[8];

    // Triangle: thumbs touching each other, index fingers touching each other
    const thumbsDist = dist(thumb1, thumb2);
    const indexDist = dist(index1, index2);
    // And thumbs far from indices (forming a triangle shape)
    const height = dist(
      { x: (thumb1.x + thumb2.x) / 2, y: (thumb1.y + thumb2.y) / 2 },
      { x: (index1.x + index2.x) / 2, y: (index1.y + index2.y) / 2 }
    );

    return thumbsDist < 0.08 && indexDist < 0.08 && height > 0.1;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
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
          numHands: 2,
          runningMode: "VIDEO",
        });

        if (cancelled) return;
        setLoading(false);

        const detect = () => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          if (video.readyState >= 2 && canvas) {
            const ctx = canvas.getContext("2d")!;
            canvas.width = 640;
            canvas.height = 480;

            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(video, -640, 0, 640, 480);
            ctx.restore();

            const results = handLandmarker.detectForVideo(video, performance.now());

            if (results.landmarks && results.landmarks.length >= 2) {
              // Draw hand connections
              ctx.strokeStyle = "#00ff41";
              ctx.lineWidth = 2;
              for (const hand of results.landmarks) {
                for (const pt of hand) {
                  ctx.beginPath();
                  ctx.arc((1 - pt.x) * 640, pt.y * 480, 4, 0, Math.PI * 2);
                  ctx.fillStyle = "#00ff41";
                  ctx.fill();
                }
              }

              const isTriangle = checkTriangle(results.landmarks);
              if (isTriangle) {
                if (!triangleStartRef.current) {
                  triangleStartRef.current = Date.now();
                }
                const elapsed = Date.now() - triangleStartRef.current;
                setProgress(Math.min(elapsed / HOLD_TIME, 1));
                if (elapsed >= HOLD_TIME) {
                  setDone(true);
                  onComplete();
                  return;
                }

                // Draw triangle overlay
                const h1 = results.landmarks[0], h2 = results.landmarks[1];
                ctx.strokeStyle = "#00ff41";
                ctx.lineWidth = 3;
                ctx.shadowColor = "#00ff41";
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.moveTo((1 - h1[4].x) * 640, h1[4].y * 480);
                ctx.lineTo((1 - ((h1[8].x + h2[8].x) / 2)) * 640, ((h1[8].y + h2[8].y) / 2) * 480);
                ctx.lineTo((1 - h2[4].x) * 640, h2[4].y * 480);
                ctx.closePath();
                ctx.stroke();
              } else {
                triangleStartRef.current = null;
                setProgress(0);
              }
            } else {
              triangleStartRef.current = null;
              setProgress(0);
            }
          }
          requestAnimationFrame(detect);
        };
        detect();
      } catch (err) {
        console.error("Init failed:", err);
        setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [checkTriangle, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-2xl font-matrix-title glow-text text-primary">
        CHALLENGE 2: THE SIGN
      </h2>
      <p className="text-muted-foreground text-sm italic">
        "Show us the sign that you know who runs the world"
      </p>
      <p className="text-primary/60 text-xs">
        HINT: Form the symbol with both hands. Hold it steady.
      </p>

      {loading ? (
        <div className="w-[640px] h-[480px] border border-primary/30 glow-border flex items-center justify-center">
          <p className="text-primary animate-pulse glow-text">CALIBRATING GESTURE RECOGNITION...</p>
        </div>
      ) : (
        <div className="relative">
          <canvas ref={canvasRef} className="border border-primary/30 glow-border rounded" />
          {progress > 0 && !done && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4">
              <div className="h-2 bg-secondary rounded-full overflow-hidden glow-border">
                <div
                  className="h-full bg-primary transition-all duration-100"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-center text-primary text-xs mt-1 glow-text">
                HOLD... {Math.ceil(HOLD_TIME / 1000 - progress * HOLD_TIME / 1000)}s
              </p>
            </div>
          )}
        </div>
      )}

      <video ref={videoRef} className="hidden" playsInline muted />

      {done && (
        <p className="text-primary glow-text text-xl font-matrix-title animate-pulse">
          ✓ ILLUMINATED
        </p>
      )}
    </div>
  );
};

export default TriangleChallenge;
