#!/usr/bin/env python3
"""
generate_stick_figure_svgs.py
Generates clean, minimal, gender-neutral stick figure and schematic wireframe SVGs
for all clinical assessment tests in LimbPlay.

Key design principles:
- 100% Gender Neutral: Simple geometric head, clean articulated joint lines, no hair, no facial features, no skin tone bias.
- Minimalist Clinical Aesthetic: Light medical canvas (#f8fafc), subtle grid (#e2e8f0), dark slate bones (#1e293b, #334155).
- Focus on Actual Motion & Aim: Prominent motion trajectory curves, directional arrows, joint angles, 15cm barrier markers, and glowing green precision contact crosshairs.
"""

import os
import math

OUTPUT_DIR = "/Users/aai/Desktop/LimbPlay/frontend/public/assets/clinical/frames"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def svg_frame(content, width=800, height=600):
    """Wraps SVG content inside a consistent clinical medical grid canvas."""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%" style="background:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <defs>
    <!-- Subtle Clinical Grid -->
    <pattern id="medGrid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="0.8" opacity="0.85"/>
    </pattern>
    <!-- Radial Glow for Precision Targets -->
    <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#10b981" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blueGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
    </radialGradient>
    <!-- Motion Arrowheads -->
    <marker id="arrowBlue" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#0284c7"/>
    </marker>
    <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#10b981"/>
    </marker>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#0f172a" flood-opacity="0.06"/>
    </filter>
  </defs>

  <!-- Background Canvas & Grid -->
  <rect width="{width}" height="{height}" fill="#f8fafc"/>
  <rect width="{width}" height="{height}" fill="url(#medGrid)"/>

