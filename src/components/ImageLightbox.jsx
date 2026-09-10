import { useEffect, useState } from "react";

export default function ImageLightbox({ images = [], activeIndex = 0, onClose, vehicleTitle = "Vehicle" }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentIdx = selectedIdx !== null ? selectedIdx : activeIndex;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setSelectedIdx((prev) => ((prev !== null ? prev : activeIndex) + 1) % images.length);
      if (e.key === "ArrowLeft") setSelectedIdx((prev) => ((prev !== null ? prev : activeIndex) - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, activeIndex, onClose]);

  if (!images || images.length === 0) return null;

  const currentImg = images[currentIdx];

  return (
    <div className="lightbox-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="lightbox-header">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>{vehicleTitle}</h3>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
              {currentImg?.label || `Photo ${currentIdx + 1} of ${images.length}`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="lightbox-btn"
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? "Zoom Out" : "Zoom In"}
            >
              {isZoomed ? "🔍 Zoom Out" : "🔍 Zoom In"}
            </button>
            <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close Lightbox">
              ✕
            </button>
          </div>
        </div>

        {/* Main Stage */}
        <div className="lightbox-stage">
          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav-btn prev"
              onClick={() => setSelectedIdx((prev) => ((prev !== null ? prev : activeIndex) - 1 + images.length) % images.length)}
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          <div className={`lightbox-img-wrapper ${isZoomed ? "zoomed" : ""}`}>
            <img
              src={currentImg?.url || currentImg}
              alt={currentImg?.label || vehicleTitle}
              className="lightbox-main-img"
              onError={(e) => {
                e.target.src =
                  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%2323252d%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%20fill%3D%22%2364748b%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EPhoto%20Unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";
              }}
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              className="lightbox-nav-btn next"
              onClick={() => setSelectedIdx((prev) => ((prev !== null ? prev : activeIndex) + 1) % images.length)}
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </div>

        {/* Bottom Thumbnail Strip */}
        {images.length > 1 && (
          <div className="lightbox-thumbs">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`lightbox-thumb-btn ${idx === currentIdx ? "active" : ""}`}
                onClick={() => setSelectedIdx(idx)}
              >
                <img src={img?.url || img} alt={img?.label || `Thumbnail ${idx + 1}`} />
                <span>{img?.label || `View ${idx + 1}`}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
