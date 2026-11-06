-- ==============================================================
-- CineTogether - Production Supabase PostgreSQL Schema & RLS
-- Migration: 001_schema.sql
-- ==============================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_private BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  media_url TEXT DEFAULT '',
  is_playing BOOLEAN NOT NULL DEFAULT false,
  playback_position DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  playback_rate DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Indexing for fast room lookup and automatic 24h cleanup filtering
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON public.rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);

-- 3. ROOM PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'moderator', 'participant')),
  can_control_playback BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON public.room_participants(room_id);

-- 4. SECURITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);

-- ==============================================================
-- AUTOMATIC PROFILE TRIGGER (ON AUTH.USERS INSERT)
-- ==============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Public profiles are viewable by anyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- ROOMS POLICIES
CREATE POLICY "Active non-expired rooms are viewable by everyone" 
  ON public.rooms FOR SELECT 
  USING (expires_at > now());

CREATE POLICY "Authenticated users can create rooms" 
  ON public.rooms FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Only room host can update room state" 
  ON public.rooms FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = host_id);

CREATE POLICY "Only room host can delete room" 
  ON public.rooms FOR DELETE 
  TO authenticated 
  USING (auth.uid() = host_id);

-- ROOM PARTICIPANTS POLICIES
CREATE POLICY "Room participants are viewable by everyone in room" 
  ON public.room_participants FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can join rooms" 
  ON public.room_participants FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants or host can update status" 
  ON public.room_participants FOR UPDATE 
  TO authenticated 
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND host_id = auth.uid())
  );

CREATE POLICY "Participants can leave or host can kick" 
  ON public.room_participants FOR DELETE 
  TO authenticated 
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND host_id = auth.uid())
  );

-- SECURITY LOGS POLICIES
CREATE POLICY "Security logs insertable by authenticated and anonymous" 
  ON public.security_logs FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Only admin users can inspect security logs" 
  ON public.security_logs FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable Supabase Realtime publication for rooms and presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
