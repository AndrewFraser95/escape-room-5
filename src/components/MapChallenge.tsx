import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  onComplete: () => void;
  imageUrl?: string;
  targetLat?: number;
  targetLng?: number;
  toleranceKm?: number;
  clues?: string[];
}

const DEFAULT_CLUES = [
  "Well eye never",
  "Robbie Williams serenading you with 'Millennium'",
  "Capital I.",
];

const MapChallenge = ({
  onComplete,
  imageUrl = "../assets/streetview.png",
  targetLat = 51.5038206,
  targetLng = -0.119234,
  toleranceKm = 1,
  clues = DEFAULT_CLUES,
}: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);

  const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Fix leaflet marker icons
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current).setView([20, 0], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (result === "correct") return;
      const { lat, lng } = e.latlng;
      setSelectedPos({ lat, lng });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [result]);

  const handleSubmit = () => {
    if (!selectedPos) return;
    const dist = haversineDistance(selectedPos.lat, selectedPos.lng, targetLat, targetLng);
    if (dist <= toleranceKm) {
      setResult("correct");
      onComplete();
    } else {
      setResult("wrong");
      setAttempts(prev => prev + 1);
      if (revealedClues < clues.length) {
        setRevealedClues(prev => Math.min(prev + 1, clues.length));
      }
      setTimeout(() => setResult(null), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-2xl font-matrix-title glow-text text-primary">
        CHALLENGE 4: GEO-LOCATE
      </h2>
      <p className="text-muted-foreground text-sm">
        Find where this image was taken. Click the map to place your guess.
      </p>

      <div className="flex gap-6 w-full max-w-4xl">
        <div className="flex flex-col gap-3 flex-1">
          <div className="border border-primary/30 glow-border rounded overflow-hidden">
            <img src={imageUrl} alt="Mystery location" className="w-full h-48 object-cover" />
          </div>

          <div className="border border-primary/20 rounded p-3 space-y-2">
            <p className="text-primary text-xs font-matrix-title">DECODED INTEL:</p>
            {clues.slice(0, revealedClues).map((clue, i) => (
              <p key={i} className="text-primary/70 text-xs font-matrix">
                &gt; {clue}
              </p>
            ))}
            {revealedClues < clues.length && (
              <p className="text-muted-foreground text-xs italic">
                {clues.length - revealedClues} more clue(s) unlock on wrong guesses
              </p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedPos || result === "correct"}
            className="px-6 py-2 bg-primary text-primary-foreground font-matrix-title rounded
              disabled:opacity-30 hover:bg-accent transition-all glow-border"
          >
            CONFIRM LOCATION
          </button>

          {result === "wrong" && (
            <p className="text-destructive text-sm animate-pulse">
              ✗ INCORRECT — {attempts} attempt(s). Try again.
            </p>
          )}
        </div>

        <div
          ref={mapRef}
          className="flex-1 h-[400px] border border-primary/30 glow-border rounded"
          style={{ minHeight: 400 }}
        />
      </div>

      {result === "correct" && (
        <p className="text-primary glow-text text-xl font-matrix-title animate-pulse">
          ✓ LOCATION CONFIRMED
        </p>
      )}
    </div>
  );
};

export default MapChallenge;
