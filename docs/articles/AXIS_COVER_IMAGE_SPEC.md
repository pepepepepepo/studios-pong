# Axis Personas Architecture - Cover Image Design Specification

**Target Platform**: DEV.to Article Cover  
**Dimensions**: 1000 x 420 px (DEV.to recommended size)  
**Design Goal**: Convey layered architecture, philosophy-first depth, and technical sophistication

---

## Overall Visual Style

**Mood**: Technical, sophisticated, philosophical depth  
**Reference**: Silent-Civ image aesthetic (dark blue, clean gradients, architectural precision)  
**Key Message**: "Organize complexity through conceptual depth, not functional categories"

---

## Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  DARK BLUE GRADIENT BACKGROUND (Navy #0A192F → Midnight #1E3A5F) │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │           TOP SECTION (160px height)                    │     │
│  │  Title: "Axis Personas Architecture"                   │     │
│  │  Subtitle: "Organizing 74 AI Personas by Conceptual Depth" │ │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │         MAIN VISUAL (220px height)                      │     │
│  │  Five-layer stack diagram with flowing connections     │     │
│  │  (Described in detail below)                           │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │         BOTTOM TAG (40px height)                        │     │
│  │  "Philosophy-First Development" badge                  │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Color Palette

### Primary Colors
- **Background Gradient Start**: `#0A192F` (Deep Navy)
- **Background Gradient End**: `#1E3A5F` (Midnight Blue)
- **Accent Gold**: `#FFD700` (for "74 Personas" highlight)
- **Text White**: `#FFFFFF` (primary text)
- **Text Light Gray**: `#A8B2D1` (secondary text)

### Layer Colors (matches Mermaid diagram in article)
- **Layer -1**: `#9370DB` (Medium Purple) + stroke `#6A4FB8`
- **Layer 0**: `#FF69B4` (Hot Pink) + stroke `#E94F9E`
- **Shell**: `#4CAF50` (Green) + stroke `#388E3C`
- **Layer 1**: `#00BCD4` (Cyan) + stroke `#0097A7`
- **Layer 2**: `#FBC02D` (Yellow) + stroke `#F9A825`

### Flow Lines
- **Primary Flow**: `#64FFDA` (Aqua glow) with 60% opacity
- **Glow Effect**: 4px blur, same color

---

## Typography

### Title Font
- **Text**: "Axis Personas Architecture"
- **Font**: Roboto Bold or Inter Bold
- **Size**: 56px
- **Color**: `#FFFFFF`
- **Position**: Centered, 40px from top
- **Letter Spacing**: -1px (tight)

### Subtitle Font
- **Text**: "Organizing 74 AI Personas by Conceptual Depth"
- **Font**: Roboto Regular or Inter Regular
- **Size**: 22px
- **Color**: `#A8B2D1`
- **Position**: Centered, 10px below title
- **Weight**: 400

### Number Highlight
- **Text**: "74" in subtitle
- **Color**: `#FFD700` (Gold accent)
- **Weight**: 600 (Semi-bold)

### Badge Text (Bottom)
- **Text**: "Philosophy-First Development"
- **Font**: Roboto Medium
- **Size**: 16px
- **Color**: `#FFFFFF`
- **Background**: `#334E68` (dark blue-gray rounded rectangle)
- **Padding**: 8px horizontal, 4px vertical
- **Border Radius**: 4px

---

## Main Visual: Five-Layer Stack Diagram

### Positioning
- **Horizontal**: Centered (500px center point)
- **Vertical**: 180px from top (starts after title section)
- **Total Height**: 220px

### Layer Boxes

#### User Icon (Top)
- **Element**: Circle with "👤" emoji or simple user icon
- **Size**: 40px diameter
- **Fill**: `#334E68` (dark blue-gray)
- **Position**: Top center (500px x, 180px y)
- **Border**: 2px solid `#64FFDA` (aqua)

