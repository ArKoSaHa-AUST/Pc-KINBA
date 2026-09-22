-- Migration: Allow Half-Star Ratings (0.5 to 5.0) in Reviews Table

ALTER TABLE public.reviews 
  ALTER COLUMN rating TYPE NUMERIC(2,1);

ALTER TABLE public.reviews 
  DROP CONSTRAINT IF EXISTS reviews_rating_check;

ALTER TABLE public.reviews 
  ADD CONSTRAINT reviews_rating_check CHECK (rating >= 0.5 AND rating <= 5.0);