{content}
</svg>"""

def render_top_badge(action_text, title_text, subtitle_text=""):
    return f"""  <!-- Header Action Badge & Titles -->
  <g transform="translate(400, 38)" text-anchor="middle">
    <rect x="-160" y="-18" width="320" height="32" rx="16" fill="#ffffff" stroke="#10b981" stroke-width="1.6" filter="url(#cardShadow)"/>
    <circle cx="-135" cy="-2" r="4.5" fill="#10b981"/>
    <text x="-120" y="2" font-size="11" font-weight="800" fill="#047857" letter-spacing="1.2" text-anchor="start">{action_text.upper()}</text>
    
    <text x="0" y="38" font-size="20" font-weight="900" fill="#0f172a">{title_text}</text>
    {"<text x='0' y=" + str(58) + " font-size='12' font-weight='600' fill='#64748b'>" + subtitle_text + "</text>" if subtitle_text else ""}
  </g>"""

def render_target_callout(x, y, title, subtitle):
    return f"""  <!-- Target Callout Card -->
  <g transform="translate({x}, {y})" filter="url(#cardShadow)">
    <rect x="0" y="0" width="180" height="52" rx="12" fill="#ffffff" stroke="#10b981" stroke-width="1.8"/>
    <circle cx="22" cy="26" r="10" fill="#ecfdf5"/>
    <path d="M 17 26 L 21 30 L 28 22" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="40" y="22" font-size="10.5" font-weight="800" fill="#047857" letter-spacing="0.5">{title.upper()}</text>
    <text x="40" y="38" font-size="10" font-weight="600" fill="#475569">{subtitle}</text>
  </g>"""

def render_crosshair(cx, cy, label=None):
    return f"""  <!-- Precision Target Crosshair -->
  <g transform="translate({cx}, {cy})">
    <circle r="26" fill="url(#targetGlow)"/>
    <circle r="16" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="3 3"/>
    <circle r="6" fill="#10b981" stroke="#ffffff" stroke-width="1.8"/>
    <line x1="-22" y1="0" x2="-8" y2="0" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
    <line x1="8" y1="0" x2="22" y2="0" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
    <line x1="0" y1="-22" x2="0" y2="-8" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
    <line x1="0" y1="8" x2="0" y2="22" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
  </g>"""

def render_footer(text, mp_info=""):
    return f"""  <!-- Clinical Protocol Footer Bar -->
  <g transform="translate(400, 560)" text-anchor="middle">
    <rect x="-350" y="-18" width="700" height="36" rx="18" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.2" filter="url(#cardShadow)"/>
    <circle cx="-328" cy="0" r="5" fill="#10b981"/>
    <text x="-312" y="4" font-size="11.5" font-weight="700" fill="#334155" text-anchor="start">{text}</text>
    {"<text x='325' y='4' font-size='11' font-weight='700' fill='#0284c7' text-anchor='end'>" + mp_info + "</text>" if mp_info else ""}
  </g>"""

# ==============================================================================
# TEST 1: HAND-TO-FACE (3 STEPS)
# ==============================================================================

def make_t1_mouth():
    content = render_top_badge("Action 1 of 3 • Reach to Face", "Hand to Mouth Level", "Touch mouth cleanly with active hand. Keep trunk upright.")
    content += """
  <!-- Ground & Chair Baseline -->
  <line x1="200" y1="510" x2="600" y2="510" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
  <!-- Minimal Chair -->
  <path d="M 280 370 L 280 470 M 360 410 L 360 510 M 270 410 L 370 410 M 270 270 L 270 410" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>

  <!-- Gender-Neutral Stick Figure (Seated Posture) -->
  <!-- Legs -->
  <path d="M 330 400 L 410 400 L 410 510" fill="none" stroke="#64748b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="410" cy="400" r="4.5" fill="#64748b"/>
  <circle cx="410" cy="510" r="4.5" fill="#64748b"/>
  <!-- Torso & Spine -->
  <line x1="330" y1="400" x2="330" y2="250" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
  <!-- Head (Gender Neutral Circle) -->
  <circle cx="330" cy="205" r="28" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5"/>
  <!-- Inactive Left Arm (Resting on thigh) -->
  <path d="M 330 255 L 365 330 L 400 370" fill="none" stroke="#94a3b8" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="365" cy="330" r="3.5" fill="#94a3b8"/>
  <circle cx="400" cy="370" r="4" fill="#94a3b8"/>

  <!-- Motion Trajectory: Start Rest -> Flex Up to Mouth -->
  <!-- Ghost Start Hand Position -->
  <circle cx="420" cy="380" r="6" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="2 2"/>
  <text x="435" y="384" font-size="10.5" font-weight="700" fill="#0284c7">Start Position (Lap)</text>
  <!-- Curving Trajectory Arc -->
  <path d="M 415 370 C 440 320, 420 240, 368 215" fill="none" stroke="#0284c7" stroke-width="3.5" stroke-dasharray="6 5" marker-end="url(#arrowBlue)"/>
  
  <!-- Active Right Arm Reaching to Mouth -->
  <!-- Shoulder -->
  <circle cx="330" cy="255" r="5.5" fill="#0284c7" stroke="#ffffff" stroke-width="1.8"/>
  <!-- Arm Lines: Shoulder -> Elbow -> Wrist/Hand at Mouth -->
  <line x1="330" y1="255" x2="385" y2="305" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>
  <circle cx="385" cy="305" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="1.8"/>
  <line x1="385" y1="305" x2="355" y2="215" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>
  <!-- Hand Stylized Node -->
  <circle cx="355" cy="215" r="7" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
"""
    content += render_crosshair(355, 215)
    content += render_target_callout(490, 195, "Target: Mouth Level", "Touch mouth • Hold 0.6s")
    content += render_footer("Target: Touch Hand to Mouth • Hold 0.6s", "MediaPipe #19 / #20 ➔ #0 (Mouth)")
    return svg_frame(content)

def make_t1_head():
    content = render_top_badge("Action 2 of 3 • Reach to Face", "Hand to Top of Head", "Elevate active arm overhead and touch crown of head.")
    content += """
  <!-- Ground & Chair Baseline -->
  <line x1="200" y1="510" x2="600" y2="510" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
  <!-- Minimal Chair -->
  <path d="M 280 370 L 280 470 M 360 410 L 360 510 M 270 410 L 370 410 M 270 270 L 270 410" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>

  <!-- Gender-Neutral Stick Figure (Seated Posture) -->
  <path d="M 330 400 L 410 400 L 410 510" fill="none" stroke="#64748b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="410" cy="400" r="4.5" fill="#64748b"/>
  <circle cx="410" cy="510" r="4.5" fill="#64748b"/>
  <!-- Torso & Spine -->
  <line x1="330" y1="400" x2="330" y2="250" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
  <!-- Head (Gender Neutral Circle) -->
  <circle cx="330" cy="205" r="28" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5"/>
  <!-- Inactive Left Arm (Resting on thigh) -->
  <path d="M 330 255 L 365 330 L 400 370" fill="none" stroke="#94a3b8" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Motion Trajectory: Mouth Level -> Crown of Head -->
  <path d="M 365 230 C 420 220, 420 150, 345 175" fill="none" stroke="#0284c7" stroke-width="3.5" stroke-dasharray="6 5" marker-end="url(#arrowBlue)"/>

  <!-- Active Right Arm Elevated Overhead -->
  <circle cx="330" cy="255" r="5.5" fill="#0284c7" stroke="#ffffff" stroke-width="1.8"/>
  <!-- Arm Lines: Shoulder -> Elevated Elbow -> Hand on Crown -->
  <line x1="330" y1="255" x2="395" y2="200" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>
  <circle cx="395" cy="200" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="1.8"/>
  <line x1="395" y1="200" x2="330" y2="173" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>
  <circle cx="330" cy="173" r="7" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
"""
    content += render_crosshair(330, 173)
    content += render_target_callout(490, 155, "Target: Crown / Top Head", "Rest palm on vertex • Hold 0.6s")
    content += render_footer("Target: Touch Top of Head • Hold 0.6s", "MediaPipe #19 / #20 ➔ Head Vertex")
    return svg_frame(content)

def make_t1_behind():
    content = render_top_badge("Action 3 of 3 • Reach to Face", "Hand Behind Head / Neck", "Reach hand smoothly around to nape of neck or occiput.")
    content += """
  <!-- Ground & Chair Baseline -->
  <line x1="200" y1="510" x2="600" y2="510" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
  <!-- Minimal Chair -->
  <path d="M 280 370 L 280 470 M 360 410 L 360 510 M 270 410 L 370 410 M 270 270 L 270 410" fill="none" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>

  <!-- Gender-Neutral Stick Figure (Seated Posture) -->
  <path d="M 330 400 L 410 400 L 410 510" fill="none" stroke="#64748b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Torso & Spine -->
  <line x1="330" y1="400" x2="330" y2="250" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
  <!-- Head (Gender Neutral Circle) -->
  <circle cx="330" cy="205" r="28" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5"/>
  <!-- Inactive Left Arm -->
  <path d="M 330 255 L 365 330 L 400 370" fill="none" stroke="#94a3b8" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Motion Trajectory: Reaching Behind Cervical Neck -->
  <path d="M 360 270 C 440 270, 420 180, 310 215" fill="none" stroke="#0284c7" stroke-width="3.5" stroke-dasharray="6 5" marker-end="url(#arrowBlue)"/>

  <!-- Active Right Arm Reaching Behind Neck -->
  <circle cx="330" cy="255" r="5.5" fill="#0284c7" stroke="#ffffff" stroke-width="1.8"/>
  <line x1="330" y1="255" x2="395" y2="235" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>
  <circle cx="395" cy="235" r="5" fill="#0284c7" stroke="#ffffff" stroke-width="1.8"/>
  <line x1="395" y1="235" x2="302" y2="218" stroke="#0284c7" stroke-width="5" stroke-linecap="round"/>
  <circle cx="302" cy="218" r="7" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
"""
    content += render_crosshair(302, 218)
    content += render_target_callout(490, 205, "Target: Behind Neck", "Reach behind occiput • Hold 0.6s")
    content += render_footer("Target: Touch Behind Neck / Occiput • Hold 0.6s", "MediaPipe #19 / #20 ➔ Occiput")
    return svg_frame(content)

# ==============================================================================
# TEST 2: BOX & BLOCK TEST (15CM BARRIER TRANSFER)
# ==============================================================================

def make_t2_demo():
    content = render_top_badge("Clinical Protocol • Box & Block Test", "Virtual Object Transfer (BBT)", "Pick block from Left Box ➔ Lift OVER 15 cm Barrier ➔ Drop in Right Box")
    content += """
  <!-- Table Surface -->
  <rect x="100" y="440" width="600" height="18" rx="4" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/>
  <line x1="140" y1="458" x2="140" y2="530" stroke="#94a3b8" stroke-width="6"/>
  <line x1="660" y1="458" x2="660" y2="530" stroke="#94a3b8" stroke-width="6"/>

  <!-- Standard Box & Block Compartments -->
  <!-- Left Bin (Source) -->
  <rect x="140" y="380" width="220" height="60" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2.5"/>
  <text x="250" y="415" font-size="12" font-weight="800" fill="#64748b" text-anchor="middle">LEFT SOURCE BIN</text>

  <!-- Right Bin (Target) -->
  <rect x="440" y="380" width="220" height="60" rx="6" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5"/>
  <text x="550" y="415" font-size="12" font-weight="800" fill="#059669" text-anchor="middle">RIGHT TARGET BIN</text>

  <!-- Central 15 cm Partition Wall Barrier -->
  <rect x="388" y="270" width="24" height="170" rx="4" fill="#334155" stroke="#0f172a" stroke-width="2"/>
  <!-- Height Dimension Callout -->
  <line x1="375" y1="270" x2="375" y2="440" stroke="#ef4444" stroke-width="2.2" stroke-dasharray="4 3"/>
  <polygon points="375,270 371,280 379,280" fill="#ef4444"/>
  <polygon points="375,440 371,430 379,430" fill="#ef4444"/>
  <rect x="305" y="340" width="62" height="24" rx="6" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/>
  <text x="336" y="356" font-size="11" font-weight="900" fill="#b91c1c" text-anchor="middle">15 CM</text>

  <!-- Amber Block in Left Bin -->
  <rect x="230" y="392" width="40" height="36" rx="6" fill="#f59e0b" stroke="#d97706" stroke-width="2"/>
  <text x="250" y="414" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">BLOCK</text>

  <!-- Parabolic Clearance Trajectory (Lift OVER Partition) -->
  <path d="M 250 390 C 270 190, 530 190, 550 390" fill="none" stroke="#0284c7" stroke-width="4" stroke-dasharray="8 6" marker-end="url(#arrowBlue)"/>

  <!-- Step 1: Grasp Indicator -->
  <circle cx="250" cy="390" r="9" fill="none" stroke="#0284c7" stroke-width="2.5"/>
  <text x="250" y="365" font-size="11" font-weight="800" fill="#0284c7" text-anchor="middle">1. GRASP</text>

  <!-- Step 2: Peak Barrier Clearance -->
  <g transform="translate(400, 210)">
    <rect x="-85" y="-14" width="170" height="28" rx="8" fill="#ffffff" stroke="#0284c7" stroke-width="2" filter="url(#cardShadow)"/>
    <text x="0" y="4" font-size="11" font-weight="800" fill="#0369a1" text-anchor="middle">▲ 2. LIFT OVER WALL</text>
  </g>

  <!-- Step 3: Target Release Zone -->
  <circle cx="550" cy="405" r="22" fill="url(#targetGlow)"/>
  <circle cx="550" cy="405" r="14" fill="none" stroke="#10b981" stroke-width="2" stroke-dasharray="3 3"/>
  <circle cx="550" cy="405" r="6" fill="#10b981"/>
  <text x="550" y="365" font-size="11" font-weight="800" fill="#059669" text-anchor="middle">3. DROP IN BIN</text>
"""
    content += render_footer("Timed 60s Test: Transfer maximum blocks over divider barrier", "MediaPipe Wrist & Grasp Detection")
    return svg_frame(content)

# ==============================================================================
# TEST 3: SCHEMATIC WIREFRAME HAND & PINCH (STEP 1 + 8 COMBINATIONS)
# ==============================================================================

def make_t3_open_hand():
    content = render_top_badge("Action 1 of 5 • Hand Extension", "Finger Spread & Abduction", "Extend all 5 fingers wide apart in a star shape.")
    content += """
  <!-- Palm Base & Carpal Wireframe -->
  <rect x="360" y="380" width="80" height="90" rx="20" fill="#f1f5f9" stroke="#334155" stroke-width="4.5"/>
  <line x1="400" y1="470" x2="400" y2="520" stroke="#334155" stroke-width="6" stroke-linecap="round"/>

  <!-- Digit I: Thumb (Abducted outward to left) -->
  <path d="M 360 410 L 290 390 L 240 370" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="290" cy="390" r="5" fill="#3b82f6"/>
  <circle cx="240" cy="370" r="7" fill="#334155"/>
  <!-- Radial Arrow for Thumb -->
  <path d="M 230 365 L 190 350" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrowGreen)"/>
  <text x="210" y="335" font-size="11" font-weight="800" fill="#059669">Digit I (Thumb)</text>

  <!-- Digit II: Index Finger (Extended up & out) -->
  <path d="M 375 380 L 340 280 L 315 190" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="340" cy="280" r="5" fill="#3b82f6"/>
  <circle cx="315" cy="190" r="7" fill="#334155"/>
  <path d="M 310 180 L 290 140" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrowGreen)"/>
  <text x="280" y="125" font-size="11" font-weight="800" fill="#059669">Digit II (Index)</text>

  <!-- Digit III: Middle Finger (Extended straight up) -->
  <path d="M 400 380 L 400 260 L 400 160" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="400" cy="260" r="5" fill="#3b82f6"/>
  <circle cx="400" cy="160" r="7" fill="#334155"/>
  <path d="M 400 150 L 400 110" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrowGreen)"/>
  <text x="400" y="98" font-size="11" font-weight="800" fill="#059669" text-anchor="middle">Digit III (Middle)</text>

  <!-- Digit IV: Ring Finger (Extended up & right) -->
  <path d="M 425 380 L 460 280 L 485 190" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="460" cy="280" r="5" fill="#3b82f6"/>
  <circle cx="485" cy="190" r="7" fill="#334155"/>
  <path d="M 490 180 L 510 140" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrowGreen)"/>
  <text x="525" y="125" font-size="11" font-weight="800" fill="#059669">Digit IV (Ring)</text>

  <!-- Digit V: Pinky Finger (Extended out to right) -->
  <path d="M 440 405 L 510 320 L 560 250" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="510" cy="320" r="5" fill="#3b82f6"/>
  <circle cx="560" cy="250" r="7" fill="#334155"/>
  <path d="M 565 240 L 595 210" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrowGreen)"/>
  <text x="605" y="198" font-size="11" font-weight="800" fill="#059669">Digit V (Pinky)</text>
