import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useFleet } from "../context/FleetContext";
import { useBookings } from "../context/BookingContext";
import { branches, categories } from "../data/mockData";
import { generateAssistantReply } from "../services/aiService";

export default function ChatAssistant() {
  const { t, lang } = useLanguage();
  const { user, isAdmin, isStaff } = useAuth();
  const { vehicles, coupons } = useFleet();
  const { bookings } = useBookings();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

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
        "Total revenue summary",
        "Show fleet utilization",
        "Which vehicles are in maintenance?",
        "Branch performance breakdown",
      ];
    }
    if (isStaff) {
      return [
        "Summarize today's branch bookings",
        "Which vehicles are in maintenance?",
        "How do I advance booking status?",
        "List ongoing trips",
      ];
    }
    return [
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
    [input, isTyping, messages, user, vehicles, bookings, coupons, lang]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
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
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
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
