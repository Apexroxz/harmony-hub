-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON public.profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users manage their own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ARTISTS ============
CREATE TABLE public.artists (
  id text PRIMARY KEY,
  owner_id uuid,
  name text NOT NULL,
  handle text NOT NULL UNIQUE,
  bio text NOT NULL DEFAULT '',
  avatar_path text,
  avatar_url text,
  followers integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.artists TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artists TO authenticated;
GRANT ALL ON public.artists TO service_role;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artists are publicly readable" ON public.artists FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create their own artist page" ON public.artists FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update their artist page" ON public.artists FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners delete their artist page" ON public.artists FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- ============ TRACKS ============
CREATE TABLE public.tracks (
  id text PRIMARY KEY,
  title text NOT NULL,
  artist_id text NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  uploader_id uuid,
  cover_path text,
  cover_url text,
  audio_path text,
  audio_url text,
  duration integer NOT NULL DEFAULT 0,
  genre text NOT NULL DEFAULT 'Unsorted',
  quality text NOT NULL DEFAULT 'MP3' CHECK (quality IN ('FLAC','WAV','ALAC','MP3','AAC','OPUS')),
  bitrate integer NOT NULL DEFAULT 320,
  sample_rate integer NOT NULL DEFAULT 44100,
  bit_depth integer,
  waveform jsonb NOT NULL DEFAULT '[]'::jsonb,
  play_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  repost_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tracks_artist_id_idx ON public.tracks (artist_id);
CREATE INDEX tracks_created_at_idx ON public.tracks (created_at DESC);
GRANT SELECT ON public.tracks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT ALL ON public.tracks TO service_role;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tracks are publicly readable" ON public.tracks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users upload their own tracks" ON public.tracks FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Uploaders update their tracks" ON public.tracks FOR UPDATE TO authenticated USING (auth.uid() = uploader_id) WITH CHECK (auth.uid() = uploader_id);
CREATE POLICY "Uploaders delete their tracks" ON public.tracks FOR DELETE TO authenticated USING (auth.uid() = uploader_id);

-- ============ TRACK OWNERSHIP (web3 record, kept separate from the music model) ============
CREATE TABLE public.track_ownership (
  track_id text PRIMARY KEY REFERENCES public.tracks(id) ON DELETE CASCADE,
  storage_provider text NOT NULL DEFAULT 'cdn' CHECK (storage_provider IN ('ipfs','arweave','cdn')),
  royalty_contract text,
  token_address text,
  token_gated boolean NOT NULL DEFAULT false,
  collectible_enabled boolean NOT NULL DEFAULT false,
  royalty_split jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner_wallet text,
  price numeric(12,4),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.track_ownership TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_ownership TO authenticated;
GRANT ALL ON public.track_ownership TO service_role;
ALTER TABLE public.track_ownership ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ownership records are publicly readable" ON public.track_ownership FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Uploaders create ownership for their tracks" ON public.track_ownership FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.uploader_id = auth.uid()));
CREATE POLICY "Uploaders update ownership for their tracks" ON public.track_ownership FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.uploader_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.uploader_id = auth.uid()));
CREATE POLICY "Uploaders delete ownership for their tracks" ON public.track_ownership FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tracks t WHERE t.id = track_id AND t.uploader_id = auth.uid()));

-- ============ LIKES ============
CREATE TABLE public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, user_id)
);
CREATE INDEX likes_user_id_idx ON public.likes (user_id);
GRANT SELECT ON public.likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are publicly readable" ON public.likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create their own likes" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove their own likes" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REPOSTS ============
CREATE TABLE public.reposts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, user_id)
);
CREATE INDEX reposts_user_id_idx ON public.reposts (user_id);
GRANT SELECT ON public.reposts TO anon;
GRANT SELECT, INSERT, DELETE ON public.reposts TO authenticated;
GRANT ALL ON public.reposts TO service_role;
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reposts are publicly readable" ON public.reposts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create their own reposts" ON public.reposts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove their own reposts" ON public.reposts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  timestamp_seconds numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_track_id_idx ON public.comments (track_id, created_at DESC);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are publicly readable" ON public.comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create their own comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own comments" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ COUNTER MAINTENANCE ============
CREATE OR REPLACE FUNCTION public.sync_track_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target text;
  delta integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    target := NEW.track_id;
    delta := 1;
  ELSE
    target := OLD.track_id;
    delta := -1;
  END IF;

  IF TG_ARGV[0] = 'like_count' THEN
    UPDATE public.tracks SET like_count = GREATEST(0, like_count + delta) WHERE id = target;
  ELSIF TG_ARGV[0] = 'comment_count' THEN
    UPDATE public.tracks SET comment_count = GREATEST(0, comment_count + delta) WHERE id = target;
  ELSIF TG_ARGV[0] = 'repost_count' THEN
    UPDATE public.tracks SET repost_count = GREATEST(0, repost_count + delta) WHERE id = target;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER likes_sync_counter
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.sync_track_counter('like_count');

CREATE TRIGGER comments_sync_counter
AFTER INSERT OR DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.sync_track_counter('comment_count');

CREATE TRIGGER reposts_sync_counter
AFTER INSERT OR DELETE ON public.reposts
FOR EACH ROW EXECUTE FUNCTION public.sync_track_counter('repost_count');

-- Play counter, callable by anyone listening.
CREATE OR REPLACE FUNCTION public.increment_play_count(_track_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.tracks SET play_count = play_count + 1 WHERE id = _track_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_play_count(text) TO anon, authenticated;

-- ============ STORAGE ACCESS ============
CREATE POLICY "Media is readable for signed links" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id IN ('covers','audio'));
CREATE POLICY "Signed-in users upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('covers','audio') AND owner = auth.uid());
CREATE POLICY "Owners update their media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('covers','audio') AND owner = auth.uid());
CREATE POLICY "Owners delete their media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('covers','audio') AND owner = auth.uid());