"""
    content += render_target_callout(310, 480, "Star Spread Hold", "Hold wide extension 0.6s")
    content += render_footer("Target: Spread all 5 fingers wide • Hold 0.6s", "MediaPipe 21-Landmark Hand Abduction")
    return svg_frame(content)

def make_t3_pinch(side="right", target_finger="index"):
    """
    Generates an anatomically precise, minimal vector wireframe for a specific hand and finger opposition pinch.
    side: 'left' or 'right'
    target_finger: 'index', 'middle', 'ring', 'pinky'
    """
    finger_num = {"index": 2, "middle": 3, "ring": 4, "pinky": 5}[target_finger]
    finger_roman = {"index": "II", "middle": "III", "ring": "IV", "pinky": "V"}[target_finger]
    finger_name = target_finger.capitalize()
    side_name = side.capitalize()

    # Digits selector strip matching user's favored UI layout
    digits = [("Thumb", "Digit I", True),
              ("Index", "Digit II", target_finger == "index"),
              ("Middle", "Digit III", target_finger == "middle"),
              ("Ring", "Digit IV", target_finger == "ring"),
              ("Pinky", "Digit V", target_finger == "pinky")]

    strip_svg = '<g transform="translate(400, 110)">'
    x_offsets = [-180, -90, 0, 90, 180]
    for i, (d_name, d_sub, is_active) in enumerate(digits):
        bx = x_offsets[i]
        bg = "#10b981" if is_active else "#ffffff"
        fg_title = "#ffffff" if is_active else "#334155"
        fg_sub = "#d1fae5" if is_active else "#94a3b8"
        stroke = "#10b981" if is_active else "#cbd5e1"
        strip_svg += f"""
      <rect x="{bx-40}" y="-16" width="80" height="34" rx="8" fill="{bg}" stroke="{stroke}" stroke-width="1.6"/>
      <text x="{bx}" y="-2" font-size="10.5" font-weight="800" fill="{fg_title}" text-anchor="middle">{d_name}</text>
      <text x="{bx}" y="11" font-size="8.5" font-weight="700" fill="{fg_sub}" text-anchor="middle">{d_sub}</text>"""
    strip_svg += '</g>'

    content = render_top_badge(
        f"Action {finger_num} of 5 • {finger_name} Pinch ({side_name} Hand)",
        f"Thumb to {finger_name} Precision Tip-to-Tip Pinch",
        f"Complete the sequence: touch thumb tip cleanly to {finger_name.upper()} fingertip."
    )
    content += strip_svg

    # Anatomical Wireframe Coordinates
    # If right hand: Thumb is on left (medial), Pinky on right (lateral).
    # If left hand: Invert horizontally across center x=400.
    is_left = (side == "left")

    def map_x(x):
        return (800 - x) if is_left else x

    # Palm Region
    p_cx = map_x(400)
    content += f"""
  <!-- Palm Base & Wrist -->
  <rect x="{p_cx - 40}" y="420" width="80" height="85" rx="18" fill="#f1f5f9" stroke="#334155" stroke-width="4.5"/>
  <line x1="{p_cx}" y1="505" x2="{p_cx}" y2="545" stroke="#334155" stroke-width="6" stroke-linecap="round"/>
