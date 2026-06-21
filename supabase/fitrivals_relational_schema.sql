-- DuoGym Relational Database Schema Setup
-- Run this in the Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (already exists, but check or create)
CREATE TABLE IF NOT EXISTS public.fitrivals_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  auth_email TEXT NOT NULL,
  rival_username TEXT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on Profiles
ALTER TABLE public.fitrivals_profiles ENABLE ROW LEVEL SECURITY;

-- 2. Workout Logs
CREATE TABLE IF NOT EXISTS public.duogym_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  workout_date DATE NOT NULL,
  completed_exercises TEXT[] NOT NULL DEFAULT '{}',
  water_intake INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, workout_date)
);

ALTER TABLE public.duogym_workouts ENABLE ROW LEVEL SECURITY;

-- 3. Weight Logs
CREATE TABLE IF NOT EXISTS public.duogym_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  log_date DATE NOT NULL,
  weight NUMERIC(5, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, log_date)
);

ALTER TABLE public.duogym_weights ENABLE ROW LEVEL SECURITY;

-- 4. Notes Logs
CREATE TABLE IF NOT EXISTS public.duogym_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  log_date DATE NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, log_date)
);

ALTER TABLE public.duogym_notes ENABLE ROW LEVEL SECURITY;

-- 5. Body Measurements
CREATE TABLE IF NOT EXISTS public.duogym_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  log_date DATE NOT NULL,
  chest NUMERIC(5, 2),
  biceps NUMERIC(5, 2),
  waist NUMERIC(5, 2),
  hips NUMERIC(5, 2),
  thighs NUMERIC(5, 2),
  calves NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, log_date)
);

ALTER TABLE public.duogym_measurements ENABLE ROW LEVEL SECURITY;

-- 6. Progress Photos
CREATE TABLE IF NOT EXISTS public.duogym_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  log_date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, log_date)
);

ALTER TABLE public.duogym_photos ENABLE ROW LEVEL SECURITY;

-- 7. Unlocked Badges
CREATE TABLE IF NOT EXISTS public.duogym_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, badge_id)
);

ALTER TABLE public.duogym_badges ENABLE ROW LEVEL SECURITY;

-- 8. Activity Movement logs (Health Connect data)
CREATE TABLE IF NOT EXISTS public.duogym_activity_movement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  log_date DATE NOT NULL,
  steps INTEGER NOT NULL DEFAULT 0,
  distance NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  active_minutes INTEGER NOT NULL DEFAULT 0,
  floors INTEGER NOT NULL DEFAULT 0,
  active_calories INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, log_date)
);

ALTER TABLE public.duogym_activity_movement ENABLE ROW LEVEL SECURITY;

-- 9. Activity Sleep logs
CREATE TABLE IF NOT EXISTS public.duogym_activity_sleep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  log_date DATE NOT NULL,
  bedtime TEXT,
  wake_time TEXT,
  quality INTEGER NOT NULL DEFAULT 0,
  duration NUMERIC(4, 2) NOT NULL DEFAULT 0.0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, log_date)
);

ALTER TABLE public.duogym_activity_sleep ENABLE ROW LEVEL SECURITY;

-- 10. User XP Level & Total
CREATE TABLE IF NOT EXISTS public.duogym_xp (
  username TEXT PRIMARY KEY REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  xp_level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.duogym_xp ENABLE ROW LEVEL SECURITY;

-- 11. Social Feed Table
CREATE TABLE IF NOT EXISTS public.duogym_social_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  message TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.duogym_social_feed ENABLE ROW LEVEL SECURITY;

-- 12. Diet Profile Settings
CREATE TABLE IF NOT EXISTS public.duogym_diet_profile (
  username TEXT PRIMARY KEY REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  age INTEGER NOT NULL DEFAULT 18,
  height NUMERIC(5, 2) NOT NULL DEFAULT 170.0,
  weight NUMERIC(5, 2) NOT NULL DEFAULT 70.0,
  goal_weight NUMERIC(5, 2) NOT NULL DEFAULT 70.0,
  target_calories INTEGER NOT NULL DEFAULT 2000,
  target_protein INTEGER,
  target_carbs INTEGER,
  target_fat INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.duogym_diet_profile ENABLE ROW LEVEL SECURITY;

-- 13. Daily Diet Logs (Meals)
CREATE TABLE IF NOT EXISTS public.duogym_diet_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  log_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'EveningSnacks', 'Dinner')),
  food_name TEXT NOT NULL,
  serving TEXT NOT NULL DEFAULT '1 serving',
  calories INTEGER NOT NULL DEFAULT 0,
  protein NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  carbs NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  fat NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.duogym_diet_meals ENABLE ROW LEVEL SECURITY;

-- 14. Weekly Diet Schedule Template
CREATE TABLE IF NOT EXISTS public.duogym_diet_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  weekday TEXT NOT NULL CHECK (weekday IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'EveningSnacks', 'Dinner')),
  food_name TEXT NOT NULL,
  serving TEXT NOT NULL DEFAULT '1 serving',
  calories INTEGER NOT NULL DEFAULT 0,
  protein NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  carbs NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  fat NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.duogym_diet_schedule ENABLE ROW LEVEL SECURITY;

-- 15. User Custom Foods
CREATE TABLE IF NOT EXISTS public.duogym_custom_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  food_name TEXT NOT NULL,
  serving TEXT NOT NULL DEFAULT '100g',
  calories INTEGER NOT NULL DEFAULT 0,
  protein NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  carbs NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  fat NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(username, food_name)
);

