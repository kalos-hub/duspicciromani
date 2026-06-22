import { useRef, useEffect, useState } from "react";
import { Camera, RefreshCw, Check } from "lucide-react";

export const SelfieCapture = ({ onCapture }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    let s;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } })
      .then((mediaStream) => {
        s = mediaStream;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {});
    return () => { if (s) s.getTracks().forEach(t => t.stop()); };
  }, []);

  const snap = () => {
    const v = videoRef.current;
    if (!v) return;
    const size = 320;
    const c = document.createElement("canvas");
    c.width = size; c.height = size;
    const ctx = c.getContext("2d");
    const sx = (v.videoWidth - Math.min(v.videoWidth, v.videoHeight)) / 2;
    const sy = (v.videoHeight - Math.min(v.videoWidth, v.videoHeight)) / 2;
    const s = Math.min(v.videoWidth, v.videoHeight);
    ctx.drawImage(v, sx, sy, s, s, 0, 0, size, size);
    const data = c.toDataURL("image/jpeg", 0.7);
    setPhoto(data);
    onCapture(data);
  };

  const retry = () => { setPhoto(null); onCapture(null); };

  return (
    <div data-testid="selfie-capture" className="flex flex-col items-center">
      <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border-[3px] border-stone-900 overflow-hidden pop-shadow bg-amber-50 relative">
        {photo ? (
          <img src={photo} alt="Selfie" className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted
            className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {!photo ? (
          <button type="button" onClick={snap} data-testid="snap-selfie"
            className="inline-flex items-center gap-1.5 bg-[#d97706] text-white font-display text-sm px-4 py-2 rounded-full border-[2.5px] border-stone-900 pop-shadow-ink-xs btn-press">
            <Camera size={16} strokeWidth={2.5}/> Scatta selfie
          </button>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white font-display text-sm px-3 py-2 rounded-full border-[2.5px] border-stone-900">
              <Check size={16} strokeWidth={2.5}/> Fatto
            </span>
            <button type="button" onClick={retry}
              className="inline-flex items-center gap-1.5 bg-white text-stone-900 font-display text-sm px-3 py-2 rounded-full border-[2.5px] border-stone-900 btn-press">
              <RefreshCw size={16} strokeWidth={2.5}/> Rifai
            </button>
          </>
        )}
      </div>
    </div>
  );
};