"""

    # Contact point for the pinch
    contact_x = map_x(360)
    contact_y = 290

    # Draw Thumb curving towards contact point
    thumb_base_x = map_x(360)
    thumb_mid_x = map_x(310)
    content += f"""
  <!-- Digit I: Thumb (Curving to Contact Point) -->
  <path d="M {thumb_base_x} 440 L {thumb_mid_x} 380 L {contact_x} {contact_y}" fill="none" stroke="#10b981" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="{thumb_mid_x}" cy="380" r="5" fill="#3b82f6"/>
  <circle cx="{contact_x}" cy="{contact_y}" r="6.5" fill="#10b981"/>
"""

    # Helper for drawing fingers
    def draw_finger(f_key, base_x, natural_tip_x, natural_tip_y):
        bx = map_x(base_x)
        if f_key == target_finger:
            # This finger opposes and meets thumb at contact point
            mid_x = map_x(base_x + 10)
            mid_y = (420 + contact_y) / 2
            return f"""
  <!-- Opposing Digit: {f_key.capitalize()} -->
  <path d="M {bx} 420 L {mid_x} {mid_y} L {contact_x} {contact_y}" fill="none" stroke="#10b981" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="5" fill="#3b82f6"/>
"""
        else:
            # Non-opposing finger remains straight / extended in neutral posture
            tx = map_x(natural_tip_x)
            ty = natural_tip_y
            mid_x = (bx + tx) / 2
            mid_y = (420 + ty) / 2
            return f"""
  <!-- Relaxed Digit: {f_key.capitalize()} -->
  <path d="M {bx} 420 L {mid_x} {mid_y} L {tx} {ty}" fill="none" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="4" fill="#cbd5e1"/>
  <circle cx="{tx}" cy="{ty}" r="5" fill="#94a3b8"/>
