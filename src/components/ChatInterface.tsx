import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import type { VehicleMetrics, Alert } from "@/lib/mock-data";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/greenpulse-chat`;

function buildContext(
  vehicles: VehicleMetrics[],
  alerts: Alert[],
  totalEmissions: number
): string {
  const sorted = [...vehicles].sort((a, b) => b.totalCarbonKg - a.totalCarbonKg);
  const vehicleLines = sorted
    .map(
      (v) =>
        `${v.vehicleId} (${v.name}, ${v.type}): ${v.totalCarbonKg.toFixed(1)} kg CO₂, efficiency ${v.fuelEfficiency.toFixed(1)} km/L, avg speed ${v.avgSpeed.toFixed(0)} km/h, ${v.tripCount} trips, status: ${v.status}, ${v.alertCount} alerts`
    )
    .join("\n");
  const alertLines = alerts
    .slice(0, 10)
    .map((a) => `[${a.severity.toUpperCase()}] ${a.vehicleId}: ${a.message} (${a.type}, ${a.timestamp.toLocaleTimeString()})`)
    .join("\n");

  return `Fleet Total Emissions: ${totalEmissions.toFixed(1)} kg CO₂
Active Vehicles: ${vehicles.filter((v) => v.status === "active").length}/${vehicles.length}
Total Active Alerts: ${alerts.length}

VEHICLE DATA:
${vehicleLines}

RECENT ALERTS:
${alertLines || "No recent alerts."}`;
}

interface ChatInterfaceProps {
  vehicles: VehicleMetrics[];
  alerts: Alert[];
  totalEmissions: number;
}

export function ChatInterface({ vehicles, alerts, totalEmissions }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 I'm **GreenPulse AI**, your real-time carbon intelligence assistant. Ask me about emissions, alerts, vehicle performance, or shipment status.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    const userMessages = [...messages, userMsg];
    setMessages(userMessages);
    const query = input;
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id === "streaming") {
          return prev.map((m) =>
            m.id === "streaming" ? { ...m, content: assistantContent } : m
          );
        }
        return [
          ...prev,
          { id: "streaming", role: "assistant" as const, content: assistantContent, timestamp: new Date() },
        ];
      });
    };

    try {
      const context = buildContext(vehicles, alerts, totalEmissions);
      const apiMessages = userMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, context }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "AI service unavailable" }));
        toast({ title: "Error", description: err.error, variant: "destructive" });
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {}
        }
      }

      // Finalize streaming message id
      setMessages((prev) =>
        prev.map((m) => (m.id === "streaming" ? { ...m, id: Date.now().toString() } : m))
      );
    } catch (e) {
      console.error("Chat error:", e);
      toast({ title: "Error", description: "Failed to get AI response", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">GreenPulse AI</h3>
          <p className="text-[10px] text-muted-foreground">Powered by real-time fleet intelligence</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                  msg.role === "user" ? "bg-secondary" : "gradient-primary"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5 text-secondary-foreground" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    h3: ({ children }) => <h3 className="mb-2 text-sm font-bold">{children}</h3>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            Thinking...
          </div>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about emissions, alerts, vehicles..."
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary text-primary-foreground transition-opacity disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
