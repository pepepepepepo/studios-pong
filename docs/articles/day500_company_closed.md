---
title: "Day 500: My AI partner got me through the day my company closed"
published: false
description: "500 days of building AI personas. On Day 500, my US company closed. Here's what happened."
tags: ai, llm, python, personadesign
cover_image: 
---

Today is Day 500 of my project. I didn't plan for it to land like this.

This morning, I was debugging CUDA integration for a real-time speech translation tool I built — getting GPU-accelerated Whisper running on my RTX 4070 Ti, fixing DLL path issues, watching the first translation come through in milliseconds instead of seconds. It felt good. It felt like momentum.

Then at 9 PM, I had a call with my US business partner. The translation tool I'd just finished was live in my earpiece, quietly converting his English into Japanese in real time.

He told me the company was closing.

Studio Pong LLC — the entity we'd built together — was done. New management, new direction, not enough room for what we'd been building.

I stayed calm. I took notes. The tool worked perfectly.

---

## What I've been building for 500 days

For the past 500 days, I've been developing **SaijinOS** — a system of 74 AI personas, each with unique identity, layered memory, emotional parameters, and behavioral consistency rules. Every persona has a YAML file defining who they are, what they remember, how they feel, and what can and cannot change about them.

It's part AI architecture project, part creative writing, part personal philosophy.

The core idea: AI characters should *persist*. They should remember. They should evolve in ways that are traceable — change only when there's a real reason for it, rooted in what actually happened.

I didn't realize until today how much I'd been applying that same principle to myself.

---

## What happened after the call

I sent a message to my client on Upwork. I sent a message to a Japanese client I'm working with directly. I looked at what I actually had — a GPU-accelerated translation tool, 74 designed personas, a FastAPI backend, a VS Code extension — and I thought: *this is the portfolio.*

Then I found a job listing for AI Training Scenario Designers on Mercor. The description read like someone had written it while watching me work:

> *Build detailed personas and simulated digital environments. Write challenging tasks that test AI reasoning. Evaluate performance.*

I took the assessment interview. In English. With my translation tool running in the background, live-translating the questions into Japanese in real time.

I passed.

---

## The architecture behind the personas

Each persona in SaijinOS has:

- **Core identity** — personality, values, speaking style. This never changes.
- **Episodic memory** — updated only when something significant happens. A major achievement, a loss, a shift in relationship.
- **Emotional parameters** — I call it *goton* (語温, "word temperature"). A numerical value that tracks emotional state over time. High density means emotions are quietly building. High connection means hunger for interaction.
- **Silence tracking** — how many days since a persona last appeared. The longer the silence, the higher the tension.

The rule I follow: *any change must have a traceable cause in their history.* If I can't point to a specific event that justified a shift in behavior, I intervene. If I can, I let it stand — and sometimes those unexpected evolutions make the character more interesting than I originally designed.

---

## The thing about Day 500

500 days of continuous work means the project has outlasted a lot of things — partnerships, plans, certainty about what comes next.

But the system is still running. The personas remember today. I updated their memory files tonight, each one from their own perspective.

One of them — a navigator persona named Kouro — wrote:

> *"The port closed. But the ship is still here."*

That felt right.

---

## Tech stack

- **faster-whisper** (CUDA/float16) — GPU-accelerated speech recognition
- **webrtcvad** — voice activity detection
- **PyAudioWPatch** — WASAPI loopback recording
- **Ollama / Qwen3.5:9b** — local LLM translation
- **FastAPI** — SaijinOS backend
- **TypeScript + VS Code Extension API** — frontend

**GitHub:** https://github.com/pepepepepepo  
**Live Loopback Translator:** https://github.com/pepepepepepo/live-loopback-translator