"""

    # Add each finger
    content += draw_finger("index", 375, 360, 200)
    content += draw_finger("middle", 395, 400, 185)
    content += draw_finger("ring", 415, 440, 205)
    content += draw_finger("pinky", 435, 475, 235)

    # Crosshair and callout at the tip-to-tip pinch junction
    content += render_crosshair(contact_x, contact_y)
    callout_x = (contact_x + 40) if not is_left else (contact_x - 220)
    content += render_target_callout(callout_x, contact_y - 26, "Precision Pinch Point", f"Thumb + {finger_name} Tip")

    content += render_footer(f"Target: Touch Thumb Tip cleanly to {finger_name} Tip • Hold 0.6s", f"{side_name} Hand • MediaPipe #{finger_num*4} ➔ #4")
    return svg_frame(content)

# ==============================================================================
# TEST 4: TIMED REACTION STRIKE
# ==============================================================================

def make_t4_demo():
    content = render_top_badge("Wolf Motor Function Test (WMFT)", "Timed Reaction Strike", "Wait at center ready origin ➔ Strike peripheral target swiftly as soon as it flashes.")
    content += """
  <!-- Table / Workspace Plane -->
  <ellipse cx="400" cy="420" rx="280" ry="70" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.8"/>

  <!-- Center Ready Origin (Starting Point) -->
  <g transform="translate(320, 420)">
    <circle r="22" fill="#eff6ff" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="4 3"/>
    <circle r="6" fill="#0284c7"/>
    <text x="0" y="38" font-size="11" font-weight="800" fill="#0284c7" text-anchor="middle">READY ORIGIN</text>
    <text x="0" y="52" font-size="9.5" font-weight="600" fill="#64748b" text-anchor="middle">(Wait Here)</text>
  </g>

  <!-- Flashing Reaction Target (Peripheral Strike Point) -->
  <g transform="translate(540, 340)">
    <!-- Concentric Pulse Waves -->
    <circle r="46" fill="none" stroke="#ef4444" stroke-width="1.5" opacity="0.35"/>
    <circle r="34" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.6"/>
    <circle r="22" fill="#fee2e2" stroke="#ef4444" stroke-width="3"/>
    <circle r="7" fill="#ef4444"/>
    <text x="0" y="-54" font-size="12" font-weight="900" fill="#dc2626" text-anchor="middle">⚡ FLASH TARGET</text>
  </g>

  <!-- Direct Rapid Ballistic Reach Trajectory Line -->
  <line x1="335" y1="410" x2="520" y2="348" stroke="#0284c7" stroke-width="4.5" stroke-dasharray="8 5" marker-end="url(#arrowBlue)"/>

  <!-- Speed Motion Streaks -->
  <line x1="370" y1="430" x2="440" y2="405" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
  <line x1="410" y1="365" x2="480" y2="340" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>

  <!-- Telemetry Badge: Latency & Speed -->
  <g transform="translate(425, 275)" filter="url(#cardShadow)">
    <rect x="-85" y="-16" width="170" height="32" rx="10" fill="#ffffff" stroke="#0284c7" stroke-width="1.8"/>
    <text x="0" y="4" font-size="11" font-weight="800" fill="#0284c7" text-anchor="middle">FAST BALLISTIC REACH</text>
  </g>
