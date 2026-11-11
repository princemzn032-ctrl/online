-- QuizMaster schema, access policies, triggers, and starter content.
-- Run this entire file in the Supabase SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  total_score bigint not null default 0 check (total_score >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  icon text not null default '📝'
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  description text not null default '',
  category_id uuid not null references public.categories (id) on delete restrict,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  time_limit integer not null check (time_limit > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  question_text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_answer text not null,
  unique (quiz_id, question_text)
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  score integer not null check (score >= 0),
  total_questions integer not null check (total_questions > 0 and score <= total_questions),
  time_taken integer not null default 0 check (time_taken >= 0),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists quizzes_category_id_idx on public.quizzes (category_id);
create index if not exists questions_quiz_id_idx on public.questions (quiz_id);
create index if not exists attempts_user_id_created_at_idx on public.attempts (user_id, created_at desc);
create index if not exists attempts_quiz_id_idx on public.attempts (quiz_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
  on public.categories for select to anon, authenticated
  using (true);

drop policy if exists "Anyone can read quizzes" on public.quizzes;
create policy "Anyone can read quizzes"
  on public.quizzes for select to anon, authenticated
  using (true);

drop policy if exists "Anyone can read questions" on public.questions;
create policy "Anyone can read questions"
  on public.questions for select to anon, authenticated
  using (true);

drop policy if exists "Users can read their own attempts" on public.attempts;
create policy "Users can read their own attempts"
  on public.attempts for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own attempts" on public.attempts;
create policy "Users can insert their own attempts"
  on public.attempts for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Do not expose answer keys through Supabase's browser API. Quiz grading is done
-- by submit_quiz_attempt, and total_score is maintained by the attempt trigger.
-- Let users edit only their public profile fields, not total_score.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;
grant select on public.categories, public.quizzes, public.questions to anon, authenticated;
grant select, insert on public.attempts to authenticated;
revoke all on public.questions from anon, authenticated;
grant select (id, quiz_id, question_text, options) on public.questions to anon, authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Learner'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create or replace function public.validate_attempt_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actual_total integer;
  actual_score integer;
begin
  select
    count(*)::integer,
    count(*) filter (
      where new.answers ->> q.id::text = q.correct_answer
    )::integer
  into actual_total, actual_score
  from public.questions as q
  where q.quiz_id = new.quiz_id;

  if actual_total = 0
     or new.total_questions <> actual_total
     or new.score <> actual_score then
    raise exception 'Quiz score does not match the submitted answers';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_attempt_before_insert on public.attempts;
create trigger validate_attempt_before_insert
  before insert on public.attempts
  for each row execute function public.validate_attempt_score();

create or replace function public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb,
  p_time_taken integer
)
returns table (score integer, total_questions integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  question_count integer;
  calculated_score integer;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to submit a quiz';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be provided as a JSON object';
  end if;
  if p_time_taken is null or p_time_taken < 0 then
    raise exception 'Time taken must be a non-negative number';
  end if;

  select count(*)::integer,
         count(*) filter (
           where p_answers ->> q.id::text = q.correct_answer
         )::integer
  into question_count, calculated_score
  from public.questions as q
  where q.quiz_id = p_quiz_id;

  if question_count = 0 then
    raise exception 'This quiz has no questions';
  end if;

  insert into public.attempts (
    user_id, quiz_id, score, total_questions, time_taken, answers
  )
  values (
    current_user_id, p_quiz_id, calculated_score, question_count, p_time_taken, p_answers
  );

  return query select calculated_score, question_count;
end;
$$;

revoke all on function public.submit_quiz_attempt(uuid, jsonb, integer) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, jsonb, integer) to authenticated;

create or replace function public.refresh_profile_total_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set total_score = (
    select coalesce(sum(a.score), 0)
    from public.attempts as a
    where a.user_id = new.user_id
  )
  where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_attempt_created on public.attempts;
create trigger on_attempt_created
  after insert on public.attempts
  for each row execute function public.refresh_profile_total_score();

create or replace view public.leaderboard
with (security_invoker = false)
as
select
  p.id as user_id,
  p.username,
  p.avatar_url,
  p.total_score,
  rank() over (order by p.total_score desc) as rank,
  coalesce(a.quiz_count, 0)::bigint as quizzes,
  coalesce(a.accuracy, 0)::numeric as accuracy
from public.profiles as p
left join (
  select
    user_id,
    count(*) as quiz_count,
    round((sum(score)::numeric * 100) / nullif(sum(total_questions), 0)) as accuracy
  from public.attempts
  group by user_id
) as a on a.user_id = p.id;

create or replace view public.platform_stats
with (security_invoker = false)
as
select
  (select count(*) from public.questions)::bigint as question_count,
  (select count(*) from public.profiles)::bigint as student_count,
  (select count(*) from public.categories)::bigint as category_count,
  (select count(*) from public.attempts)::bigint as attempt_count;

grant select on public.leaderboard, public.platform_stats to anon, authenticated;

insert into public.categories (name, description, icon)
values ('General Knowledge', 'Broad trivia and current affairs.', '🌍')
on conflict (name) do update
set description = excluded.description,
    icon = excluded.icon;

delete from public.attempts
where quiz_id in (
  select id from public.quizzes where title <> 'General Knowledge Challenge'
);
delete from public.quizzes where title <> 'General Knowledge Challenge';
delete from public.categories where name <> 'General Knowledge';

insert into public.quizzes (title, description, category_id, difficulty, time_limit)
values (
  'General Knowledge Challenge',
  'Test your knowledge of science, geography, history, and world facts.',
  (select id from public.categories where name = 'General Knowledge'),
  'Easy',
  10
)
on conflict (title) do update
set description = excluded.description,
    category_id = excluded.category_id,
    difficulty = excluded.difficulty,
    time_limit = excluded.time_limit;

delete from public.questions
where quiz_id = (select id from public.quizzes where title = 'General Knowledge Challenge');

insert into public.questions (quiz_id, question_text, options, correct_answer)
select
  (select id from public.quizzes where title = 'General Knowledge Challenge'),
  q.question_text,
  q.options,
  q.correct_answer
from jsonb_to_recordset(
  '[
    {"question_text":"Which planet is known as the Red Planet?","options":["Venus","Mars","Jupiter","Mercury"],"correct_answer":"Mars"},
    {"question_text":"What is the capital city of Japan?","options":["Seoul","Tokyo","Kyoto","Beijing"],"correct_answer":"Tokyo"},
    {"question_text":"Which is the largest ocean on Earth?","options":["Atlantic Ocean","Indian Ocean","Pacific Ocean","Arctic Ocean"],"correct_answer":"Pacific Ocean"},
    {"question_text":"Who wrote the play Hamlet?","options":["Charles Dickens","Jane Austen","William Shakespeare","Mark Twain"],"correct_answer":"William Shakespeare"},
    {"question_text":"What is the chemical formula for water?","options":["CO2","H2O","O2","NaCl"],"correct_answer":"H2O"},
    {"question_text":"Which continent is the Sahara Desert located in?","options":["Asia","Africa","South America","Australia"],"correct_answer":"Africa"},
    {"question_text":"What is the largest mammal in the world?","options":["African elephant","Blue whale","Giraffe","Hippopotamus"],"correct_answer":"Blue whale"},
    {"question_text":"How many sides does a hexagon have?","options":["Five","Six","Seven","Eight"],"correct_answer":"Six"},
    {"question_text":"Which gas do plants absorb from the atmosphere?","options":["Oxygen","Nitrogen","Carbon dioxide","Helium"],"correct_answer":"Carbon dioxide"},
    {"question_text":"What is the currency of the United Kingdom?","options":["Euro","Pound sterling","Dollar","Franc"],"correct_answer":"Pound sterling"},
    {"question_text":"Which is the nearest star to Earth?","options":["Sirius","The Sun","Proxima Centauri","Polaris"],"correct_answer":"The Sun"},
    {"question_text":"In which country are the Pyramids of Giza?","options":["Mexico","Greece","Egypt","India"],"correct_answer":"Egypt"},
    {"question_text":"What is the fastest land animal?","options":["Lion","Cheetah","Horse","Leopard"],"correct_answer":"Cheetah"},
    {"question_text":"Which language has the most native speakers worldwide?","options":["English","Spanish","Mandarin Chinese","Hindi"],"correct_answer":"Mandarin Chinese"},
    {"question_text":"How many colors are traditionally listed in a rainbow?","options":["Five","Six","Seven","Eight"],"correct_answer":"Seven"},
    {"question_text":"What is the capital of Australia?","options":["Sydney","Melbourne","Canberra","Perth"],"correct_answer":"Canberra"},
    {"question_text":"Which instrument is used to measure temperature?","options":["Barometer","Thermometer","Altimeter","Hygrometer"],"correct_answer":"Thermometer"},
    {"question_text":"How many days are there in a leap year?","options":["364","365","366","367"],"correct_answer":"366"},
    {"question_text":"Which is the largest planet in our solar system?","options":["Earth","Saturn","Jupiter","Neptune"],"correct_answer":"Jupiter"},
    {"question_text":"What is the official language of Brazil?","options":["Spanish","Portuguese","French","English"],"correct_answer":"Portuguese"}
  ]'::jsonb
) as q(question_text text, options jsonb, correct_answer text);