-- ============ SEED CATALOGUE ============
INSERT INTO public.artists (id, name, handle, bio, avatar_path, followers, verified) VALUES
  ('neon-drifter', 'Neon Drifter', '@neondrifter', 'Lo-fi beats and midnight synths from the edge of the grid.', 'seed/cover-1.jpg', 12400, true),
  ('solana-siren', 'Solana Siren', '@solanasiren', 'Vocal-driven electronic pop, released as limited editions.', 'seed/cover-2.jpg', 8930, true),
  ('byte-bass', 'Byte Bass', '@bytebass', 'Deep bass experiments for late-night sessions and warehouse raves.', 'seed/cover-3.jpg', 5620, false);

INSERT INTO public.tracks (id, title, artist_id, cover_path, audio_url, duration, genre, quality, bitrate, sample_rate, bit_depth, play_count, like_count, comment_count, repost_count, created_at, waveform) VALUES
  ('midnight-protocol', 'Midnight Protocol', 'neon-drifter', 'seed/cover-1.jpg', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 184, 'Synthwave', 'FLAC', 1411, 44100, 16, 142300, 9840, 1260, 1260, '2026-07-12', (SELECT jsonb_agg(round((0.2 + random() * 0.8)::numeric, 2)) FROM generate_series(1, 64))),
  ('chain-reaction', 'Chain Reaction', 'neon-drifter', 'seed/cover-2.jpg', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 226, 'Cyberpunk', 'WAV', 4608, 96000, 24, 87600, 6410, 890, 890, '2026-06-28', (SELECT jsonb_agg(round((0.2 + random() * 0.8)::numeric, 2)) FROM generate_series(1, 64))),
  ('phantom-waves', 'Phantom Waves', 'solana-siren', 'seed/cover-3.jpg', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 198, 'Electropop', 'FLAC', 2304, 48000, 24, 210400, 15200, 2340, 2340, '2026-07-30', (SELECT jsonb_agg(round((0.2 + random() * 0.8)::numeric, 2)) FROM generate_series(1, 64))),
  ('validator-dreams', 'Validator Dreams', 'solana-siren', 'seed/cover-4.jpg', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', 252, 'Alt-Pop', 'AAC', 320, 48000, NULL, 54300, 4120, 470, 470, '2026-05-15', (SELECT jsonb_agg(round((0.2 + random() * 0.8)::numeric, 2)) FROM generate_series(1, 64))),
  ('hash-rate', 'Hash Rate', 'byte-bass', 'seed/cover-5.jpg', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', 174, 'Bass', 'ALAC', 1411, 44100, 16, 67800, 5230, 610, 610, '2026-07-05', (SELECT jsonb_agg(round((0.2 + random() * 0.8)::numeric, 2)) FROM generate_series(1, 64))),
  ('genesis-block', 'Genesis Block', 'byte-bass', 'seed/cover-6.jpg', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', 241, 'Dubstep', 'MP3', 320, 44100, NULL, 32100, 2870, 320, 320, '2026-04-20', (SELECT jsonb_agg(round((0.2 + random() * 0.8)::numeric, 2)) FROM generate_series(1, 64)));

INSERT INTO public.track_ownership (track_id, storage_provider, token_gated, collectible_enabled, royalty_contract, token_address, royalty_split, owner_wallet, price) VALUES
  ('midnight-protocol', 'ipfs', false, true, 'RoyaltyV1v9dK2s1pQhJ8mZbT4', NULL, '[{"wallet":"7xKXtg2CW87d97TXJSDpbD5jBkheTuwA","percentage":100}]'::jsonb, '7xKXtg2CW87d97TXJSDpbD5jBkheTuwA', NULL),
  ('chain-reaction', 'arweave', true, true, 'RoyaltyV1v9dK2s1pQhJ8mZbT4', '7xKXtg2CW87d97TXJSDpbD5jBkheTuwA', '[{"wallet":"7xKXtg2CW87d97TXJSDpbD5jBkheTuwA","percentage":85},{"wallet":"4bQMtg9ZW21c55TXJSDpbD5jBkheTuwF","percentage":15}]'::jsonb, '7xKXtg2CW87d97TXJSDpbD5jBkheTuwA', 0.5),
  ('phantom-waves', 'ipfs', false, false, NULL, NULL, '[{"wallet":"8sLPtg5QW44b21TXJSDpbD5jBkheTuwD","percentage":100}]'::jsonb, '8sLPtg5QW44b21TXJSDpbD5jBkheTuwD', NULL),
  ('validator-dreams', 'cdn', true, true, 'RoyaltyV1kP4r7tYbN2xW9qLc', '9yMNtg4DX98d98TXJSDpbD5jBkheTuwB', '[{"wallet":"8sLPtg5QW44b21TXJSDpbD5jBkheTuwD","percentage":100}]'::jsonb, '8sLPtg5QW44b21TXJSDpbD5jBkheTuwD', 1.2),
  ('hash-rate', 'arweave', false, true, NULL, NULL, '[{"wallet":"2fRTtg8JX77e33TXJSDpbD5jBkheTuwE","percentage":100}]'::jsonb, '2fRTtg8JX77e33TXJSDpbD5jBkheTuwE', NULL),
  ('genesis-block', 'ipfs', true, true, 'RoyaltyV1kP4r7tYbN2xW9qLc', '3zKPtg7EX65d97TXJSDpbD5jBkheTuwC', '[{"wallet":"2fRTtg8JX77e33TXJSDpbD5jBkheTuwE","percentage":100}]'::jsonb, '2fRTtg8JX77e33TXJSDpbD5jBkheTuwE', 0.8);