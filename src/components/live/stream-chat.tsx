"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  user: { name: string; username: string };
};

export function StreamChat({
  streamId,
  isLive,
  initialMessages,
}: {
  streamId: string;
  isLive: boolean;
  initialMessages: Message[];
}) {
  const { status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = React.useState(initialMessages);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const lastTimestamp = React.useRef(initialMessages.at(-1)?.createdAt ?? null);

  React.useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const url = lastTimestamp.current
        ? `/api/streams/${streamId}/messages?after=${encodeURIComponent(lastTimestamp.current)}`
        : `/api/streams/${streamId}/messages`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length) {
        setMessages((prev) => [...prev, ...data.messages]);
        lastTimestamp.current = data.messages.at(-1).createdAt;
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [streamId, isLive]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/live/${streamId}`)}`);
      return;
    }
    if (!text.trim() || !isLive) return;
    setSending(true);
    const res = await fetch(`/api/streams/${streamId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not send message");
      return;
    }
    setMessages((prev) => [...prev, data.message]);
    lastTimestamp.current = data.message.createdAt;
    setText("");
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">Live chat</div>
      <ScrollArea className="flex-1 px-4 py-3" style={{ maxHeight: 420 }}>
        <div className="flex flex-col gap-2.5">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground">No messages yet. Say hello.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="text-sm">
              <span className="font-medium text-gold-bright">@{m.user.username}</span>{" "}
              <span className="text-muted-foreground">{m.body}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isLive ? "Send a message…" : "Stream has ended"}
          disabled={!isLive}
          className="h-9"
        />
        <Button type="submit" size="icon" disabled={sending || !isLive} className="shrink-0">
          <Send className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}
