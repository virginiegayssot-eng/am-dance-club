import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getDownloadUrl, getPlaybackUrl } from "@/lib/r2";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  const download = req.nextUrl.searchParams.get("download") === "1";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Relies on the videos RLS policy (is_public or instructor) to decide access.
  const { data: video, error } = await supabase
    .from("videos")
    .select("title, video_type, r2_key")
    .eq("id", id)
    .single();

  if (error || !video) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (video.video_type !== "r2" || !video.r2_key) {
    return NextResponse.json({ error: "Not an R2 video" }, { status: 400 });
  }

  const url = download
    ? await getDownloadUrl(video.r2_key, `${video.title}.mp4`)
    : await getPlaybackUrl(video.r2_key);

  return NextResponse.json({ url });
}
