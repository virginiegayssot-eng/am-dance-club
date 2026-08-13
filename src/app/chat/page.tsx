"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { MessageCircle, GraduationCap, Pencil, Heart, Image as ImageIcon, X } from "lucide-react";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  channel: "group" | "direct";
  body: string;
  image_url?: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string; avatar_url: string | null };
  likeCount?: number;
  likedByMe?: boolean;
};

type Conversation = {
  profile: Profile;
  lastMessage: string;
  unread: number;
};

// Supabase's auth token refresh can occasionally hang (a known issue with
// long-idle tabs / iOS standalone PWAs), which would otherwise leave every
// request stuck forever and the Send button spinning indefinitely. This caps
// how long we wait so the UI always recovers with an error instead of
// freezing.
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timed out")), ms)),
  ]);
}

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [me, setMe] = useState<Profile | null>(null);
  const [activeChannel, setActiveChannel] = useState<"group" | string>("group");
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dmTarget, setDmTarget] = useState<Profile | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState("");
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const meRef = useRef<Profile | null>(null);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (activeChannel === "group") {
      loadGroupMessages();
    } else {
      loadDMs(activeChannel);
    }

    // Set up realtime subscription
    const channelName = activeChannel === "group" ? "group-chat" : `dm-${activeChannel}`;
    const ch = supabase.channel(channelName);

    ch.on("postgres_changes" as any, {
      event: "UPDATE",
      schema: "public",
      table: "messages",
    }, (payload: any) => {
      const msg = payload.new as Message;
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, body: msg.body } : m));
    });

    ch.on("postgres_changes" as any, {
      event: "INSERT",
      schema: "public",
      table: "messages",
    }, async (payload: any) => {
      const msg = payload.new as Message;

      if (activeChannel === "group" && msg.channel !== "group") return;
      if (activeChannel !== "group") {
        const relevant =
          (msg.sender_id === activeChannel && msg.recipient_id === me?.id) ||
          (msg.sender_id === me?.id && msg.recipient_id === activeChannel);
        if (!relevant) return;
      }

      const { data } = await supabase
        .from("messages")
        .select("*, profiles!sender_id(full_name, email, avatar_url)")
        .eq("id", msg.id)
        .single();
      if (data) setMessages(prev => [...prev, data as Message]);
    });

    ch.subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [activeChannel, me?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setMe(prof);
    meRef.current = prof;

    if (prof?.role === "instructor") {
      const { data: studs } = await supabase
        .from("profiles").select("*").eq("role", "student").order("full_name");
      setStudents(studs ?? []);
      await loadConversations(prof.id, studs ?? []);
    }

    setLoading(false);

    const dmParam = new URLSearchParams(window.location.search).get("dm");
    if (dmParam) {
      setActiveChannel(dmParam);
      const { data: target } = await supabase.from("profiles").select("*").eq("id", dmParam).single();
      setDmTarget(target);
    }
  }

  async function loadConversations(myId: string, studs: Profile[]) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*, profiles!sender_id(full_name, email, avatar_url)")
      .eq("channel", "direct")
      .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
      .order("created_at", { ascending: false });

    const counts: Record<string, number> = {};
    const latest: Record<string, string> = {};

    for (const m of msgs ?? []) {
      const otherId = m.sender_id === myId ? m.recipient_id : m.sender_id;
      if (!otherId) continue;
      if (!latest[otherId]) latest[otherId] = m.body;
      if (!m.read_at && m.recipient_id === myId) {
        counts[otherId] = (counts[otherId] ?? 0) + 1;
      }
    }

    setUnreadCounts(counts);
    const convos: Conversation[] = studs
      .filter(s => latest[s.id])
      .map(s => ({ profile: s, lastMessage: latest[s.id], unread: counts[s.id] ?? 0 }));
    setConversations(convos);
  }

  async function attachLikes(msgs: Message[]): Promise<Message[]> {
    if (msgs.length === 0) return msgs;
    const ids = msgs.map(m => m.id);
    const { data: likes } = await supabase.from("message_likes").select("message_id, user_id").in("message_id", ids);
    const myId = meRef.current?.id;
    return msgs.map(m => ({
      ...m,
      likeCount: likes?.filter(l => l.message_id === m.id).length ?? 0,
      likedByMe: likes?.some(l => l.message_id === m.id && l.user_id === myId) ?? false,
    }));
  }

  async function loadGroupMessages() {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*, profiles!sender_id(full_name, email, avatar_url)")
      .eq("channel", "group")
      .order("created_at", { ascending: true })
      .limit(100);
    const withLikes = await attachLikes((data as Message[]) ?? []);
    setMessages(withLikes);
    localStorage.setItem("chat_group_last_read", new Date().toISOString());
    setLoading(false);
  }

  async function loadDMs(otherId: string) {
    setLoading(true);
    if (!me) return;

    const { data } = await supabase
      .from("messages")
      .select("*, profiles!sender_id(full_name, email, avatar_url)")
      .eq("channel", "direct")
      .or(
        `and(sender_id.eq.${me.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${me.id})`
      )
      .order("created_at", { ascending: true })
      .limit(100);

    const withLikes = await attachLikes((data as Message[]) ?? []);
    setMessages(withLikes);

    // Mark received messages as read
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("channel", "direct")
      .eq("sender_id", otherId)
      .eq("recipient_id", me.id)
      .is("read_at", null);

    setLoading(false);
  }


  async function toggleLike(msgId: string, likedByMe: boolean) {
    const myId = meRef.current?.id;
    if (!myId) return;
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msgId ? {
      ...m,
      likedByMe: !likedByMe,
      likeCount: (m.likeCount ?? 0) + (likedByMe ? -1 : 1),
    } : m));
    if (likedByMe) {
      await supabase.from("message_likes").delete().eq("message_id", msgId).eq("user_id", myId);
    } else {
      await supabase.from("message_likes").insert({ message_id: msgId, user_id: myId });
    }
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be under 5MB.");
      return;
    }
    setImageError("");

    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!body.trim() && !pendingImage) || !me) return;
    setSending(true);
    setImageError("");
    setSendError("");

    try {
      let imageUrl: string | null = null;
      if (pendingImage) {
        const res = await withTimeout(
          fetch("/api/chat/upload-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ base64: pendingImage }),
          }),
          20000
        );
        const result = await res.json();
        if (result.error) {
          setImageError(result.error);
          return;
        }
        imageUrl = result.url;
      }

      const payload: Record<string, string | null> = {
        sender_id: me.id,
        channel: activeChannel === "group" ? "group" : "direct",
        body: body.trim(),
        image_url: imageUrl,
      };
      if (activeChannel !== "group") payload.recipient_id = activeChannel;

      const { error } = await withTimeout(supabase.from("messages").insert(payload), 15000);
      if (error) {
        setSendError(`Message didn't send: ${error.message}`);
        return;
      }

      setBody("");
      setPendingImage(null);
    } catch {
      setSendError("Taking too long to send. Check your connection and try again.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function saveEdit(msgId: string) {
    if (!editBody.trim()) return;
    await supabase.from("messages").update({ body: editBody.trim() }).eq("id", msgId).eq("sender_id", me!.id);
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, body: editBody.trim() } : m));
    setEditingId(null);
  }

  function selectDM(profile: Profile) {
    setDmTarget(profile);
    setActiveChannel(profile.id);
  }

  const activeName =
    activeChannel === "group"
      ? "Group Chat"
      : dmTarget?.full_name ?? dmTarget?.email ?? "Direct Message";

  if (loading && !me) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fff8f3]">
      <div className="font-body text-gray-400">Loading…</div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-col flex-1 overflow-hidden max-w-6xl mx-auto w-full px-0 sm:px-6 py-0 sm:py-6 md:flex-row gap-4">

        {/* Mobile channel switcher for students */}
        {me?.role !== "instructor" && (
          <div className="md:hidden flex flex-row gap-2 px-3 pt-3 shrink-0">
            <button
              onClick={() => { setActiveChannel("group"); setDmTarget(null); }}
              className={`flex-1 py-2.5 rounded-xl font-body text-sm text-center transition-colors inline-flex items-center justify-center gap-1.5 ${activeChannel === "group" ? "bg-[#2041d8] text-white" : "bg-white border border-gray-200 text-black"}`}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.75} /> Group Chat
            </button>
            <button
              onClick={async () => {
                const { data: instructors } = await supabase.from("profiles").select("*").eq("role", "instructor").limit(1);
                if (instructors?.[0]) selectDM(instructors[0]);
              }}
              className={`flex-1 py-2.5 rounded-xl font-body text-sm text-center transition-colors ${activeChannel !== "group" ? "bg-[#2041d8] text-white" : "bg-white border border-gray-200 text-black"}`}
            >
              Message Ginny
            </button>
            <a
              href="https://chat.whatsapp.com/JNXSwB4Y1aO6ardffyyJXD?mode=gi_t"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 rounded-xl font-body text-sm text-center transition-colors bg-white border border-gray-200 text-black"
            >
              WhatsApp
            </a>
          </div>
        )}

        {/* Mobile channel switcher for instructor */}
        {me?.role === "instructor" && (
          <div className="md:hidden shrink-0 bg-white border-b border-gray-100">
            <div className="flex overflow-x-auto gap-2 px-3 pt-3 pb-2 scrollbar-hide">
              <button
                onClick={() => { setActiveChannel("group"); setDmTarget(null); }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl font-body text-sm transition-colors inline-flex items-center gap-1.5 ${activeChannel === "group" ? "bg-[#2041d8] text-white" : "bg-gray-100 text-black"}`}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.75} /> Group
              </button>
              {students.map(s => {
                const isActive = activeChannel === s.id;
                const unread = unreadCounts[s.id] ?? 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => selectDM(s)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl font-body text-sm transition-colors ${isActive ? "bg-[#2041d8] text-white" : "bg-gray-100 text-black"}`}
                  >
                    {s.full_name?.split(" ")[0] ?? s.email}
                    {unread > 0 && (
                      <span className={`text-xs font-heading w-4 h-4 rounded-full flex items-center justify-center ${isActive ? "bg-white text-[#2041d8]" : "bg-[#2041d8] text-white"}`}>
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 bg-white rounded-2xl border border-[#e4c3cc]/30 overflow-hidden">
          {/* Group chat */}
          <button
            onClick={() => { setActiveChannel("group"); setDmTarget(null); }}
            className={`flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 transition-colors ${activeChannel === "group" ? "bg-[#2041d8] text-white" : "hover:bg-gray-50"}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${activeChannel === "group" ? "bg-white/20" : "bg-[#a3bdfe]/30"}`}>
              <MessageCircle className={`w-4 h-4 ${activeChannel === "group" ? "text-white" : "text-[#2041d8]"}`} strokeWidth={1.75} />
            </div>
            <div>
              <p className={`font-heading text-sm ${activeChannel === "group" ? "text-white" : ""}`}>Group Chat</p>
              <p className={`font-body text-xs ${activeChannel === "group" ? "text-white/70" : "text-gray-400"}`}>Everyone</p>
            </div>
          </button>

          {/* DMs */}
          <div className="flex-1 overflow-y-auto">
            {me?.role === "instructor" ? (
              <>
                <p className="font-heading text-xs uppercase tracking-widest text-gray-400 px-4 pt-3 pb-1">Members</p>
                {students.map(s => {
                  const isActive = activeChannel === s.id;
                  const unread = unreadCounts[s.id] ?? 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectDM(s)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isActive ? "bg-[#e4c3cc]/30" : "hover:bg-gray-50"}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#e4c3cc]/50 overflow-hidden flex items-center justify-center text-xs font-heading shrink-0">
                        {s.avatar_url ? <Image src={s.avatar_url} alt="" width={32} height={32} className="object-cover w-full h-full" /> : (s.full_name ?? s.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm truncate">{s.full_name ?? s.email}</p>
                      </div>
                      {unread > 0 && (
                        <span className="bg-[#2041d8] text-white text-xs font-heading w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="px-4 py-3">
                <p className="font-heading text-xs uppercase tracking-widest text-gray-400 mb-2">Direct Message</p>
                <button
                  onClick={async () => {
                    const { data: instructors } = await supabase
                      .from("profiles").select("*").eq("role", "instructor").limit(1);
                    if (instructors?.[0]) selectDM(instructors[0]);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${activeChannel !== "group" ? "bg-[#e4c3cc]/30" : "hover:bg-gray-50"}`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#2041d8]/10 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-[#2041d8]" strokeWidth={1.75} />
                  </div>
                  <p className="font-body text-sm">Message Instructor</p>
                </button>
              </div>
            )}
          </div>

          {/* WhatsApp link */}
          <a
            href="https://chat.whatsapp.com/JNXSwB4Y1aO6ardffyyJXD?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-[#2041d8] shrink-0" strokeWidth={1.75} />
            <div className="flex-1 min-w-0">
              <p className="font-heading text-xs">WhatsApp Group</p>
              <p className="font-body text-xs text-gray-400">Polls & community</p>
            </div>
            <span className="text-xs text-[#25D366]">→</span>
          </a>
        </aside>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col bg-white sm:rounded-2xl border border-[#e4c3cc]/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-[#fff8f3]">
            <div className="w-9 h-9 rounded-full bg-[#e4c3cc]/50 flex items-center justify-center text-sm font-heading overflow-hidden shrink-0">
              {activeChannel === "group" ? (
                <MessageCircle className="w-4 h-4 text-[#2041d8]" strokeWidth={1.75} />
              ) : dmTarget?.avatar_url ? (
                <Image src={dmTarget.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
              ) : (
                (dmTarget?.full_name ?? "?")[0]?.toUpperCase()
              )}
            </div>
            <div>
              <p className="font-heading text-sm">{activeName}</p>
              <p className="font-body text-xs text-gray-400">
                {activeChannel === "group" ? "All members & instructor" : "Private message"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="font-body text-gray-400 text-sm">Loading messages…</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <MessageCircle className="w-9 h-9 text-[#2041d8]" strokeWidth={1.5} />
                <p className="font-heading text-sm text-gray-400">
                  {activeChannel === "group" ? "Start the group conversation!" : "Send a message to get started"}
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isMe = msg.sender_id === me?.id;
                const senderName = isMe ? (me?.full_name ?? me?.email ?? "You") : (msg.profiles?.full_name ?? msg.profiles?.email ?? "Unknown");
                const time = new Date(msg.created_at).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
                const date = new Date(msg.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
                const canEdit = isMe && (Date.now() - new Date(msg.created_at).getTime()) < 5 * 60 * 1000;
                const isEditing = editingId === msg.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2 group`}>
                    {activeChannel === "group" && !isMe && (
                      <div className="w-7 h-7 rounded-full bg-[#e4c3cc]/50 flex items-center justify-center text-[10px] font-heading overflow-hidden shrink-0 mb-1">
                        {msg.profiles?.avatar_url ? (
                          <Image src={msg.profiles.avatar_url} alt="" width={28} height={28} className="object-cover w-full h-full" />
                        ) : (
                          senderName[0]?.toUpperCase()
                        )}
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      {activeChannel === "group" && (
                        <span className="font-heading text-xs text-gray-400 px-1">{senderName}</span>
                      )}
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input
                            autoFocus
                            className="input text-sm py-1.5 px-3 min-w-[180px]"
                            value={editBody}
                            onChange={e => setEditBody(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") saveEdit(msg.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <button onClick={() => saveEdit(msg.id)} className="font-body text-xs text-[#2041d8] hover:underline">Save</button>
                          <button onClick={() => setEditingId(null)} className="font-body text-xs text-gray-400 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-end gap-1.5">
                          {canEdit && isMe && (
                            <button
                              onClick={() => { setEditingId(msg.id); setEditBody(msg.body); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 text-xs pb-1 order-first"
                              title="Edit message"
                            >
                              <Pencil className="w-3 h-3" strokeWidth={1.75} />
                            </button>
                          )}
                          <div className={`rounded-2xl overflow-hidden font-body text-sm leading-relaxed ${
                            isMe
                              ? "bg-[#2041d8] text-white rounded-br-sm"
                              : "bg-[#e4c3cc]/25 text-black rounded-bl-sm"
                          }`}>
                            {msg.image_url && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={msg.image_url} alt="" className="max-w-full max-h-80 object-cover" />
                            )}
                            {msg.body && <div className="px-4 py-2.5">{msg.body}</div>}
                          </div>
                        </div>
                      )}
                      <div className={`flex items-center gap-2 px-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        <button
                          onClick={() => toggleLike(msg.id, msg.likedByMe ?? false)}
                          className={`flex items-center gap-1 text-xs transition-all ${msg.likedByMe ? "text-red-500" : "text-gray-300 hover:text-red-400"}`}
                        >
                          <Heart className="w-3.5 h-3.5" strokeWidth={1.75} fill={msg.likedByMe ? "currentColor" : "none"} />
                          {(msg.likeCount ?? 0) > 0 && <span className="font-body">{msg.likeCount}</span>}
                        </button>
                        <span className="font-body text-xs text-gray-300">{date} · {time}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 bg-[#fff8f3]">
            {pendingImage && (
              <div className="px-4 pt-3 flex items-center gap-2">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pendingImage} alt="" className="h-16 w-16 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}
            {imageError && (
              <p className="px-4 pt-2 font-body text-xs text-red-500">{imageError}</p>
            )}
            {sendError && (
              <p className="px-4 pt-2 font-body text-xs text-red-500">{sendError}</p>
            )}
            <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={sending}
                className="text-gray-400 hover:text-[#2041d8] shrink-0"
                title="Attach an image"
              >
                <ImageIcon className="w-5 h-5" strokeWidth={1.75} />
              </button>
              <input
                ref={inputRef}
                className="input flex-1 py-2.5 text-sm"
                placeholder={`Message ${activeChannel === "group" ? "everyone" : (dmTarget?.full_name?.split(" ")[0] ?? "instructor")}…`}
                value={body}
                onChange={e => setBody(e.target.value)}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={(!body.trim() && !pendingImage) || sending}
                className="btn-primary py-2.5 px-4 text-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

