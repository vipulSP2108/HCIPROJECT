#!/usr/bin/env python3
"""
generate_clinical_stick_figures_jpg.py
Generates clean, minimal, gender-neutral stick figure illustrations as high-res JPGs (and SVGs)
for all clinical assessment tests in LimbPlay.

Features:
- 100% Gender Neutral: Simple circle head, clean articulated stick figure limbs, joint nodes.
- Minimal Medical Aesthetic: Off-white canvas (#f8fafc), subtle grid (#e2e8f0), dark slate bones (#1e293b).
- Clinical Focus: Emphasizes motion trajectories, directional arrows, joint angles, 15cm barrier, and glowing target crosshairs.
- 2x High-DPI rendering downsampled with Lanczos filter for razor-sharp anti-aliased output.
"""

import os
import math
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = "/Users/aai/Desktop/LimbPlay/frontend/public/assets/clinical/frames"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 2X Canvas Resolution
W, H = 1600, 1200

# Fonts
FONT_PATH_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_PATH_REG = "/System/Library/Fonts/Supplemental/Arial.ttf"

def get_font(size, bold=False):
    path = FONT_PATH_BOLD if bold else FONT_PATH_REG
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

font_title = get_font(42, bold=True)
font_sub = get_font(24, bold=False)
font_badge = get_font(22, bold=True)
font_card_title = get_font(22, bold=True)
font_card_sub = get_font(20, bold=False)
font_footer = get_font(24, bold=True)
font_tag = get_font(20, bold=True)

def create_base_canvas():
    im = Image.new("RGB", (W, H), "#f8fafc")
    draw = ImageDraw.Draw(im, "RGBA")
    # Draw faint grid
    grid_color = (226, 232, 240, 180)
    for x in range(0, W, 80):
        draw.line([(x, 0), (x, H)], fill=grid_color, width=2)
    for y in range(0, H, 80):
        draw.line([(0, y), (W, y)], fill=grid_color, width=2)
    return im, draw

def draw_top_badge(draw, action_text, title_text, subtitle_text=""):
    cx = W // 2
    # Action Badge Pill
    badge_w, badge_h = 620, 60
    bx0, by0 = cx - badge_w // 2, 60
    # Shadow
    draw.rounded_rectangle([bx0 + 2, by0 + 4, bx0 + badge_w + 2, by0 + badge_h + 4], radius=30, fill=(15, 23, 42, 15))
    draw.rounded_rectangle([bx0, by0, bx0 + badge_w, by0 + badge_h], radius=30, fill="#ffffff", outline="#10b981", width=3)
    # Green indicator dot
    draw.ellipse([bx0 + 36, by0 + 20, bx0 + 56, by0 + 40], fill="#10b981")
    draw.text((bx0 + 72, by0 + 17), action_text.upper(), font=font_badge, fill="#047857")

    # Titles
    draw.text((cx, 155), title_text, font=font_title, fill="#0f172a", anchor="mm")
    if subtitle_text:
        draw.text((cx, 195), subtitle_text, font=font_sub, fill="#64748b", anchor="mm")

def draw_callout_card(draw, x, y, title, subtitle):
    cw, ch = 380, 105
    # Shadow
    draw.rounded_rectangle([x + 3, y + 5, x + cw + 3, y + ch + 5], radius=22, fill=(15, 23, 42, 18))
    # Card
    draw.rounded_rectangle([x, y, x + cw, y + ch], radius=22, fill="#ffffff", outline="#10b981", width=3)
    # Green checkmark circle
    draw.ellipse([x + 22, y + 26, x + 72, y + 76], fill="#ecfdf5")
    # Checkmark icon
    draw.line([(x + 34, y + 51), (x + 44, y + 61), (x + 60, y + 41)], fill="#059669", width=4)
    # Texts
    draw.text((x + 86, y + 30), title.upper(), font=font_card_title, fill="#047857")
    draw.text((x + 86, y + 60), subtitle, font=font_card_sub, fill="#475569")

def draw_crosshair(draw, cx, cy, label=None):
    # Outer glow rings
    for r, alpha in [(65, 30), (45, 60), (32, 110)]:
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(16, 185, 129, alpha))
    # Dashed target ring
    draw.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], outline="#10b981", width=4)
    # Center dot
    draw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill="#10b981", outline="#ffffff", width=3)
    # Crosshair lines
    draw.line([(cx - 48, cy), (cx - 18, cy)], fill="#10b981", width=4)
    draw.line([(cx + 18, cy), (cx + 48, cy)], fill="#10b981", width=4)
    draw.line([(cx, cy - 48), (cx, cy - 18)], fill="#10b981", width=4)
    draw.line([(cx, cy + 18), (cx, cy + 48)], fill="#10b981", width=4)

def draw_footer(draw, text, tag_info=""):
    cx = W // 2
    fw, fh = 1420, 70
    fx0, fy0 = cx - fw // 2, 1100
    draw.rounded_rectangle([fx0 + 2, fy0 + 4, fx0 + fw + 2, fy0 + fh + 4], radius=35, fill=(15, 23, 42, 12))
    draw.rounded_rectangle([fx0, fy0, fx0 + fw, fy0 + fh], radius=35, fill="#ffffff", outline="#e2e8f0", width=2)
    # Emerald dot
    draw.ellipse([fx0 + 34, fy0 + 24, fx0 + 56, fy0 + 46], fill="#10b981")
    draw.text((fx0 + 72, fy0 + 21), text, font=font_footer, fill="#334155")
    if tag_info:
        draw.text((fx0 + fw - 40, fy0 + 22), tag_info, font=font_tag, fill="#0284c7", anchor="ra")