ALTER TABLE public.duogym_custom_foods ENABLE ROW LEVEL SECURITY;

-- 16. User Device Tokens (for Push Notifications)
CREATE TABLE IF NOT EXISTS public.duogym_device_tokens (
  username TEXT PRIMARY KEY REFERENCES public.fitrivals_profiles(username) ON UPDATE CASCADE,
  device_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.duogym_device_tokens ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ============================================================

-- Policies allowing anyone to read (for partner views), but only owner to modify.
-- (We use the authenticated user's mapping from public.fitrivals_profiles based on auth.uid())

CREATE OR REPLACE FUNCTION public.get_auth_username()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT username FROM public.fitrivals_profiles WHERE id = auth.uid();
$$;

-- Apply Select/Insert/Update/Delete policies to all tables:

-- workouts
CREATE POLICY "Allow authenticated read workouts" ON public.duogym_workouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write workouts" ON public.duogym_workouts FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- weights
CREATE POLICY "Allow authenticated read weights" ON public.duogym_weights FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write weights" ON public.duogym_weights FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- notes
CREATE POLICY "Allow authenticated read notes" ON public.duogym_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write notes" ON public.duogym_notes FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- measurements
CREATE POLICY "Allow authenticated read measurements" ON public.duogym_measurements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write measurements" ON public.duogym_measurements FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- photos
CREATE POLICY "Allow authenticated read photos" ON public.duogym_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write photos" ON public.duogym_photos FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- badges
CREATE POLICY "Allow authenticated read badges" ON public.duogym_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write badges" ON public.duogym_badges FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- activity_movement
CREATE POLICY "Allow authenticated read activity_movement" ON public.duogym_activity_movement FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write activity_movement" ON public.duogym_activity_movement FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- activity_sleep
CREATE POLICY "Allow authenticated read activity_sleep" ON public.duogym_activity_sleep FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write activity_sleep" ON public.duogym_activity_sleep FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- xp
CREATE POLICY "Allow authenticated read xp" ON public.duogym_xp FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write xp" ON public.duogym_xp FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- social_feed
CREATE POLICY "Allow authenticated read social_feed" ON public.duogym_social_feed FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write social_feed" ON public.duogym_social_feed FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- diet_profile
CREATE POLICY "Allow authenticated read diet_profile" ON public.duogym_diet_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write diet_profile" ON public.duogym_diet_profile FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- diet_meals
CREATE POLICY "Allow authenticated read diet_meals" ON public.duogym_diet_meals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write diet_meals" ON public.duogym_diet_meals FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- diet_schedule
CREATE POLICY "Allow authenticated read diet_schedule" ON public.duogym_diet_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write diet_schedule" ON public.duogym_diet_schedule FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- custom_foods
CREATE POLICY "Allow authenticated read custom_foods" ON public.duogym_custom_foods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write custom_foods" ON public.duogym_custom_foods FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());

-- device_tokens
CREATE POLICY "Allow authenticated read device_tokens" ON public.duogym_device_tokens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow owner write device_tokens" ON public.duogym_device_tokens FOR ALL TO authenticated 
  USING (username = public.get_auth_username()) WITH CHECK (username = public.get_auth_username());


-- ============================================================
-- SOCIAL FEED TRIGGERS
-- ============================================================

-- Function to trigger social feed entry on workout complete
CREATE OR REPLACE FUNCTION public.on_workout_complete_social_feed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  display_user TEXT;
  total_ex INTEGER;
  comp_ex INTEGER;
BEGIN
  total_ex := array_length(NEW.completed_exercises, 1);
  comp_ex := array_length(NEW.completed_exercises, 1);
  
  -- If workout has completed exercises and is newly complete (all exercises done)
  IF total_ex > 0 AND (OLD IS NULL OR array_length(OLD.completed_exercises, 1) < total_ex) THEN
    SELECT display_name INTO display_user FROM public.fitrivals_profiles WHERE username = NEW.username;
    
    INSERT INTO public.duogym_social_feed (username, message, event_type)
    VALUES (NEW.username, display_user || ' completed today''s workout! 🏋️‍♂️💪', 'workout-complete');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_workout_complete ON public.duogym_workouts;
CREATE TRIGGER tr_workout_complete
  AFTER INSERT OR UPDATE ON public.duogym_workouts
  FOR EACH ROW EXECUTE FUNCTION public.on_workout_complete_social_feed();

-- Function to trigger social feed entry on badge unlock
CREATE OR REPLACE FUNCTION public.on_badge_unlock_social_feed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  display_user TEXT;
  badge_name TEXT;
BEGIN
  SELECT display_name INTO display_user FROM public.fitrivals_profiles WHERE username = NEW.username;
  badge_name := UPPER(REPLACE(NEW.badge_id, '-', ' '));
  
  INSERT INTO public.duogym_social_feed (username, message, event_type)
  VALUES (NEW.username, display_user || ' unlocked the "' || badge_name || '" Badge! 🏆', 'badge-unlock');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_badge_unlock ON public.duogym_badges;
CREATE TRIGGER tr_badge_unlock
  AFTER INSERT ON public.duogym_badges
  FOR EACH ROW EXECUTE FUNCTION public.on_badge_unlock_social_feed();


-- ============================================================
-- REALTIME ENABLEMENT
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.duogym_workouts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duogym_social_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duogym_diet_meals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duogym_xp;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duogym_badges;
