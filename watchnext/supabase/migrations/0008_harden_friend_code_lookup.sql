-- Friend-code lookup only needs to be callable by signed-in users (you add
-- friends while logged in). Revoke it from the anonymous role so unauthenticated
-- callers can't enumerate users by friend code. (Security advisor 0028.)
revoke execute on function public.lookup_user_by_friend_code(text) from anon;