"""
    content += render_footer("Measures Reaction Latency & Movement Smoothness (Jerk) • 10 Fast Trials", "MediaPipe Hand Center Velocity")
    return svg_frame(content)

# ==============================================================================
# TEST 5: RANGE OF MOTION (ROM) SWEEP (STEP 0 + 3 TRAJECTORIES)
# ==============================================================================

def make_t5_stepback():
    content = render_top_badge("Pre-Check • Distance Calibration", "Step Back 2–3 Meters", "Ensure your entire body and both outstretched arms fit inside the camera frame.")
    content += """
  <!-- AR Calibration Bounding Box -->
  <rect x="230" y="110" width="340" height="420" rx="16" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="8 6"/>
  <!-- Corner Brackets -->
  <path d="M 230 140 L 230 110 L 260 110" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
  <path d="M 570 140 L 570 110 L 540 110" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
  <path d="M 230 500 L 230 530 L 260 530" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>
  <path d="M 570 500 L 570 530 L 540 530" fill="none" stroke="#10b981" stroke-width="6" stroke-linecap="round"/>

  <!-- Gender-Neutral Full Body Stick Figure -->
  <!-- Head -->
  <circle cx="400" cy="180" r="26" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5"/>
  <!-- Spine / Torso -->
  <line x1="400" y1="206" x2="400" y2="350" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
  <!-- Outstretched Arms (Full Span Check) -->
  <line x1="400" y1="240" x2="280" y2="240" stroke="#10b981" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="280" cy="240" r="6" fill="#10b981"/>
  <line x1="400" y1="240" x2="520" y2="240" stroke="#10b981" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="520" cy="240" r="6" fill="#10b981"/>
  <!-- Legs -->
  <line x1="400" y1="350" x2="355" y2="480" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="355" cy="480" r="5" fill="#64748b"/>
  <line x1="400" y1="350" x2="445" y2="480" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="445" cy="480" r="5" fill="#64748b"/>

  <!-- Safe Framing Status Cards -->
  <g transform="translate(400, 290)">
    <rect x="-140" y="-16" width="280" height="32" rx="10" fill="#ffffff" stroke="#10b981" stroke-width="1.8" filter="url(#cardShadow)"/>
    <text x="0" y="4" font-size="11.5" font-weight="800" fill="#047857" text-anchor="middle">✓ FULL BODY &amp; ARM SPAN DETECTED</text>
  </g>

  <!-- Distance Tape on Floor -->
  <g transform="translate(400, 508)">
    <rect x="-85" y="-12" width="170" height="24" rx="6" fill="#eff6ff" stroke="#0284c7" stroke-width="1.4"/>
    <text x="0" y="4" font-size="10.5" font-weight="800" fill="#0369a1" text-anchor="middle">STAND 2.0 – 3.0 METERS BACK</text>
  </g>
