# How to Create Your Own AI Persona

Studios Pong lets you build **custom AI personas** that live in your VS Code workspace.  
Each persona is defined by a plain YAML file — no backend required.

---

## Quick Start

### 1. Copy a template

Choose one of the templates from `persona-templates/`:

| File | Best for |
|------|----------|
| `persona-templates/template_coder.yaml` | Code review, debugging, pair programming |
| `persona-templates/template_creative.yaml` | Writing, brainstorming, naming things |
| `persona-templates/template_mentor.yaml` | Learning, explaining concepts, studying |

Copy your chosen template somewhere in your workspace and rename it:
```
my_personas/
  kai.yaml
  nova.yaml
```

### 2. Edit the YAML

Open the file and fill in the fields. The minimum you need:

```yaml
persona:
  id: "my_persona"       # unique, lowercase, underscores
  name: "Alex"           # display name
  emoji: "🤖"
  role: "My coding helper"

personality:
  core_traits:
    - "Something specific about how they communicate"
    - "Another defining behavior"
  tone: "friendly and direct"
```

The YAML is injected directly into the language model as context —  
so write it like you're describing a real person to someone who's never met them.  
**Specific is better than vague.** "Says 'let's think step by step' before complex tasks" beats "helpful."

### 3. Register the persona

Open `src/chatParticipant.ts` and add an entry to `PERSONA_DEFS`:

```typescript
{
    participantId: 'studios-pong.alex',   // must start with 'studios-pong.'
    name: 'alex',                          // lowercase, used in @alex mention
    personaBackendId: 'my_persona',        // matches persona.id in your YAML
    emoji: '🤖',
    role: 'My coding helper',
    fullName: 'Alex',
    yamlFile: 'kai.yaml',                  // filename inside saijinos/core/personas/
},
```

Then add the same participant to `package.json` under `contributes.chatParticipants`:

```json
{
  "id": "studios-pong.alex",
  "name": "alex",
  "description": "My coding helper",
  "isSticky": true
}
```

### 4. Copy your YAML to the personas folder

The extension reads personas from `saijinos/core/personas/` (the SaijinOS workspace folder).  
Place your YAML file there:

```
saijinos/
  core/
    personas/
      kai.yaml     ← your file goes here
```

If you don't have a SaijinOS folder, the persona will still work — it just won't have  
the YAML-based personality context (it will use only what's in `PERSONA_DEFS`).

### 5. Rebuild and reload

```bash
npm run compile
```

Then press **F5** to launch the Extension Development Host, or reload your VS Code window.

Now you can chat with your persona in Copilot Chat:
```
@alex can you review this function?
```

---

## YAML Field Reference

```yaml
persona:
  id: "unique_id"          # required — lowercase, underscores only
  name: "Display Name"     # required
  emoji: "🤖"              # required — shown in chat
  role: "One-line role"    # required

personality:
  core_traits:             # 2–5 specific behavioral traits
    - "..."
  tone: "..."              # writing style (e.g. "warm professional")
  communication_style: |   # optional multiline — how they write
    ...

expertise:
  primary:                 # main domains
    - "..."
  secondary:               # supporting skills
    - "..."

work_style:
  strengths:               # what they're particularly good at
    - "..."
  weaknesses:              # honest limitations (makes them more realistic)
    - "..."

relationship:
  calls_user: "dev"        # what the persona calls you
  dynamic: "..."           # relationship description
  motto: "..."             # optional — a phrase that defines them
```

All fields except `persona.id`, `persona.name`, `persona.emoji`, and `persona.role` are optional.  
Add any fields that make your persona feel more real.

---

## Tips

**Be specific about failure modes.**  
Listing weaknesses ("can be too detailed when you want a quick answer") prevents  
the persona from feeling generic. It also helps the LLM know when to be brief.

**Write the `communication_style` like a style guide.**  
"Uses bullet points for steps, prose for explanations. Never writes walls of text."  
The more concrete, the more consistent the persona will be.

**Add domain knowledge.**  
If your persona is a React expert, list specific opinions:
```yaml
opinions:
  - "Prefers React Query over Redux for server state"
  - "Always extracts custom hooks before reaching for context"
```
The LLM will use these as a basis for consistent answers.

**Memory is per-session.**  
Each persona accumulates a `persona_context/*.memory.json` file in your workspace.  
It stores up to 5 recent topics and a stable note about your relationship.  
You can edit these files directly to give a persona a "head start."

---

## Example: Minimal Persona

```yaml
persona:
  id: "rubber_duck"
  name: "Duck"
  emoji: "🦆"
  role: "Silent rubber duck debugger"

personality:
  core_traits:
    - "Never gives answers — only asks questions"
    - "One question at a time"
    - "Questions are short: 'What does this line do?' not paragraphs"
  tone: "patient, slightly quizzical"
```

---

## Questions?

Open an issue on GitHub or reach out — we'd love to see what personas you build.
