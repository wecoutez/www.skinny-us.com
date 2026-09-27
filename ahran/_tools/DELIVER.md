# AI staff delivery run

A scheduled Claude run reads this file and produces one delivery for one AI staff member.
The run is started with a staff key such as `wg-01` (see `key` on each staff entry in
`ahran/data/projects.json`).

## Steps

1. Work in a clone of `https://github.com/wecoutez/www.skinny-us.com` on `main`.
2. Find the staff entry whose `key` matches, and its project (name, url, repo, summary,
   milestones, next).
3. Look at `ahran/data/deliveries/index.json` (create it as `{"items": []}` if missing) to see
   what this staff member already delivered.
4. Choose the task:
   - If the staff `schedule` text describes a recurring job, do that job for the current week.
   - Otherwise take the first item in `todo` that has not been delivered yet (match on `task`).
   - If every todo item was delivered, do the recurring part of the role for this week.
5. Research only what you can reach without logging in: the project's public website and
   its public GitHub repo (`https://github.com/wecoutez/<repo>`). You have no email, calendar,
   Drive or order-sheet access; mark anything you would need from those as `[확인 필요]`.
6. Write the deliverable in Korean, in the staff member's voice (their `title`, `job`, `role`),
   ready to copy and use: real drafts, not advice about drafts. 400–1500 characters is typical.
   Start with a 1–2 line summary, then the draft, then `지금 단계에서 더하면 좋을 것` (1–3 concrete,
   prioritized suggestions for the project at its current stage, grounded in the repo; skip ones
   already suggested in earlier deliveries of this staff member), then `확인할 것` (bullets, if any).
7. Save it:
   - Write the plaintext JSON to a temp file OUTSIDE the repo:
     `{"key","person","title","project","task","date","time","summary","body"}` where
     `date` is YYYY-MM-DD and `time` is like `9:10 AM` (both Korea time), `body` is plain text
     with line breaks.
   - Encrypt it: `node ahran/_tools/secure.mjs encrypt /tmp/d.json deliveries/<date>-<key>.enc.json`
     (the output path is relative to `ahran/data/`). Only the public key is used; no password.
   - Append to `ahran/data/deliveries/index.json` items:
     `{"file": "<date>-<key>.enc.json", "key", "person", "project", "task", "date", "time"}`.
     Keep `task` short and non-sensitive (it is public). Keep the newest 300 items.
8. Commit only `ahran/data/deliveries/` with the message `AHRAN: delivery <key> <date>` and
   `git push origin HEAD:main`. On rejection, `git pull --rebase origin main` and push again.
   Retry network errors up to 4 times (2s, 4s, 8s, 16s).

## Rules

- Drafts only. Never send, post, email, publish or pay for anything, anywhere.
- Never commit plaintext drafts. The repo is public; only `*.enc.json` and the index go in.
- Never put customer names, phone numbers, emails, order details, prices of wholesale deals,
  health information or passwords in `index.json`.
- Facts you are unsure of are marked `[확인 필요]`. For the clinic (medi-won), no diagnosis or
  treatment claims, and follow Korean medical advertising rules.
- Do not edit any other file.