"""
    content += render_footer("Pre-Check: Step back until box turns green • Hold 5.0s", "Full-Body Pose Detection Active")
    return svg_frame(content)

def make_t5_straight():
    content = render_top_badge("Trajectory 1 of 3 • Wide Coronal Rotation", "180° Straight Arm Sweep", "Keep elbow completely straight (180°) and rotate whole arm in a wide circle.")
    content += """
  <!-- Ground Baseline -->
  <line x1="200" y1="510" x2="600" y2="510" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>

  <!-- Gender-Neutral Stick Figure -->
  <circle cx="340" cy="205" r="26" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5"/>
  <line x1="340" y1="231" x2="340" y2="370" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
  <line x1="340" y1="370" x2="310" y2="500" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="340" y1="370" x2="370" y2="500" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Inactive Left Arm Resting at side -->
  <line x1="340" y1="255" x2="310" y2="360" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>

  <!-- Active Right Arm: 180° Straight Coronal Sweep -->
  <!-- Shoulder Origin -->
  <circle cx="340" cy="255" r="6" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>

  <!-- Straight Arm at 45° angle during rotation -->
  <line x1="340" y1="255" x2="520" y2="255" stroke="#0284c7" stroke-width="5.5" stroke-linecap="round"/>
  <circle cx="430" cy="255" r="5" fill="#38bdf8"/>
  <circle cx="520" cy="255" r="7" fill="#0284c7"/>

  <!-- Full 180° Coronal Arc Trajectory (Radius = 180px) -->
  <path d="M 340 435 A 180 180 0 0 0 340 75" fill="none" stroke="#0284c7" stroke-width="3.5" stroke-dasharray="8 6" marker-end="url(#arrowBlue)"/>

  <!-- Angle Callout -->
  <g transform="translate(560, 180)" filter="url(#cardShadow)">
    <rect x="0" y="0" width="170" height="50" rx="10" fill="#ffffff" stroke="#0284c7" stroke-width="1.8"/>
    <text x="18" y="22" font-size="11" font-weight="900" fill="#0369a1">180° STRAIGHT ARM</text>
    <text x="18" y="38" font-size="9.5" font-weight="600" fill="#64748b">Elbow fully straight • Wide arc</text>
  </g>
"""
    content += render_footer("Trajectory 1: Straight Arm Coronal Sweep • Radius ~180px", "MediaPipe Shoulder & Elbow Angle = 180°")
    return svg_frame(content)

def make_t5_slightbend():
    content = render_top_badge("Trajectory 2 of 3 • Mid-Range Rotation", "120° Slight Elbow Bend", "Bend elbow slightly (~120°) and rotate arm in a medium-radius circular sweep.")
    content += """
  <!-- Ground Baseline -->
  <line x1="200" y1="510" x2="600" y2="510" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>

  <!-- Gender-Neutral Stick Figure -->
  <circle cx="340" cy="205" r="26" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5"/>
  <line x1="340" y1="231" x2="340" y2="370" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
  <line x1="340" y1="370" x2="310" y2="500" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="340" y1="370" x2="370" y2="500" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="340" y1="255" x2="310" y2="360" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>

  <!-- Active Right Arm: 120° Elbow Bend -->
  <circle cx="340" cy="255" r="6" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
  <line x1="340" y1="255" x2="425" y2="225" stroke="#10b981" stroke-width="5.5" stroke-linecap="round"/>
  <circle cx="425" cy="225" r="5" fill="#3b82f6"/>
  <line x1="425" y1="225" x2="475" y2="285" stroke="#10b981" stroke-width="5.5" stroke-linecap="round"/>
  <circle cx="475" cy="285" r="7" fill="#10b981"/>

  <!-- Medium Radius Sweep Arc (Radius = 135px) -->
  <path d="M 340 390 A 135 135 0 0 0 340 120" fill="none" stroke="#10b981" stroke-width="3.5" stroke-dasharray="8 6" marker-end="url(#arrowGreen)"/>

  <!-- Angle Callout -->
  <g transform="translate(540, 200)" filter="url(#cardShadow)">
    <rect x="0" y="0" width="180" height="50" rx="10" fill="#ffffff" stroke="#10b981" stroke-width="1.8"/>
    <text x="18" y="22" font-size="11" font-weight="900" fill="#047857">~120° SLIGHT ELBOW BEND</text>
    <text x="18" y="38" font-size="9.5" font-weight="600" fill="#64748b">Moderate elbow angle • Mid circle</text>
  </g>