def draw_dashed_curve(draw, pts, color="#0284c7", width=6, dash_len=18, gap_len=12):
    """Draws a smooth dashed curve along points."""
    # Interpolate dense points
    dense_pts = []
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        dist = math.hypot(x2 - x1, y2 - y1)
        steps = max(2, int(dist / 4))
        for s in range(steps):
            t = s / steps
            dense_pts.append((x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
    dense_pts.append(pts[-1])

    # Draw dashed
    draw_len = dash_len + gap_len
    cur_dist = 0
    seg = []
    for i in range(len(dense_pts) - 1):
        p1, p2 = dense_pts[i], dense_pts[i + 1]
        cur_dist += math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        phase = cur_dist % draw_len
        if phase < dash_len:
            seg.append(p2)
        else:
            if len(seg) > 1:
                draw.line(seg, fill=color, width=width)
            seg = []
    if len(seg) > 1:
        draw.line(seg, fill=color, width=width)

    # Arrowhead at end
    if len(dense_pts) >= 4:
        p_end = dense_pts[-1]
        p_prev = dense_pts[-4]
        angle = math.atan2(p_end[1] - p_prev[1], p_end[0] - p_prev[0])
        arrow_len = 24
        arrow_w = 12
        tip = p_end
        left = (p_end[0] - arrow_len * math.cos(angle) + arrow_w * math.sin(angle),
                p_end[1] - arrow_len * math.sin(angle) - arrow_w * math.cos(angle))
        right = (p_end[0] - arrow_len * math.cos(angle) - arrow_w * math.sin(angle),
                 p_end[1] - arrow_len * math.sin(angle) + arrow_w * math.cos(angle))
        draw.polygon([tip, left, right], fill=color)

def save_dual(im, base_name):
    """Saves both .jpg and .png (downsampled to 800x600)"""
    res = im.resize((800, 600), Image.Resampling.LANCZOS)
    jpg_path = os.path.join(OUTPUT_DIR, f"{base_name}.jpg")
    res.save(jpg_path, "JPEG", quality=95)
    print(f" ✓ Wrote {base_name}.jpg (800x600)")

# ==============================================================================
# TEST 1: HAND-TO-FACE (3 STEPS)
# ==============================================================================

def render_t1_step1():
    im, draw = create_base_canvas()
    draw_top_badge(draw, "Action 1 of 3 • Reach to Face", "Hand to Mouth Level", "Touch mouth cleanly with active hand. Keep trunk upright.")

    # Ground & chair
    draw.line([(400, 1020), (1200, 1020)], fill="#cbd5e1", width=4)
    draw.line([(540, 740), (540, 940)], fill="#94a3b8", width=6)
    draw.line([(720, 820), (720, 1020)], fill="#94a3b8", width=6)
    draw.line([(520, 820), (740, 820)], fill="#94a3b8", width=6)
    draw.line([(520, 540), (520, 820)], fill="#94a3b8", width=6)

    # Stick figure (seated)
    # Legs
    draw.line([(660, 800), (820, 800), (820, 1020)], fill="#64748b", width=9)
    draw.ellipse([812, 792, 828, 808], fill="#64748b")
    draw.ellipse([812, 1012, 828, 1028], fill="#64748b")
    # Spine / Torso
    draw.line([(660, 800), (660, 500)], fill="#1e293b", width=10)
    # Head circle
    draw.ellipse([604, 354, 716, 466], fill="#f8fafc", outline="#1e293b", width=9)

    # Inactive arm on thigh
    draw.line([(660, 510), (730, 660), (800, 740)], fill="#94a3b8", width=7)

    # Active arm flexed up to mouth
    # Shoulder
    draw.ellipse([648, 498, 672, 522], fill="#0284c7", outline="#ffffff", width=4)
    # Upper arm -> Elbow
    draw.line([(660, 510), (770, 610)], fill="#0284c7", width=10)
    draw.ellipse([758, 598, 782, 622], fill="#0284c7", outline="#ffffff", width=4)
    # Forearm -> Hand at mouth
    draw.line([(770, 610), (710, 430)], fill="#0284c7", width=10)
    draw.ellipse([696, 416, 724, 444], fill="#0284c7", outline="#ffffff", width=4)

    # Motion trajectory arc from lap to mouth
    draw.ellipse([825, 745, 855, 775], outline="#0284c7", width=4)
    draw.text((870, 748), "Start: Rest on Lap", font=font_tag, fill="#0284c7")
    curve_pts = [(830, 730), (880, 630), (850, 490), (745, 430)]
    draw_dashed_curve(draw, curve_pts, color="#0284c7", width=6)

    # Crosshair and callout
    draw_crosshair(draw, 710, 430)
    draw_callout_card(draw, 980, 390, "Target: Mouth Level", "Touch lips/chin • Hold 0.6s")
    draw_footer(draw, "Target: Touch Hand to Mouth • Hold 0.6s", "MediaPipe #19 / #20 ➔ #0 (Mouth)")
    save_dual(im, "t1_step1_mouth")

def render_t1_step2():
    im, draw = create_base_canvas()
    draw_top_badge(draw, "Action 2 of 3 • Reach to Face", "Hand to Top of Head", "Elevate active arm overhead and touch crown of head.")

    # Ground & chair
    draw.line([(400, 1020), (1200, 1020)], fill="#cbd5e1", width=4)
    draw.line([(540, 740), (540, 940)], fill="#94a3b8", width=6)
    draw.line([(720, 820), (720, 1020)], fill="#94a3b8", width=6)
    draw.line([(520, 820), (740, 820)], fill="#94a3b8", width=6)
    draw.line([(520, 540), (520, 820)], fill="#94a3b8", width=6)

    # Stick figure (seated)
    draw.line([(660, 800), (820, 800), (820, 1020)], fill="#64748b", width=9)
    draw.line([(660, 800), (660, 500)], fill="#1e293b", width=10)
    draw.ellipse([604, 354, 716, 466], fill="#f8fafc", outline="#1e293b", width=9)
    draw.line([(660, 510), (730, 660), (800, 740)], fill="#94a3b8", width=7)

    # Active arm elevated overhead to crown
    draw.ellipse([648, 498, 672, 522], fill="#0284c7", outline="#ffffff", width=4)
    # Upper arm -> Elevated Elbow
    draw.line([(660, 510), (790, 400)], fill="#0284c7", width=10)
    draw.ellipse([778, 388, 802, 412], fill="#0284c7", outline="#ffffff", width=4)
    # Forearm -> Hand on top of head
    draw.line([(790, 400), (660, 346)], fill="#0284c7", width=10)
    draw.ellipse([646, 332, 674, 360], fill="#0284c7", outline="#ffffff", width=4)

    # Motion trajectory from mouth level up to crown
    curve_pts = [(730, 460), (840, 440), (840, 310), (695, 346)]
    draw_dashed_curve(draw, curve_pts, color="#0284c7", width=6)

    # Crosshair on crown
    draw_crosshair(draw, 660, 346)
    draw_callout_card(draw, 980, 310, "Target: Crown / Top Head", "Rest palm on vertex • Hold 0.6s")
    draw_footer(draw, "Target: Touch Top of Head • Hold 0.6s", "MediaPipe #19 / #20 ➔ Head Vertex")
    save_dual(im, "t1_step2_head")

def render_t1_step3():
    im, draw = create_base_canvas()
    draw_top_badge(draw, "Action 3 of 3 • Reach to Face", "Hand Behind Head / Neck", "Reach hand smoothly around to nape of neck or occiput.")

    # Ground & chair
    draw.line([(400, 1020), (1200, 1020)], fill="#cbd5e1", width=4)
    draw.line([(540, 740), (540, 940)], fill="#94a3b8", width=6)
    draw.line([(720, 820), (720, 1020)], fill="#94a3b8", width=6)
    draw.line([(520, 820), (740, 820)], fill="#94a3b8", width=6)
    draw.line([(520, 540), (520, 820)], fill="#94a3b8", width=6)

    # Stick figure (seated)
    draw.line([(660, 800), (820, 800), (820, 1020)], fill="#64748b", width=9)
    draw.line([(660, 800), (660, 500)], fill="#1e293b", width=10)
    draw.ellipse([604, 354, 716, 466], fill="#f8fafc", outline="#1e293b", width=9)
    draw.line([(660, 510), (730, 660), (800, 740)], fill="#94a3b8", width=7)

    # Active arm reaching behind neck
    draw.ellipse([648, 498, 672, 522], fill="#0284c7", outline="#ffffff", width=4)
    draw.line([(660, 510), (790, 470)], fill="#0284c7", width=10)
    draw.ellipse([778, 458, 802, 482], fill="#0284c7", outline="#ffffff", width=4)
    draw.line([(790, 470), (604, 436)], fill="#0284c7", width=10)
    draw.ellipse([590, 422, 618, 450], fill="#0284c7", outline="#ffffff", width=4)

    # Motion trajectory curving behind head
    curve_pts = [(720, 540), (880, 540), (840, 360), (635, 430)]
    draw_dashed_curve(draw, curve_pts, color="#0284c7", width=6)

    draw_crosshair(draw, 604, 436)
    draw_callout_card(draw, 980, 410, "Target: Behind Neck", "Reach behind occiput • Hold 0.6s")
    draw_footer(draw, "Target: Touch Behind Neck / Occiput • Hold 0.6s", "MediaPipe #19 / #20 ➔ Occiput")
    save_dual(im, "t1_step3_behind")

# ==============================================================================
# TEST 2: BOX & BLOCK TEST (15CM BARRIER TRANSFER)
# ==============================================================================

def render_t2_demo():
    im, draw = create_base_canvas()
    draw_top_badge(draw, "Clinical Protocol • Box & Block Test", "Virtual Object Transfer (BBT)", "Pick block from Left Box ➔ Lift OVER 15 cm Barrier ➔ Drop in Right Box")

    # Table
    draw.rounded_rectangle([200, 880, 1400, 920], radius=8, fill="#e2e8f0", outline="#cbd5e1", width=3)
    draw.line([(280, 920), (280, 1060)], fill="#94a3b8", width=12)
    draw.line([(1320, 920), (1320, 1060)], fill="#94a3b8", width=12)

    # Left Container (Source)
    draw.rounded_rectangle([280, 760, 720, 880], radius=12, fill="#f1f5f9", outline="#94a3b8", width=5)
    draw.text((500, 825), "LEFT SOURCE BIN", font=font_title, fill="#64748b", anchor="mm")

    # Right Container (Target)
    draw.rounded_rectangle([880, 760, 1320, 880], radius=12, fill="#ecfdf5", outline="#10b981", width=5)
    draw.text((1100, 825), "RIGHT TARGET BIN", font=font_title, fill="#059669", anchor="mm")

    # Central 15cm Partition Wall Barrier
    draw.rounded_rectangle([775, 540, 825, 880], radius=8, fill="#334155", outline="#0f172a", width=4)
    # Height Clearance Dimension Marker
    draw.line([(750, 540), (750, 880)], fill="#ef4444", width=4)
    draw.polygon([(750, 540), (742, 560), (758, 560)], fill="#ef4444")
    draw.polygon([(750, 880), (742, 860), (758, 860)], fill="#ef4444")
    # 15 cm Tag Badge
    draw.rounded_rectangle([610, 680, 735, 730], radius=12, fill="#fef2f2", outline="#ef4444", width=3)
    draw.text((672, 705), "15 CM", font=font_badge, fill="#b91c1c", anchor="mm")

    # Amber Block in Left Bin
    draw.rounded_rectangle([460, 784, 540, 856], radius=12, fill="#f59e0b", outline="#d97706", width=4)
    draw.text((500, 820), "BLOCK", font=font_badge, fill="#ffffff", anchor="mm")

    # Parabolic Lift-Over-Barrier Trajectory
    traj_pts = [(500, 780), (540, 380), (1060, 380), (1100, 810)]
    draw_dashed_curve(draw, traj_pts, color="#0284c7", width=8)

    # 1. Grasp Label
    draw.ellipse([480, 720, 520, 760], outline="#0284c7", width=5)
    draw.text((500, 690), "1. GRASP", font=font_badge, fill="#0284c7", anchor="mm")

    # 2. Lift-Over Badge at Peak
    draw.rounded_rectangle([620, 420, 980, 480], radius=16, fill="#ffffff", outline="#0284c7", width=4)
    draw.text((800, 450), "▲ 2. LIFT OVER 15CM WALL", font=font_badge, fill="#0369a1", anchor="mm")

    # 3. Target Drop Zone
    draw_crosshair(draw, 1100, 810)
    draw.text((1100, 730), "3. DROP IN BIN", font=font_badge, fill="#059669", anchor="mm")

    draw_footer(draw, "Timed 60s Test: Transfer maximum blocks over divider barrier", "MediaPipe Wrist & Grasp Detection")
    save_dual(im, "t2_demo_clinical")

# ==============================================================================
# TEST 3: MINIMAL WIREFRAME HAND & PINCH (STEP 1 + 8 COMBINATIONS)
# ==============================================================================

def render_t3_open():
    im, draw = create_base_canvas()
    draw_top_badge(draw, "Action 1 of 5 • Hand Extension", "Finger Spread & Abduction", "Extend all 5 fingers wide apart in a star shape.")

    # Palm Base
    draw.rounded_rectangle([720, 760, 880, 940], radius=40, fill="#f1f5f9", outline="#334155", width=9)
    draw.line([(800, 940), (800, 1040)], fill="#334155", width=12)

    # Digit I: Thumb
    draw.line([(720, 820), (580, 780), (480, 740)], fill="#334155", width=10)
    draw.ellipse([570, 770, 590, 790], fill="#3b82f6")
    draw.ellipse([466, 726, 494, 754], fill="#334155")
    draw_dashed_curve(draw, [(470, 730), (390, 700)], color="#10b981", width=6)
    draw.text((430, 670), "Digit I (Thumb)", font=font_card_title, fill="#059669", anchor="mm")

    # Digit II: Index
    draw.line([(750, 760), (680, 560), (630, 380)], fill="#334155", width=10)
    draw.ellipse([670, 550, 690, 570], fill="#3b82f6")
    draw.ellipse([616, 366, 644, 394], fill="#334155")
    draw_dashed_curve(draw, [(620, 360), (580, 280)], color="#10b981", width=6)
    draw.text((560, 250), "Digit II (Index)", font=font_card_title, fill="#059669", anchor="mm")

    # Digit III: Middle
    draw.line([(800, 760), (800, 520), (800, 320)], fill="#334155", width=10)
    draw.ellipse([790, 510, 810, 530], fill="#3b82f6")
    draw.ellipse([786, 306, 814, 334], fill="#334155")
    draw_dashed_curve(draw, [(800, 300), (800, 220)], color="#10b981", width=6)
    draw.text((800, 195), "Digit III (Middle)", font=font_card_title, fill="#059669", anchor="mm")

    # Digit IV: Ring
    draw.line([(850, 760), (920, 560), (970, 380)], fill="#334155", width=10)
    draw.ellipse([910, 550, 930, 570], fill="#3b82f6")
    draw.ellipse([956, 366, 984, 394], fill="#334155")
    draw_dashed_curve(draw, [(980, 360), (1020, 280)], color="#10b981", width=6)
    draw.text((1040, 250), "Digit IV (Ring)", font=font_card_title, fill="#059669", anchor="mm")

    # Digit V: Pinky
    draw.line([(880, 810), (1020, 640), (1120, 500)], fill="#334155", width=10)
    draw.ellipse([1010, 630, 1030, 650], fill="#3b82f6")
    draw.ellipse([1106, 486, 1134, 514], fill="#334155")
    draw_dashed_curve(draw, [(1130, 480), (1190, 420)], color="#10b981", width=6)
    draw.text((1210, 395), "Digit V (Pinky)", font=font_card_title, fill="#059669", anchor="mm")

    draw_callout_card(draw, 610, 960, "Star Spread Hold", "Hold wide extension 0.6s")
    draw_footer(draw, "Target: Spread all 5 fingers wide • Hold 0.6s", "MediaPipe 21-Landmark Hand Abduction")
    save_dual(im, "t3_step1_open")

def render_t3_pinch(side="right", target_finger="index"):
    im, draw = create_base_canvas()
    finger_num = {"index": 2, "middle": 3, "ring": 4, "pinky": 5}[target_finger]
    finger_name = target_finger.capitalize()
    side_name = side.capitalize()

    draw_top_badge(draw,
                   f"Action {finger_num} of 5 • {finger_name} Pinch ({side_name} Hand)",
                   f"Thumb to {finger_name} Precision Tip-to-Tip Pinch",
                   f"Complete the sequence: touch thumb tip cleanly to {finger_name.upper()} fingertip.")

    # 5-digit selector strip
    digits = [("Thumb", "Digit I", True),
              ("Index", "Digit II", target_finger == "index"),
              ("Middle", "Digit III", target_finger == "middle"),
              ("Ring", "Digit IV", target_finger == "ring"),
              ("Pinky", "Digit V", target_finger == "pinky")]
    x_offsets = [-360, -180, 0, 180, 360]
    cx = W // 2
    for i, (d_name, d_sub, is_active) in enumerate(digits):
        bx = cx + x_offsets[i]
        bg = "#10b981" if is_active else "#ffffff"
        fg_title = "#ffffff" if is_active else "#334155"
        fg_sub = "#d1fae5" if is_active else "#94a3b8"
        stroke = "#10b981" if is_active else "#cbd5e1"
        draw.rounded_rectangle([bx - 80, 220, bx + 80, 288], radius=16, fill=bg, outline=stroke, width=3)
        draw.text((bx, 243), d_name, font=font_badge, fill=fg_title, anchor="mm")
        draw.text((bx, 268), d_sub, font=font_tag, fill=fg_sub, anchor="mm")

    is_left = (side == "left")
    def map_x(x):
        return (W - x) if is_left else x

    # Palm Base
    pcx = map_x(800)
    draw.rounded_rectangle([pcx - 80, 840, pcx + 80, 1010], radius=36, fill="#f1f5f9", outline="#334155", width=9)
    draw.line([(pcx, 1010), (pcx, 1090)], fill="#334155", width=12)

    # Contact point
    contact_x = map_x(720)
    contact_y = 580

    # Thumb
    thumb_base_x = map_x(720)
    thumb_mid_x = map_x(620)
    draw.line([(thumb_base_x, 880), (thumb_mid_x, 760), (contact_x, contact_y)], fill="#10b981", width=11)
    draw.ellipse([thumb_mid_x - 10, 750, thumb_mid_x + 10, 770], fill="#3b82f6")
    draw.ellipse([contact_x - 13, contact_y - 13, contact_x + 13, contact_y + 13], fill="#10b981")

    # Fingers
    def draw_finger(f_key, base_x, natural_tip_x, natural_tip_y):
        bx = map_x(base_x)
        if f_key == target_finger:
            mid_x = map_x(base_x + 20)
            mid_y = (840 + contact_y) // 2
            draw.line([(bx, 840), (mid_x, mid_y), (contact_x, contact_y)], fill="#10b981", width=11)
            draw.ellipse([mid_x - 10, mid_y - 10, mid_x + 10, mid_y + 10], fill="#3b82f6")
        else:
            tx = map_x(natural_tip_x)
            ty = natural_tip_y
            mid_x = (bx + tx) // 2
            mid_y = (840 + ty) // 2
            draw.line([(bx, 840), (mid_x, mid_y), (tx, ty)], fill="#94a3b8", width=8)
            draw.ellipse([mid_x - 8, mid_y - 8, mid_x + 8, mid_y + 8], fill="#cbd5e1")
            draw.ellipse([tx - 10, ty - 10, tx + 10, ty + 10], fill="#94a3b8")

    draw_finger("index", 750, 720, 400)
    draw_finger("middle", 790, 800, 370)
    draw_finger("ring", 830, 880, 410)
    draw_finger("pinky", 870, 950, 470)

    # Crosshair and callout
    draw_crosshair(draw, contact_x, contact_y)
    callout_x = (contact_x + 80) if not is_left else (contact_x - 440)
    draw_callout_card(draw, callout_x, contact_y - 52, "Precision Pinch Point", f"Thumb + {finger_name} Tip")

    draw_footer(draw, f"Target: Touch Thumb Tip cleanly to {finger_name} Tip • Hold 0.6s", f"{side_name} Hand • MediaPipe #{finger_num*4} ➔ #4")
    save_dual(im, f"t3_{side}_{target_finger}")
    if side == "right":
        save_dual(im, f"t3_step{finger_num}_{target_finger}")

# ==============================================================================
# TEST 4: TIMED REACTION STRIKE
# ==============================================================================

def render_t4_demo():
    im, draw = create_base_canvas()
    draw_top_badge(draw, "Wolf Motor Function Test (WMFT)", "Timed Reaction Strike", "Wait at center ready origin ➔ Strike peripheral target swiftly as soon as it flashes.")

    # Workspace plane
    draw.ellipse([200, 700, 1400, 980], fill="#f1f5f9", outline="#cbd5e1", width=4)

    # Center ready origin
    draw.ellipse([596, 796, 684, 884], fill="#eff6ff", outline="#0284c7", width=5)
    draw.ellipse([630, 830, 650, 850], fill="#0284c7")
    draw.text((640, 915), "READY ORIGIN", font=font_card_title, fill="#0284c7", anchor="mm")
    draw.text((640, 945), "(Wait Here)", font=font_sub, fill="#64748b", anchor="mm")

    # Flashing reaction target
    draw.ellipse([988, 608, 1172, 792], fill="#fee2e2", outline="#ef4444", width=6)
    draw.ellipse([960, 580, 1200, 820], outline="#ef4444", width=4)
    draw.ellipse([930, 550, 1230, 850], outline="#ef4444", width=3)
    draw.ellipse([1066, 686, 1094, 714], fill="#ef4444")
    draw.text((1080, 570), "⚡ FLASH TARGET", font=font_title, fill="#dc2626", anchor="mm")

    # Direct ballistic reach stroke
    draw_dashed_curve(draw, [(660, 820), (840, 760), (1040, 710)], color="#0284c7", width=9)

    # Speed streaks
    draw.line([(740, 860), (880, 810)], fill="#38bdf8", width=5)
    draw.line([(820, 730), (960, 680)], fill="#38bdf8", width=5)

    # Latency badge
    draw.rounded_rectangle([700, 540, 1060, 604], radius=20, fill="#ffffff", outline="#0284c7", width=4)
    draw.text((880, 572), "FAST BALLISTIC REACH", font=font_badge, fill="#0284c7", anchor="mm")

    draw_footer(draw, "Measures Reaction Latency & Movement Smoothness (Jerk) • 10 Fast Trials", "MediaPipe Hand Center Velocity")
    save_dual(im, "t4_demo_clinical")

# ==============================================================================
# TEST 5: RANGE OF MOTION (ROM) SWEEP (STEP 0 + 3 STEPS)
# ==============================================================================

def render_t5_stepback():
    im, draw = create_base_canvas()
    draw_top_badge(draw, "Pre-Check • Distance Calibration", "Step Back 2–3 Meters", "Ensure your entire body and both outstretched arms fit inside the camera frame.")

    # AR Camera Boundary
    draw.rounded_rectangle([460, 220, 1140, 1060], radius=32, outline="#10b981", width=6)
    # Corner brackets
    draw.line([(460, 280), (460, 220), (520, 220)], fill="#10b981", width=12)
    draw.line([(1140, 280), (1140, 220), (1080, 220)], fill="#10b981", width=12)
    draw.line([(460, 1000), (460, 1060), (520, 1060)], fill="#10b981", width=12)
    draw.line([(1140, 1000), (1140, 1060), (1080, 1060)], fill="#10b981", width=12)

    # Full body stick figure
    draw.ellipse([748, 308, 852, 412], fill="#f8fafc", outline="#1e293b", width=9)
    draw.line([(800, 412), (800, 700)], fill="#1e293b", width=10)
    # Outstretched arms
    draw.line([(800, 480), (560, 480)], fill="#10b981", width=9)
    draw.ellipse([548, 468, 572, 492], fill="#10b981")
    draw.line([(800, 480), (1040, 480)], fill="#10b981", width=9)
    draw.ellipse([1028, 468, 1052, 492], fill="#10b981")
    # Legs
    draw.line([(800, 700), (710, 960)], fill="#64748b", width=9)
    draw.ellipse([698, 948, 722, 972], fill="#64748b")
    draw.line([(800, 700), (890, 960)], fill="#64748b", width=9)
    draw.ellipse([878, 948, 902, 972], fill="#64748b")

    # Safe status banner
    draw.rounded_rectangle([520, 580, 1080, 644], radius=20, fill="#ffffff", outline="#10b981", width=4)
    draw.text((800, 612), "✓ FULL BODY & ARM SPAN DETECTED", font=font_badge, fill="#047857", anchor="mm")

    # Distance floor marker
    draw.rounded_rectangle([630, 1016, 970, 1064], radius=12, fill="#eff6ff", outline="#0284c7", width=3)
    draw.text((800, 1040), "STAND 2.0 – 3.0 METERS BACK", font=font_tag, fill="#0369a1", anchor="mm")

    draw_footer(draw, "Pre-Check: Step back until box turns green • Hold 5.0s", "Full-Body Pose Detection Active")
    save_dual(im, "t5_step0_stepback")

def render_t5_straight(arm="right"):
    is_left = (arm.lower() == "left")
    im, draw = create_base_canvas()
    side_text = "Left Arm ⬅️" if is_left else "Right Arm ➡️"
    draw_top_badge(draw, f"Step 2 • Lateral Arm Reach ({side_text})", f"180° Straight Reach ({side_text})", f"Keep {arm.lower()} elbow completely straight (180°) and extend into reach target box.")

    draw.line([(400, 1020), (1200, 1020)], fill="#cbd5e1", width=4)
    torso_x = 920 if is_left else 680
    inact_x = 980 if is_left else 620
    sh_x = torso_x
    sh_y = 510

    # Head & Spine
    draw.ellipse([torso_x - 52, 358, torso_x + 52, 462], fill="#f8fafc", outline="#1e293b", width=9)
    draw.line([(torso_x, 462), (torso_x, 740)], fill="#1e293b", width=10)
    # Legs
    draw.line([(torso_x, 740), (torso_x - 60, 1000)], fill="#64748b", width=9)
    draw.line([(torso_x, 740), (torso_x + 60, 1000)], fill="#64748b", width=9)
    # Inactive arm
    draw.line([(torso_x, sh_y), (inact_x, 720)], fill="#94a3b8", width=8)

    # Active arm straight (180°)
    hand_x = torso_x - 360 if is_left else torso_x + 360
    elbow_x = torso_x - 180 if is_left else torso_x + 180
    draw.ellipse([sh_x - 12, sh_y - 12, sh_x + 12, sh_y + 12], fill="#0284c7", outline="#ffffff", width=4)
    draw.line([(sh_x, sh_y), (hand_x, sh_y)], fill="#0284c7", width=11)
    draw.ellipse([elbow_x - 10, sh_y - 10, elbow_x + 10, sh_y + 10], fill="#38bdf8")
    draw.ellipse([hand_x - 14, sh_y - 14, hand_x + 14, sh_y + 14], fill="#0284c7")

    # Arc pts
    arc_pts = []
    if is_left:
        for deg in range(90, 271, 10):
            rad = math.radians(deg)
            arc_pts.append((sh_x + 360 * math.cos(rad), sh_y - 360 * math.sin(rad)))
    else:
        for deg in range(90, -91, -10):
            rad = math.radians(deg)
            arc_pts.append((sh_x + 360 * math.cos(rad), sh_y - 360 * math.sin(rad)))
    draw_dashed_curve(draw, arc_pts, color="#0284c7", width=7)

    card_x = 120 if is_left else 1080
    draw_callout_card(draw, card_x, 360, f"180° {side_text}", "Elbow straight • Reach box")
    draw_footer(draw, f"Step 2: Straight {arm.capitalize()} Arm Reach Calibration • Radius ~360px", f"MediaPipe {arm.capitalize()} Shoulder & Elbow Angle = 180°")
    save_dual(im, f"t5_step1_straight_{arm.lower()}")
    if not is_left:
        save_dual(im, "t5_step1_straight")

def render_t5_slightbend(arm="right"):
    is_left = (arm.lower() == "left")
    im, draw = create_base_canvas()
    side_text = "Left Arm ⬅️" if is_left else "Right Arm ➡️"
    draw_top_badge(draw, f"Trajectory 2 of 3 • Mid-Range Rotation ({side_text})", f"120° Slight Elbow Bend ({side_text})", f"Bend {arm.lower()} elbow slightly (~120°) and rotate arm in a medium-radius circular sweep.")

    draw.line([(400, 1020), (1200, 1020)], fill="#cbd5e1", width=4)
    torso_x = 920 if is_left else 680
    inact_x = 980 if is_left else 620
    sh_x = torso_x
    sh_y = 510

    draw.ellipse([torso_x - 52, 358, torso_x + 52, 462], fill="#f8fafc", outline="#1e293b", width=9)
    draw.line([(torso_x, 462), (torso_x, 740)], fill="#1e293b", width=10)
    draw.line([(torso_x, 740), (torso_x - 60, 1000)], fill="#64748b", width=9)
    draw.line([(torso_x, 740), (torso_x + 60, 1000)], fill="#64748b", width=9)
    draw.line([(torso_x, sh_y), (inact_x, 720)], fill="#94a3b8", width=8)

    # Active arm bent at ~120°
    el_x = torso_x - 170 if is_left else torso_x + 170
    el_y = 450
    hand_x = torso_x - 270 if is_left else torso_x + 270
    hand_y = 570

    draw.ellipse([sh_x - 12, sh_y - 12, sh_x + 12, sh_y + 12], fill="#10b981", outline="#ffffff", width=4)
    draw.line([(sh_x, sh_y), (el_x, el_y)], fill="#10b981", width=11)
    draw.ellipse([el_x - 10, el_y - 10, el_x + 10, el_y + 10], fill="#3b82f6")
    draw.line([(el_x, el_y), (hand_x, hand_y)], fill="#10b981", width=11)
    draw.ellipse([hand_x - 14, hand_y - 14, hand_x + 14, hand_y + 14], fill="#10b981")

    # Arc pts
    arc_pts = []
    if is_left:
        for deg in range(90, 271, 10):
            rad = math.radians(deg)
            arc_pts.append((sh_x + 270 * math.cos(rad), sh_y - 270 * math.sin(rad)))
    else:
        for deg in range(90, -91, -10):
            rad = math.radians(deg)
            arc_pts.append((sh_x + 270 * math.cos(rad), sh_y - 270 * math.sin(rad)))
    draw_dashed_curve(draw, arc_pts, color="#10b981", width=7)

    card_x = 120 if is_left else 1080
    draw_callout_card(draw, card_x, 400, f"~120° {side_text}", "Moderate angle • Mid circle")
    draw_footer(draw, f"Trajectory 2: Moderate Bend {arm.capitalize()} Coronal Sweep • Radius ~270px", f"MediaPipe {arm.capitalize()} Shoulder & Elbow Angle ≈ 120°")
    save_dual(im, f"t5_step2_slightbend_{arm.lower()}")
    if not is_left:
        save_dual(im, "t5_step2_slightbend")

def render_t5_folded(arm="right"):
    is_left = (arm.lower() == "left")
    im, draw = create_base_canvas()
    side_text = "Left Arm ⬅️" if is_left else "Right Arm ➡️"
    draw_top_badge(draw, f"Trajectory 3 of 3 • Compact Inner Rotation ({side_text})", f"65° Folded Elbow Sweep ({side_text})", f"Fold {arm.lower()} elbow close to torso (~65°) and rotate hand in a compact inner circle.")

    draw.line([(400, 1020), (1200, 1020)], fill="#cbd5e1", width=4)
    torso_x = 920 if is_left else 680
    inact_x = 980 if is_left else 620
    sh_x = torso_x
    sh_y = 510

    draw.ellipse([torso_x - 52, 358, torso_x + 52, 462], fill="#f8fafc", outline="#1e293b", width=9)
    draw.line([(torso_x, 462), (torso_x, 740)], fill="#1e293b", width=10)
    draw.line([(torso_x, 740), (torso_x - 60, 1000)], fill="#64748b", width=9)
    draw.line([(torso_x, 740), (torso_x + 60, 1000)], fill="#64748b", width=9)
    draw.line([(torso_x, sh_y), (inact_x, 720)], fill="#94a3b8", width=8)

    # Active arm folded at ~65°
    el_x = torso_x - 110 if is_left else torso_x + 110
    el_y = 560
    hand_x = torso_x - 60 if is_left else torso_x + 60
    hand_y = 450

    draw.ellipse([sh_x - 12, sh_y - 12, sh_x + 12, sh_y + 12], fill="#8b5cf6", outline="#ffffff", width=4)
    draw.line([(sh_x, sh_y), (el_x, el_y)], fill="#8b5cf6", width=11)
    draw.ellipse([el_x - 10, el_y - 10, el_x + 10, el_y + 10], fill="#3b82f6")
    draw.line([(el_x, el_y), (hand_x, hand_y)], fill="#8b5cf6", width=11)
    draw.ellipse([hand_x - 14, hand_y - 14, hand_x + 14, hand_y + 14], fill="#8b5cf6")

    # Arc pts
    arc_pts = []
    if is_left:
        for deg in range(90, 271, 10):
            rad = math.radians(deg)
            arc_pts.append((sh_x + 150 * math.cos(rad), sh_y - 150 * math.sin(rad)))
    else:
        for deg in range(90, -91, -10):
            rad = math.radians(deg)
            arc_pts.append((sh_x + 150 * math.cos(rad), sh_y - 150 * math.sin(rad)))
    draw_dashed_curve(draw, arc_pts, color="#8b5cf6", width=7)

    card_x = 120 if is_left else 1040
    draw_callout_card(draw, card_x, 440, f"~65° {side_text}", "Tight fold • Inner circle")
    draw_footer(draw, f"Trajectory 3: Folded Elbow {arm.capitalize()} Coronal Sweep • Radius ~150px", f"MediaPipe {arm.capitalize()} Shoulder & Elbow Angle ≈ 65°")
    save_dual(im, f"t5_step3_folded_{arm.lower()}")
    if not is_left:
        save_dual(im, "t5_step3_folded")

def render_t5_3corridors(arm="right"):
    is_left = (arm.lower() == "left")
    im, draw = create_base_canvas()
    side_text = "Left Arm ⬅️" if is_left else "Right Arm ➡️"
    draw_top_badge(draw, f"Step 3 • 3-Zone Concentric Sweep ({side_text})", f"3 Ranging Corridors ({side_text})", "1. Straight Arm ➔ 2. Slight Bend ➔ 3. Folded Elbow. Complete full sweeps across all 3 corridors.")

    draw.line([(400, 1020), (1200, 1020)], fill="#cbd5e1", width=4)
    torso_x = 920 if is_left else 680
    inact_x = 980 if is_left else 620
    sh_x = torso_x
    sh_y = 510

    # Body
    draw.ellipse([torso_x - 52, 358, torso_x + 52, 462], fill="#f8fafc", outline="#1e293b", width=9)
    draw.line([(torso_x, 462), (torso_x, 740)], fill="#1e293b", width=10)
    draw.line([(torso_x, 740), (torso_x - 60, 1000)], fill="#64748b", width=9)
    draw.line([(torso_x, 740), (torso_x + 60, 1000)], fill="#64748b", width=9)
    draw.line([(torso_x, sh_y), (inact_x, 720)], fill="#94a3b8", width=8)

    # Shoulder node
    draw.ellipse([sh_x - 14, sh_y - 14, sh_x + 14, sh_y + 14], fill="#f59e0b", outline="#ffffff", width=4)

    # 3 Concentric Arcs
    radii_colors = [(360, "#0284c7", "1. Straight"), (260, "#10b981", "2. Slight Bend"), (150, "#8b5cf6", "3. Folded")]
    for r, col, lbl in radii_colors:
        arc_pts = []
        if is_left:
            for deg in range(90, 271, 8):
                rad = math.radians(deg)
                arc_pts.append((sh_x + r * math.cos(rad), sh_y - r * math.sin(rad)))
        else:
            for deg in range(90, -91, -8):
                rad = math.radians(deg)
                arc_pts.append((sh_x + r * math.cos(rad), sh_y - r * math.sin(rad)))
        draw_dashed_curve(draw, arc_pts, color=col, width=6)

    # Callout card explaining 3 corridors
    card_x = 120 if is_left else 1060
    draw_callout_card(draw, card_x, 380, f"3 Corridors ({side_text})", "Concentric ROM Sweeps")
    draw_footer(draw, f"Step 3: 360° Concentric Arc Coverage across 3 Corridors • {side_text}", "Real-Time Angular Sweep Tracking")
    save_dual(im, f"t5_sweep_3corridors_{arm.lower()}")
    if not is_left:
        save_dual(im, "t5_sweep_3corridors")

# ==============================================================================
# MAIN BATCH
# ==============================================================================

def main():
    print("Generating all clinical stick figure illustrations as high-res JPGs...")
    render_t1_step1()
    render_t1_step2()
    render_t1_step3()
    render_t2_demo()
    render_t3_open()
    for finger in ["index", "middle", "ring", "pinky"]:
        render_t3_pinch("left", finger)
        render_t3_pinch("right", finger)
    render_t4_demo()
    render_t5_stepback()
    # Test 5 both Left and Right arms!
    render_t5_straight("left")
    render_t5_straight("right")
    render_t5_slightbend("left")
    render_t5_slightbend("right")
    render_t5_folded("left")
    render_t5_folded("right")
    render_t5_3corridors("left")
    render_t5_3corridors("right")
    print("All JPGs generated successfully!")

if __name__ == "__main__":
    main()
