"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  channel: "group" | "direct";
  body: string;
  created_at: string;
  profiles?: { full_name: string | null; email: string };
};

type Conversation = {
  profile: Profile;
  lastMessage: string;
  unread: number;
};

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [me, setMe] = useState<Profile | null>(null);
  const [activeChannel, setActiveChannel] = useState<"group" | string>("group");
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dmTarget, setDmTarget] = useState<Profile | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

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
        .select("*, profiles!sender_id(full_name, email)")
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
      .select("*, profiles!sender_id(full_name, email)")
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

  async function loadGroupMessages() {
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*, profiles!sender_id(full_name, email)")
      .eq("channel", "group")
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }

  async function loadDMs(otherId: string) {
    setLoading(true);
    if (!me) return;

    const { data } = await supabase
      .from("messages")
      .select("*, profiles!sender_id(full_name, email)")
      .eq("channel", "direct")
      .or(
        `and(sender_id.eq.${me.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${me.id})`
      )
      .order("created_at", { ascending: true })
      .limit(100);

    setMessages((data as Message[]) ?? []);

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


  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !me) return;
    setSending(true);

    const payload: Record<string, string> = {
      sender_id: me.id,
      channel: activeChannel === "group" ? "group" : "direct",
      body: body.trim(),
    };
    if (activeChannel !== "group") payload.recipient_id = activeChannel;

    await supabase.from("messages").insert(payload);
    setBody("");
    setSending(false);
    inputRef.current?.focus();
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
              className={`flex-1 py-2.5 rounded-xl font-body text-sm text-center transition-colors ${activeChannel === "group" ? "bg-[#2041d8] text-white" : "bg-white border border-gray-200 text-black"}`}
            >
              💬 Group Chat
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
                className={`flex-shrink-0 px-4 py-2 rounded-xl font-body text-sm transition-colors ${activeChannel === "group" ? "bg-[#2041d8] text-white" : "bg-gray-100 text-black"}`}
              >
                💬 Group
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
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-heading shrink-0 ${activeChannel === "group" ? "bg-white/20" : "bg-[#a3bdfe]/30"}`}>
              💬
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
                  <div className="w-8 h-8 rounded-full bg-[#2041d8]/10 flex items-center justify-center text-xs font-heading">
                    👩‍🏫
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
            <span className="text-lg">💬</span>
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
            <div className="w-9 h-9 rounded-full bg-[#e4c3cc]/50 flex items-center justify-center text-sm font-heading">
              {activeChannel === "group" ? "💬" : (dmTarget?.full_name ?? "?")[0]?.toUpperCase()}
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
                <span className="text-4xl">👋</span>
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
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      {activeChannel === "group" && (
                        <span className="font-heading text-xs text-gray-400 px-1">{senderName}</span>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl font-body text-sm leading-relaxed ${
                        isMe
                          ? "bg-[#2041d8] text-white rounded-br-sm"
                          : "bg-[#e4c3cc]/25 text-black rounded-bl-sm"
                      }`}>
                        {msg.body}
                      </div>
                      <span className="font-body text-xs text-gray-300 px-1">{date} · {time}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-[#fff8f3]">
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
              disabled={!body.trim() || sending}
              className="btn-primary py-2.5 px-4 text-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