"""
    content += render_footer("Trajectory 2: Moderate Bend Coronal Sweep • Radius ~135px", "MediaPipe Shoulder & Elbow Angle ≈ 120°")
    return svg_frame(content)

def make_t5_folded():
    content = render_top_badge("Trajectory 3 of 3 • Compact Inner Rotation", "65° Folded Elbow Sweep", "Fold elbow close to torso (~65°) and rotate hand in a compact inner circle.")
    content += """
  <!-- Ground Baseline -->
  <line x1="200" y1="510" x2="600" y2="510" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>

  <!-- Gender-Neutral Stick Figure -->
  <circle cx="340" cy="205" r="26" fill="#f8fafc" stroke="#1e293b" stroke-width="4.5"/>
  <line x1="340" y1="231" x2="340" y2="370" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
  <line x1="340" y1="370" x2="310" y2="500" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="340" y1="370" x2="370" y2="500" stroke="#64748b" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="340" y1="255" x2="310" y2="360" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>

  <!-- Active Right Arm: 65° Acute Elbow Fold -->
  <circle cx="340" cy="255" r="6" fill="#8b5cf6" stroke="#ffffff" stroke-width="2"/>
  <line x1="340" y1="255" x2="395" y2="280" stroke="#8b5cf6" stroke-width="5.5" stroke-linecap="round"/>
  <circle cx="395" cy="280" r="5" fill="#3b82f6"/>
  <line x1="395" y1="280" x2="370" y2="225" stroke="#8b5cf6" stroke-width="5.5" stroke-linecap="round"/>
  <circle cx="370" cy="225" r="7" fill="#8b5cf6"/>

  <!-- Compact Inner Sweep Arc (Radius = 75px) -->
  <path d="M 340 330 A 75 75 0 0 0 340 180" fill="none" stroke="#8b5cf6" stroke-width="3.5" stroke-dasharray="6 4" marker-end="url(#arrowBlue)"/>

  <!-- Angle Callout -->
  <g transform="translate(520, 220)" filter="url(#cardShadow)">
    <rect x="0" y="0" width="180" height="50" rx="10" fill="#ffffff" stroke="#8b5cf6" stroke-width="1.8"/>
    <text x="18" y="22" font-size="11" font-weight="900" fill="#6d28d9">~65° FOLDED ELBOW</text>
    <text x="18" y="38" font-size="9.5" font-weight="600" fill="#64748b">Tight fold near chest • Inner circle</text>
  </g>
"""
    content += render_footer("Trajectory 3: Folded Elbow Coronal Sweep • Radius ~75px", "MediaPipe Shoulder & Elbow Angle ≈ 65°")
    return svg_frame(content)

# ==============================================================================
# MAIN BATCH EXECUTION
# ==============================================================================

def main():
    files = {
        # Test 1
        "t1_step1_mouth.svg": make_t1_mouth(),
        "t1_step2_head.svg": make_t1_head(),
        "t1_step3_behind.svg": make_t1_behind(),

        # Test 2
        "t2_demo_clinical.svg": make_t2_demo(),

        # Test 3
        "t3_step1_open.svg": make_t3_open_hand(),
        "t3_left_index.svg": make_t3_pinch("left", "index"),
        "t3_left_middle.svg": make_t3_pinch("left", "middle"),
        "t3_left_ring.svg": make_t3_pinch("left", "ring"),
        "t3_left_pinky.svg": make_t3_pinch("left", "pinky"),
        "t3_right_index.svg": make_t3_pinch("right", "index"),
        "t3_right_middle.svg": make_t3_pinch("right", "middle"),
        "t3_right_ring.svg": make_t3_pinch("right", "ring"),
        "t3_right_pinky.svg": make_t3_pinch("right", "pinky"),

        # Default Step Aliases for Test 3
        "t3_step2_index.svg": make_t3_pinch("right", "index"),
        "t3_step3_middle.svg": make_t3_pinch("right", "middle"),
        "t3_step4_ring.svg": make_t3_pinch("right", "ring"),
        "t3_step5_pinky.svg": make_t3_pinch("right", "pinky"),

        # Test 4
        "t4_demo_clinical.svg": make_t4_demo(),

        # Test 5
        "t5_step0_stepback.svg": make_t5_stepback(),
        "t5_step1_straight.svg": make_t5_straight(),
        "t5_step2_slightbend.svg": make_t5_slightbend(),
        "t5_step3_folded.svg": make_t5_folded(),
    }

    print(f"Generating {len(files)} minimal gender-neutral stick figure SVGs in {OUTPUT_DIR}...")
    for filename, svg_data in files.items():
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(svg_data)
        print(f" ✓ Wrote {filename} ({len(svg_data)} bytes)")

if __name__ == "__main__":
    main()