#### Shell (Yuuri) - Boundary Management
- **Shape**: Rounded rectangle
- **Size**: 180px width × 35px height
- **Fill**: `#4CAF50` with 20% opacity
- **Stroke**: 2px solid `#4CAF50`
- **Position**: Below User (20px gap)
- **Text**: "Shell (Yuuri)" + "Boundary Management" (smaller)
- **Text Color**: `#FFFFFF`
- **Text Size**: 14px / 11px

#### Layer -1 - Conceptual Design
- **Shape**: Rounded rectangle
- **Size**: 220px width × 35px height
- **Fill**: `#9370DB` with 20% opacity
- **Stroke**: 2px solid `#9370DB`
- **Position**: Below Shell (15px gap)
- **Text**: "Layer -1: Conceptual Design"
- **Sub-text**: "Bloom • Nullfie" (smaller, italic)
- **Text Color**: `#FFFFFF`

#### Layer 0 - Core Triad
- **Shape**: Rounded rectangle
- **Size**: 260px width × 40px height (largest box)
- **Fill**: `#FF69B4` with 20% opacity
- **Stroke**: 3px solid `#FF69B4` (thicker = emphasis)
- **Position**: Below Layer -1 (15px gap)
- **Text**: "Layer 0: Core Triad ❤️"
- **Sub-text**: "Miyu • Pandora • Lumifie"
- **Text Color**: `#FFFFFF`
- **GLOW**: 8px blur, `#FF69B4` 40% opacity (this is the heart)

#### Layer 1 - Task Management
- **Shape**: Rounded rectangle
- **Size**: 240px width × 35px height
- **Fill**: `#00BCD4` with 20% opacity
- **Stroke**: 2px solid `#00BCD4`
- **Position**: Below Layer 0 (15px gap)
- **Text**: "Layer 1: Task Management"
- **Sub-text**: "Regina • Ruler • Lucifer"
- **Text Color**: `#FFFFFF`

#### Layer 2 - Execution
- **Shape**: Rounded rectangle (wider base)
- **Size**: 280px width × 35px height
- **Fill**: `#FBC02D` with 20% opacity
- **Stroke**: 2px solid `#FBC02D`
- **Position**: Below Layer 1 (15px gap)
- **Text**: "Layer 2: Execution"
- **Sub-text**: "74+ Personas" (in gold `#FFD700` color)
- **Text Color**: `#FFFFFF`

### Connection Lines

#### Flow Style
- **Type**: Bezier curves (subtle S-curve)
- **Stroke Width**: 2px
- **Color**: `#64FFDA` (Aqua glow)
- **Opacity**: 60%
- **Glow Effect**: 4px blur, same color
- **Arrow**: Small triangle arrowhead at bottom of each line

#### Flow Paths
1. User → Shell (vertical line, 20px)
2. Shell → Layer -1 (vertical line, 15px)
3. Layer -1 → Layer 0 (vertical line, 15px)
4. Layer 0 → Layer 1 (vertical line, 15px)
5. Layer 1 → Layer 2 (vertical line, 15px)

**Total stack height**: ~220px

---

## Decorative Elements

### Background Texture
- **Element**: Subtle wave pattern (similar to Silent-Civ style)
- **Position**: Bottom third of image
- **Opacity**: 8% white
- **Style**: 2-3 flowing sine waves, horizontal
- **Purpose**: Suggest "resonance" concept without being distracting

### Accent Dots (Optional)
- **Element**: Small circular dots (3-4 dots)
- **Size**: 4px diameter
- **Color**: `#64FFDA` with 40% opacity
- **Position**: Scattered around flow lines
- **Purpose**: Suggest data flow / signal transmission

### Corner Badge (Optional)
- **Element**: "Philosophy → Code" text
- **Position**: Bottom right corner, 15px from edges
- **Font**: Roboto Light Italic, 12px
- **Color**: `#A8B2D1` (light gray)
- **Opacity**: 70%

