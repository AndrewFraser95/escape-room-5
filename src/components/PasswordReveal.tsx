import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  onComplete: () => void;
}

const FINDABLE_OBJECTS = [
  "bottle", "cup", "cell phone", "book", "keyboard", "mouse",
  "remote", "scissors", "spoon", "fork", "knife", "bowl",
  "banana", "apple", "clock", "toothbrush", "backpack", "laptop",
];

const TIME_LIMIT = 60;

function pickRandom(arr: string[], count: number): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const ObjectDetectionChallenge = ({ onComplete }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [targetObjects] = useState(() => pickRandom(FINDABLE_OBJECTS, 3));
  const [foundObjects, setFoundObjects] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const foundRef = useRef(new Set<string>());
  const modelRef = useRef<any>(null);

  const loadModel = useCallback(async () => {
    // Load TF.js and COCO-SSD from CDN
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });

    await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0");
    await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3");
    const cocoSsd = (window as any).cocoSsd;
    const model = await cocoSsd.load();
    modelRef.current = model;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const video = videoRef.current!;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        video.srcObject = stream;
        await video.play();

        await loadModel();
        if (cancelled) return;
        setLoading(false);

        const detect = async () => {
          if (cancelled || !modelRef.current) return;
          const canvas = canvasRef.current;
          if (video.readyState >= 2 && canvas) {
            const ctx = canvas.getContext("2d")!;
            canvas.width = 640;
            canvas.height = 480;

            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(video, -640, 0, 640, 480);
            ctx.restore();

            const predictions = await modelRef.current.detect(video);

            ctx.strokeStyle = "#00ff41";
            ctx.lineWidth = 2;
            ctx.font = "16px 'Share Tech Mono', monospace";
            ctx.fillStyle = "#00ff41";
            ctx.shadowColor = "#00ff41";
            ctx.shadowBlur = 10;

            for (const pred of predictions) {
              const [x, y, w, h] = pred.bbox;
              const mirroredX = 640 - x - w;
              ctx.strokeRect(mirroredX, y, w, h);
              ctx.fillText(
                `${pred.class} (${Math.round(pred.score * 100)}%)`,
                mirroredX, y - 5
              );

              if (
                targetObjects.includes(pred.class) &&
                pred.score > 0.5 &&
                !foundRef.current.has(pred.class)
              ) {
                foundRef.current.add(pred.class);
                setFoundObjects(new Set(foundRef.current));
              }
            }

            if (foundRef.current.size >= 3) {
              setDone(true);
              onComplete();
              return;
            }
          }
          setTimeout(() => requestAnimationFrame(detect), 200);
        };
        detect();
      } catch (err) {
        console.error("Init failed:", err);
        setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [loadModel, onComplete, targetObjects]);

  // Timer
  useEffect(() => {
    if (loading || done) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setFailed(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, done]);

  // Reset on failure
  useEffect(() => {
    if (failed) {
      const timeout = setTimeout(() => {
        setFailed(false);
        setTimeLeft(TIME_LIMIT);
        foundRef.current = new Set();
        setFoundObjects(new Set());
        // Objects already randomized on mount, page would need remount for new objects
        window.location.reload();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [failed]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-2xl font-matrix-title glow-text text-primary">
        CHALLENGE 3: OBJECT HUNT
      </h2>
      <p className="text-muted-foreground text-sm">
        Find and show these objects to the camera within {TIME_LIMIT} seconds!
      </p>

      <div className="flex gap-4">
        {targetObjects.map((obj) => (
          <div
            key={obj}
            className={`px-4 py-2 border rounded font-matrix text-sm transition-all ${
              foundObjects.has(obj)
                ? "border-primary bg-primary/20 text-primary glow-border"
                : "border-muted text-muted-foreground"
            }`}
          >
            {foundObjects.has(obj) ? "✓ " : "○ "}
            {obj.toUpperCase()}
          </div>
        ))}
      </div>

      <div className={`text-3xl font-matrix-title glow-text ${timeLeft <= 10 ? "text-destructive" : "text-primary"}`}>
        {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
      </div>

      <video ref={videoRef} className="hidden" playsInline muted />

      {loading ? (
        <div className="w-[640px] h-[480px] border border-primary/30 glow-border flex items-center justify-center">
          <p className="text-primary animate-pulse glow-text">LOADING OBJECT DETECTION AI...</p>
        </div>
      ) : (
        <canvas ref={canvasRef} className="border border-primary/30 glow-border rounded" />
      )}

      {failed && (
        <div className="text-destructive text-xl font-matrix-title animate-pulse">
          TIME'S UP! RESETTING...
        </div>
      )}

      {done && (
        <p className="text-primary glow-text text-xl font-matrix-title animate-pulse">
          ✓ ALL OBJECTS ACQUIRED
        </p>
      )}
    </div>
  );
};

export default ObjectDetectionChallenge;
