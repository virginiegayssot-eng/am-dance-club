import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: "student" | "instructor";
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  created_at: string;
};

export type Class = {
  id: string;
  title: string;
  description: string | null;
  location: string;
  class_date: string;
  class_time: string;
  duration_minutes: number;
  alt_duration_minutes: number | null;
  alt_price_cents: number | null;
  capacity: number;
  price_cents: number;
  stripe_price_id: string | null;
  instructor_id: string | null;
  is_cancelled: boolean;
  created_at: string;
};

export type Registration = {
  id: string;
  class_id: string;
  student_id: string;
  status: "pending" | "confirmed" | "cancelled" | "refunded";
  stripe_payment_intent_id: string | null;
  amount_paid_cents: number | null;
  pass_id: string | null;
  guest_count: number;
  payment_type: "casual" | "pass" | "double" | "complimentary";
  created_at: string;
};

export type PassType = {
  id: string;
  name: string;
  description: string | null;
  classes_included: number | null;
  price_cents: number;
  validity_days: number | null;
  max_guests: number;
  new_students_only: boolean;
};

export type Pass = {
  id: string;
  student_id: string;
  pass_type_id: string;
  classes_total: number;
  classes_remaining: number;
  expires_at: string | null;
  stripe_session_id: string | null;
  source: string | null;
  amount_paid_cents: number | null;
  created_at: string;
  pass_types?: PassType;
};

export type Attendance = {
  id: string;
  class_id: string;
  student_id: string;
  attended: boolean;
  marked_at: string;
};

export type Video = {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  youtube_id: string;
  class_id: string | null;
  is_public: boolean;
  created_at: string;
};

export type Playlist = {
  id: string;
  title: string;
  description: string | null;
  spotify_url: string;
  spotify_id: string;
  created_at: string;
};

export type MerchProduct = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  sizes: string[] | null;
  active: boolean;
  created_at: string;
};

export type MerchOrder = {
  id: string;
  product_id: string | null;
  student_id: string;
  size: string | null;
  amount_paid_cents: number | null;
  stripe_session_id: string | null;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
};
