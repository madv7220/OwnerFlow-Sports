"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Heart, MessageCircle, Send } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SportBadge } from "@/components/shared/sport-badge";
import { cn, timeAgo } from "@/lib/utils";

const TYPE_COLORS: Record<string, "default" | "emerald" | "crimson" | "secondary"> = {
  ALERT: "crimson",
  RESULT: "emerald",
  ANALYSIS: "default",
  NEWS: "secondary",
};

export type FeedComment = {
  id: string;
  body: string;
  createdAt: string;
  user: { name: string; username: string };
};

export function FeedPostCard({
  id,
  title,
  body,
  type,
  sport,
  createdAt,
  author,
  initialLikeCount,
  initiallyLiked,
  initialComments,
}: {
  id: string;
  title: string;
  body: string;
  type: string;
  sport: string | null;
  createdAt: string;
  author: { name: string; username: string };
  initialLikeCount: number;
  initiallyLiked: boolean;
  initialComments: FeedComment[];
}) {
  const { status } = useSession();
  const router = useRouter();
  const [liked, setLiked] = React.useState(initiallyLiked);
  const [likeCount, setLikeCount] = React.useState(initialLikeCount);
  const [comments, setComments] = React.useState(initialComments);
  const [showComments, setShowComments] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  const initials = author.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  async function toggleLike() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/feed")}`);
      return;
    }
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    const res = await fetch(`/api/feed/${id}/like`, { method: "POST" });
    if (!res.ok) {
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
      toast.error("Could not update like");
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent("/feed")}`);
      return;
    }
    if (!commentText.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/feed/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentText.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setPosting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not post comment");
      return;
    }
    setComments((c) => [
      ...c,
      { id: data.comment.id, body: data.comment.body, createdAt: data.comment.createdAt, user: data.comment.user },
    ]);
    setCommentText("");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <Link href={`/handicappers/${author.username}`} className="flex items-center gap-2.5 group">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium group-hover:text-gold-bright">{author.name}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(new Date(createdAt))}</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {sport && <SportBadge sport={sport} />}
          <Badge variant={TYPE_COLORS[type] ?? "secondary"}>{type}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        <h3 className="font-display text-lg leading-snug">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>

        <div className="flex items-center gap-4 border-t border-border/70 pt-3">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-crimson cursor-pointer"
          >
            <Heart className={cn("size-4", liked && "fill-crimson text-crimson")} />
            {likeCount}
          </button>
          <button
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <MessageCircle className="size-4" />
            {comments.length}
          </button>
        </div>

        {showComments && (
          <div className="flex flex-col gap-3 border-t border-border/70 pt-3">
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground">No comments yet. Start the conversation.</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2 text-sm">
                <span className="shrink-0 font-medium text-gold-bright">@{c.user.username}</span>
                <span className="text-muted-foreground">{c.body}</span>
              </div>
            ))}
            <form onSubmit={submitComment} className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                className="h-9"
              />
              <Button type="submit" size="icon" disabled={posting} className="shrink-0">
                <Send className="size-3.5" />
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
