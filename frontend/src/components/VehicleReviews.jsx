import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useInteraction } from "../context/InteractionContext";

const INITIAL_MOCK_REVIEWS = [
  {
    id: "rev-1",
    author: "Karthik Raja",
    rating: 5,
    date: "2 days ago",
    comment: "Extremely clean and smooth ride. Pick-up at Chennai hub was seamless in under 5 minutes. AC was super chilling for our ECR trip!",
    tag: "Verified Renter",
  },
  {
    id: "rev-2",
    author: "Deepa Sundaram",
    rating: 5,
    date: "1 week ago",
    comment: "Fuel efficiency was top notch. Clean documents and zero hassle return. Will definitely book again for family outings.",
    tag: "Family Trip",
  },
  {
    id: "rev-3",
    author: "Arun Kumar",
    rating: 4,
    date: "2 weeks ago",
    comment: "Great experience overall! The car was sanitized and had Bluetooth music setup ready. Deposit was refunded within 24 hours.",
    tag: "Weekend Getaway",
  },
];

export default function VehicleReviews({ vehicleId, vehicleName = "Vehicle" }) {
  const { user } = useAuth();
  const { showToast } = useInteraction();

  const storageKey = `rr_reviews_${vehicleId}`;

  const [reviews, setReviews] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : INITIAL_MOCK_REVIEWS;
    } catch {
      return INITIAL_MOCK_REVIEWS;
    }
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState(user?.name || "");

  // Average Rating
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 5.0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // Rating breakdown counts
  const breakdown = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      showToast("Please write a short review comment", "warning", "✍️");
      return;
    }

    const reviewObj = {
      id: `rev-${Date.now()}`,
      author: authorName.trim() || user?.name || "Anonymous Traveler",
      rating: newRating,
      date: "Just now",
      comment: newComment.trim(),
      tag: "Verified Renter",
    };

    const updated = [reviewObj, ...reviews];
    setReviews(updated);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }

    setNewComment("");
    setIsFormOpen(false);
    showToast("Thank you! Your review has been posted 🎉", "success", "⭐");
  };

  return (
    <div className="reviews-card" style={{ marginTop: "28px" }}>
      <div className="reviews-header">
        <div>
          <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Ratings &amp; Reviews</h3>
          <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Real feedback from verified RoadReady renters
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          {isFormOpen ? "✕ Cancel" : "✍️ Write a Review"}
        </button>
      </div>

      {/* Rating Overview & Breakdown */}
      <div className="reviews-summary-grid">
        <div className="reviews-score-box">
          <div className="score-number">{averageRating}</div>
          <div className="score-stars">
            {"★".repeat(Math.round(Number(averageRating)))}
            <span style={{ color: "var(--border)" }}>
              {"★".repeat(5 - Math.round(Number(averageRating)))}
            </span>
          </div>
          <div className="score-count">{reviews.length} verified reviews</div>
        </div>

        <div className="reviews-bars">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = breakdown[stars] || 0;
            const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
            return (
              <div key={stars} className="review-bar-row">
                <span className="star-lbl">{stars}★</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="bar-pct">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Write Review Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmitReview} className="review-write-form">
          <h4 style={{ margin: "0 0 12px", fontSize: "1rem" }}>Rate your trip with {vehicleName}</h4>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Your Rating:</span>
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${star <= (hoverRating || newRating) ? "active" : ""}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setNewRating(star)}
                >
                  ★
                </button>
              ))}
            </div>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
              {newRating} of 5 Stars
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your Name"
              className="chat-input"
              style={{ flex: "1 1 200px" }}
              required
            />
          </div>

          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your driving experience, vehicle condition, pickup ease..."
            rows={3}
            className="chat-input"
            style={{ width: "100%", borderRadius: "var(--radius-sm)", marginBottom: "12px" }}
            required
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Verified Review →
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        {reviews.map((rev) => (
          <div key={rev.id} className="review-item">
            <div className="review-meta-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div className="review-avatar">
                  {rev.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{rev.author}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{rev.date}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {rev.tag && <span className="review-tag">{rev.tag}</span>}
                <div className="review-stars">
                  {"★".repeat(rev.rating)}
                  <span style={{ color: "var(--border)" }}>{"★".repeat(5 - rev.rating)}</span>
                </div>
              </div>
            </div>

            <p className="review-comment">{rev.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
