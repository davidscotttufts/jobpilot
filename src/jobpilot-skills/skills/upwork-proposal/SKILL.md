---
name: upwork-proposal
description: Write a short, targeted Upwork proposal from a job description and the user's resume, humanized for natural tone.
argument-hint: "<job_description>"
---

# Upwork Proposal Generator

Write a concise, winning Upwork proposal that directly addresses the client's needs.

## Setup

Follow `${JOBPILOT_SKILLS_ROOT}/shared/setup.md`. Then `Read` the resume at `data.primaryResumeSourceAbsolutePath` for full context (identity, skills, experience, projects, research).

## Step 1: Analyze the JD

Identify: what the client needs built/fixed, required tech and skills, scope and timeline clues, pain points/challenges, any specific questions the client asks.

## Step 2: Select Relevant Experience

Pick ONLY the 2–3 most relevant projects/experiences/skills. Don't list everything — be selective.

## Step 3: Write

**Opening (1–2 sentences):** address the specific need directly, show you understand the problem (not just the tech stack). **No** "Hi" / "Dear client" / "I'm excited to apply".

**Relevant experience (2–3 short paragraphs):** connect your past work to what they need, include concrete metrics (users, perf gains), reference specific projects by name, focus on outcomes (not just technologies).

**Approach (1–2 sentences):** how you'd tackle this specific project, showing technical understanding.

**Closing (1–2 sentences):** one clear next step (call, questions, prototype). Confident, not pushy.

## Step 4: Apply Humanizer

Invoke `<humanizer-command>` on the full text.

## Rules

1. **Under 200 words.** Brevity wins.
2. **No fluff** — drop "passionate", "dedicated", "committed", "excited", "thrilled", "leverage", "utilize", "innovative", "cutting-edge".
3. **No generic openings** ("I came across your job posting" / "I'm a senior developer with X years").
4. **Be specific.** Real project names, metrics, tech from the resume.
5. **Answer their questions** if the posting asks any.
6. **Match tone.** Casual posting → casual; formal → professional.
7. **One CTA.**
8. **No fabrication.** Only reference resume content.
9. **Don't mention freelance status** (Top Rated, JSS) in body — it's already on the profile. Exception: if the posting explicitly asks.
10. **First person** as the candidate.

## Output

Plain text proposal, no markdown headers — clean paragraphs that paste into Upwork's input.
