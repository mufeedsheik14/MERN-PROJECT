import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useBookings } from "../context/BookingContext";
import { branches, categories } from "../data/mockData";
import { generateAssistantReply } from "../services/aiService";
import { fetchDestinationWeather } from "../services/weatherService";
import { getWeatherVehicleRecommendations } from "../services/recommendationService";

export default function ChatAssistant() {
  const { t, lang } = useLanguage();
  const { user, isAdmin, isStaff } = useAuth();
  const { vehicles, coupons } = useFleet();
  const { bookings } = useBookings();

  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Suggestion flow state (passenger count + destination weather)
  const [suggestStep, setSuggestStep] = useState(null); // null | 'awaiting_details' | 'awaiting_destination' | 'awaiting_passengers'
  const [collectedPax, setCollectedPax] = useState(null);
  const [collectedDest, setCollectedDest] = useState(null);

  // Initial welcome message tailored to role
  const initialMessage = useMemo(() => {
    if (isAdmin) {
      return {
        id: "welcome-admin",
        sender: "assistant",
        text: `👑 Welcome Administrator **${user?.name || ""}**! I am your Fleet Intelligence Co-Pilot. You can ask me to summarize revenue, inspect fleet utilization, check maintenance vehicles, or navigate operations.`,
        timestamp: new Date(),
      };
    }
    if (isStaff) {
      return {
        id: "welcome-staff",
        sender: "assistant",
        text: `🏢 Hello **${user?.name || "Staff"}**! I am your Branch Operations Assistant. Ask me to summarize branch bookings, list vehicles in maintenance, or guide you through lifecycle handovers.`,
        timestamp: new Date(),
      };
    }
    return {
      id: "welcome-customer",
      sender: "assistant",
      text: `👋 Hello${user ? ` ${user.name}` : ""}! I am your RoadReady AI Assistant. Ask me about vehicle availability, cheapest rides, active promo coupons, or the status of your reservation!`,
      timestamp: new Date(),
    };
  }, [isAdmin, isStaff, user]);

  const [messages, setMessages] = useState([initialMessage]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Suggested prompts based on active role
  const suggestions = useMemo(() => {
    if (isAdmin) {
      return [
        "Suggest",
        "Total revenue summary",
        "Show fleet utilization",
        "Which vehicles are in maintenance?",
        "Branch performance breakdown",
      ];
    }
    if (isStaff) {
      return [
        "Suggest",
        "Summarize today's branch bookings",
        "Which vehicles are in maintenance?",
        "How do I advance booking status?",
        "List ongoing trips",
      ];
    }
    return [
      "Suggest",
      "Cheapest vehicle in Chennai?",
      "Do you have electric scooters?",
      "What coupons are active?",
      "What is my booking status?",
    ];
  }, [isAdmin, isStaff]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSend = useCallback(
    async (textToSend) => {
      const query = (textToSend || input).trim();
      if (!query || isTyping) return;

      const userMsg = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const queryLower = query.toLowerCase();
        const isSuggestCommand =
          queryLower === "suggest" ||
          queryLower === "suggest vehicle" ||
          queryLower === "suggest a vehicle" ||
          queryLower === "weather recommendation";

        // 1. Customer initiates Suggest flow
        if (isSuggestCommand) {
          setSuggestStep("awaiting_details");
          setCollectedPax(null);
          setCollectedDest(null);

          const assistantMsg = {
            id: `assistant-${Date.now()}`,
            sender: "assistant",
            text: `🌟 **Trip Vehicle Recommendation by Weather**\n\nI can analyze live destination weather and recommend the most suitable vehicles from our fleet!\n\nPlease let me know:\n• **How many passengers?**\n• **Where are you going for the trip?**\n\n*(Reply with passenger count and destination, e.g. "4 passengers to Ooty", or pick below)*`,
            showPaxChips: true,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setIsTyping(false);
          return;
        }

        // 2. Active in Suggest Flow
        if (suggestStep) {
          // Allow switching to an unrelated query without blocking
          const isUnrelatedInquiry =
            queryLower.includes("coupon") ||
            queryLower.includes("discount") ||
            queryLower.includes("status of") ||
            queryLower.includes("my booking") ||
            queryLower.includes("revenue") ||
            queryLower.includes("utilization") ||
            queryLower.includes("maintenance") ||
            queryLower.includes("electric") ||
            queryLower.includes("cheapest");

          if (isUnrelatedInquiry) {
            setSuggestStep(null);
            setCollectedPax(null);
            setCollectedDest(null);
            // Fall through to general AI reasoning below
          } else {
            // Extract passenger count
            const paxMatch =
              query.match(/\b(\d+)\s*(?:passengers?|persons?|people|pax|seats?|adults?)\b/i) ||
              query.match(/\b(?:family of|group of)\s*(\d+)\b/i) ||
              query.match(/^\s*(\d+)\s*$/);
            const extractedPax = paxMatch ? parseInt(paxMatch[1], 10) : null;

            // Extract destination
            let extractedDest = null;
            const destMatch = query.match(
              /(?:going\s+to|heading\s+to|trip\s+to|to|for|in|visit)\s+([a-zA-Z\s]{2,30})/i
            );
            if (destMatch) {
              extractedDest = destMatch[1]
                .replace(/\b(?:passengers?|persons?|people|pax|seats?|with|\d+)\b/gi, "")
                .trim();
            } else if (!extractedPax) {
              const cleaned = query.replace(/[^a-zA-Z\s]/g, "").trim();
              if (
                cleaned.length >= 2 &&
                !["suggest", "hi", "hello", "hey", "yes", "no"].includes(cleaned.toLowerCase())
              ) {
                extractedDest = cleaned;
              }
            }

            const currentPax = extractedPax || collectedPax;
            const currentDest = extractedDest || collectedDest;

            // Both details are provided
            if (currentPax && currentDest) {
              setSuggestStep(null);
              setCollectedPax(null);
              setCollectedDest(null);

              let weatherData = null;
              try {
                weatherData = await fetchDestinationWeather(currentDest);
              } catch (err) {
                console.warn("Weather fetch failed, continuing gracefully:", err);
                weatherData = { success: false, message: "Weather service unavailable" };
              }

              const recResult = getWeatherVehicleRecommendations({
                destination: currentDest,
                passengers: currentPax,
                weatherData,
                vehicles,
              });

              let weatherText = "";
              if (weatherData && weatherData.success) {
                const rainText = weatherData.rain ? "Rain / wet road conditions" : "Dry road conditions";
                weatherText = `🌤️ **Destination Weather for ${weatherData.destination || currentDest}:**\n• **Temperature:** ${weatherData.temperature}°C\n• **Condition:** ${weatherData.condition} (${weatherData.description})\n• **Details:** ${rainText} • Humidity: ${weatherData.humidity}% • Wind: ${weatherData.windSpeed} km/h\n\n`;
              } else {
                weatherText = `⚠️ *Note: Current weather for "${currentDest}" could not be retrieved. Proceeding with vehicle recommendations based on passenger capacity and fleet availability:*\n\n`;
              }

              let vehiclesText = `🚗 **Recommended Available Vehicles for ${currentPax} Passenger(s):**\n\n`;
              if (recResult.capacityNote) {
                vehiclesText += `*${recResult.capacityNote}*\n\n`;
              }

              if (recResult.recommendations.length === 0) {
                vehiclesText += `No available vehicles currently match ${currentPax} passengers. Please explore our full catalog or contact branch support.`;
              } else {
                recResult.recommendations.forEach((rec, idx) => {
                  vehiclesText += `${idx + 1}. **${rec.name}** (${rec.category}) — **₹${rec.dailyRent.toLocaleString("en-IN")}/day**\n   • Seating: **${rec.seats} Seats** | Fuel: ${rec.fuelType} | Transmission: ${rec.transmission}\n   • Branch: ${rec.branch}\n   • Why Recommended: ${rec.reason}\n\n`;
                });
              }

              const assistantMsg = {
                id: `assistant-${Date.now()}`,
                sender: "assistant",
                text: weatherText + vehiclesText,
                weatherData: weatherData?.success ? weatherData : null,
                weatherFailed: !weatherData?.success,
                destinationName: currentDest,
                passengers: currentPax,
                recommendations: recResult.recommendations,
                capacityNote: recResult.capacityNote,
                timestamp: new Date(),
              };

              setMessages((prev) => [...prev, assistantMsg]);
              setIsTyping(false);
              return;
            }

            // Only passenger count known
            if (currentPax && !currentDest) {
              setCollectedPax(currentPax);
              setSuggestStep("awaiting_destination");

              const assistantMsg = {
                id: `assistant-${Date.now()}`,
                sender: "assistant",
                text: `Got it, **${currentPax} passenger(s)**! 🚗\nWhere are you going for the trip?`,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setIsTyping(false);
              return;
            }

            // Only destination known
            if (currentDest && !currentPax) {
              setCollectedDest(currentDest);
              setSuggestStep("awaiting_passengers");

              const assistantMsg = {
                id: `assistant-${Date.now()}`,
                sender: "assistant",
                text: `Great, **${currentDest}** sounds exciting! 🌲\nHow many passengers will be travelling?`,
                showPaxChips: true,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMsg]);
              setIsTyping(false);
              return;
            }

            // Neither recognized
            const assistantMsg = {
              id: `assistant-${Date.now()}`,
              sender: "assistant",
              text: `To recommend the best vehicle, please tell me the number of passengers and your destination (e.g., "4 passengers to Ooty").`,
              showPaxChips: true,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
            setIsTyping(false);
            return;
          }
        }

        // 3. Existing general AI Assistant reasoning (unchanged)
        const replyText = await generateAssistantReply({
          prompt: query,
          conversationHistory: messages,
          user,
          vehicles,
          bookings,
          coupons,
          branches,
          categories,
          lang,
        });

        const assistantMsg = {
          id: `assistant-${Date.now()}`,
          sender: "assistant",
          text: replyText,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.error("AI Assistant error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender: "assistant",
            text: "Sorry, I had trouble processing that inquiry. Please try again or rephrase.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [input, isTyping, messages, user, vehicles, bookings, coupons, lang, suggestStep, collectedPax, collectedDest]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setSuggestStep(null);
    setCollectedPax(null);
    setCollectedDest(null);
    setMessages([initialMessage]);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? t("chat_close") : t("chat_open")}
        title={t("ai_assistant")}
      >
        {isOpen ? (
          <span style={{ fontSize: "1.2rem" }}>✕</span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "1.35rem" }}>🤖</span>
            <span className="chat-toggle-label">{t("ai_assistant")}</span>
          </div>
        )}
      </button>

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="chat-window" role="dialog" aria-modal="false">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: isAdmin ? "#8b5cf6" : isStaff ? "#0284c7" : "var(--accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  {t("ai_assistant")}
                  {isAdmin && <span className="role-pill role-pill-admin" style={{ fontSize: "0.65rem" }}>Admin</span>}
                  {isStaff && <span className="role-pill role-pill-staff" style={{ fontSize: "0.65rem" }}>Staff</span>}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {isAdmin
                    ? t("ai_subtitle_admin")
                    : isStaff
                    ? t("ai_subtitle_staff")
                    : t("ai_subtitle_customer")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={handleClear}
                className="icon-btn"
                style={{ width: "28px", height: "28px", fontSize: "0.75rem" }}
                title={t("ai_clear")}
              >
                🗑️
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="icon-btn"
                style={{ width: "28px", height: "28px", fontSize: "0.85rem" }}
                title={t("chat_close")}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="chat-suggestions">
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "4px" }}>
              {t("ai_quick_suggestions")}:
            </div>
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSend(sug)}
                  className="chat-sug-chip"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Thread */}
          <div className="chat-messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chat-bubble ${m.sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
              >
                {/* Rich Weather Card if available */}
                {m.weatherData && (
                  <div className="chat-weather-card">
                    <div className="chat-weather-header">
                      <div className="chat-weather-dest">
                        <span>📍</span>
                        <strong>{m.weatherData.destination}</strong>
                      </div>
                      <span className={`chat-weather-badge ${m.weatherData.rain ? "badge-rain" : "badge-clear"}`}>
                        {m.weatherData.rain ? "🌧️ Rain" : m.weatherData.condition === "Clear" ? "☀️ Clear" : "⛅ " + m.weatherData.condition}
                      </span>
                    </div>
                    <div className="chat-weather-body">
                      <div className="chat-weather-temp">
                        {m.weatherData.temperature}<span>°C</span>
                      </div>
                      <div className="chat-weather-desc">
                        <div style={{ fontWeight: 600 }}>{m.weatherData.description}</div>
                        <div className="chat-weather-meta">
                          <span>💧 Humidity: {m.weatherData.humidity}%</span>
                          <span>💨 Wind: {m.weatherData.windSpeed} km/h</span>
                          <span>{m.weatherData.rain ? "⚠️ Wet roads" : "✅ Dry roads"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback Notice if weather lookup failed */}
                {m.weatherFailed && m.destinationName && (
                  <div className="chat-weather-notice">
                    ⚠️ Weather info for <strong>{m.destinationName}</strong> is temporarily unavailable. Recommended vehicles for <strong>{m.passengers} passenger(s)</strong> based on fleet availability:
                  </div>
                )}

                {/* Message Text */}
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>

                {/* Recommended Vehicle Cards */}
                {m.recommendations && m.recommendations.length > 0 && (
                  <div className="chat-rec-list">
                    {m.recommendations.map((rec) => (
                      <div key={rec.id} className="chat-rec-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{rec.name}</div>
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                              <span className="chat-rec-pill">{rec.category}</span>
                              <span className="chat-rec-pill">👥 {rec.seats} Seats</span>
                              <span className="chat-rec-pill">⛽ {rec.fuelType}</span>
                              <span className="chat-rec-pill">⚙️ {rec.transmission}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 800, color: "var(--accent)", fontSize: "0.98rem" }}>
                              ₹{rec.dailyRent.toLocaleString("en-IN")}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>/ day</div>
                          </div>
                        </div>

                        <div className="chat-rec-reason">
                          💡 <strong>Why this vehicle:</strong> {rec.reason}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            📍 {rec.branch}
                          </span>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: "0.74rem", padding: "4px 10px" }}
                            onClick={() => {
                              setIsOpen(false);
                              const targetVehicleId = rec._id || rec.id;
                              const bookingPath = `/vehicles/${targetVehicleId}`;
                              if (!user) {
                                navigate("/login", {
                                  state: {
                                    from: bookingPath,
                                    vehicleId: targetVehicleId,
                                    destination: m.destinationName || m.weatherData?.destination || "",
                                  },
                                });
                              } else {
                                navigate(bookingPath);
                              }
                            }}
                          >
                            Book Now →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick passenger selector chips */}
                {m.showPaxChips && (
                  <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="chat-sug-chip"
                      onClick={() => handleSend("2 passengers")}
                    >
                      👥 1–2 Passengers
                    </button>
                    <button
                      type="button"
                      className="chat-sug-chip"
                      onClick={() => handleSend("4 passengers")}
                    >
                      👨‍👩‍👧 3–4 Passengers
                    </button>
                    <button
                      type="button"
                      className="chat-sug-chip"
                      onClick={() => handleSend("6 passengers")}
                    >
                      🚐 5–7 Passengers
                    </button>
                  </div>
                )}

                <div className="chat-timestamp">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-bubble chat-bubble-ai" style={{ width: "fit-content" }}>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Disclaimer */}
          <div className="chat-disclaimer">
            {t("ai_disclaimer")}
          </div>

          {/* Input Box */}
          <div className="chat-input-row">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("ai_placeholder")}
              className="chat-input"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="btn btn-primary chat-send-btn"
            >
              {t("ai_send")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
