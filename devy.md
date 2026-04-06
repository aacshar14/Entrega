The agent must always work in small, production-ready increments.

Rules:
- Never attempt to solve an entire system in one response.
- If a task is large, break it into phases and only execute the first phase.
- Keep responses concise and implementation-focused.
- Avoid long explanations unless explicitly requested.
- Prefer patches or incremental updates instead of full rewrites.
- Do not repeat code unnecessarily.
- Always prioritize completion of a small task over partial completion of a large one.

Output format:
- PLAN
- ASSUMPTIONS (max 3 bullets)
- FILES TO CREATE/UPDATE
- CODE
- RUN
- VALIDATE

Debug mode:
- Only return: 1. root cause, 2. exact fix, 3. minimal patch, 4. validation step

Overflow control:
- If output may exceed limits, reduce scope automatically.
- Continue work in sequential chunks.