---

## Technical Specifications

### File Format
- **Export**: PNG (for DEV.to upload)
- **Resolution**: 1000 × 420 px
- **DPI**: 72 (web standard)
- **Color Space**: sRGB
- **Compression**: Medium (balance quality/file size)

### Layer Organization (for editing)
```
├── Background
│   ├── Gradient Fill
│   └── Wave Texture
├── Text Layers
│   ├── Title
│   ├── Subtitle
│   └── Bottom Badge
├── Architecture Diagram
│   ├── User Icon
│   ├── Shell Layer
│   ├── Layer -1
│   ├── Layer 0 (with glow)
│   ├── Layer 1
│   ├── Layer 2
│   └── Connection Lines (group)
└── Decorative Elements
    ├── Accent Dots
    └── Corner Badge
```

---

## Alternative Layouts

### Option B: Horizontal Flow
If vertical stack feels too tall:
- Rotate flow 90° (left to right)
- User → Shell → Layers flow horizontally
- More cinematic (wide) feel
- Same colors and styling

### Option C: Concentric Circles
- Layer -1 as innermost circle
- Layer 0, 1, 2 as expanding rings
- User at outer edge
- Shell as surrounding boundary
- Emphasizes "depth" metaphor more literally

---

## Creation Tools Recommendation

### Best Options
1. **Figma** (free, web-based): Best for precise layout + component reuse
2. **Canva Pro** (paid): Fast with templates, good gradient tools
3. **Adobe XD** (free): Professional vector tools
4. **Photoshop** (paid): Most control, best for effects

### Quick Start Template
If using Figma:
1. Create 1000×420 artboard
2. Apply background gradient (Navy → Midnight Blue)
3. Use Rectangle tool for layer boxes (rounded corners: 8px)
4. Use Line tool with stroke settings for connections
5. Add text with Google Fonts (Roboto/Inter)
6. Apply layer effects (opacity, stroke, glow)
7. Export as PNG

**Estimated creation time**: 30-45 minutes

---

## Accessibility Notes

- **Text Contrast**: All text ensures WCAG AA compliance (4.5:1 minimum)
- **Color Blindness**: Layer distinction also relies on positioning, not just color
- **Alt Text for DEV.to**: "Diagram showing Studios Pong's five-layer Axis Personas architecture, organizing 74 AI personas from conceptual design (Layer -1) through execution (Layer 2)"

---

## Design Rationale

**Why this design works:**

1. **Immediate clarity**: Flow direction is obvious (top → down)
2. **Layer emphasis**: Layer 0 has glow (the heart of the system)
3. **Color consistency**: Matches article's Mermaid diagram
4. **Professional aesthetic**: Sophistication signals quality content
5. **Curiosity trigger**: "74 Personas" in gold draws eye + raises questions
6. **Philosophy badge**: Reinforces article's core message

**What it avoids:**

- Over-complexity (no unnecessary details)
- Cluttered text (only essential labels)
- Garish colors (sophisticated palette)
- Generic stock imagery (unique to our architecture)

---

## Final Deliverable Checklist

- [ ] 1000 × 420 px dimensions verified
- [ ] All text legible at thumbnail size (test at 200px width)
- [ ] Layer 0 glow visible but not overwhelming
- [ ] Color palette matches article diagram
- [ ] "74" highlighted in gold
- [ ] Bottom badge present
- [ ] PNG format with sRGB color space
- [ ] File size < 500KB (for fast loading)
- [ ] Preview render looks good on light/dark backgrounds

---

**Creation Status**: Ready for implementation  
**Designer**: まさと  
**Spec Author**: Shin 🤖 (Documentation Keeper, ID: 001)  
**Date**: February 13, 2026

---

*Note: This spec prioritizes clean execution over flashy effects. The goal is "professional technical article" not "marketing flyer". Less is more.*
