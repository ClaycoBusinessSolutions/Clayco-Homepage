/** Source: Sofia’s Clayco Home Motion Options.html. Family letters preserved exactly. */
export const MOTION_SECTIONS = [
  {
    "id": "header",
    "label": "Header",
    "original": "As on the live site: fixed and transparent over the hero, turns white with a red logo once you scroll; menu slides out from the left.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Draw-in + progress rule",
        "description": "Logo draws in on load, menu links cascade in when opened, and a red rule along the bottom tracks scroll progress.",
        "sourceOption": "c",
        "available": true
      },
      {
        "id": "b",
        "label": "Smart hide",
        "description": "Same as live, but tucks away while you scroll down and slides back the moment you scroll up.",
        "sourceOption": "a",
        "available": true
      },
      {
        "id": "c",
        "label": "Shrink & frost",
        "description": "Header gradually compresses and frosts white as you scroll; menu links get a red underline that glides in on hover.",
        "sourceOption": "b",
        "available": true
      }
    ]
  },
  {
    "id": "hero",
    "label": "Hero slider",
    "original": "As on the live site: manual slider with side arrows and an instant cut between projects.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Red curtain wipe",
        "description": "A Clayco-red panel sweeps across between projects and the copy slides in behind it. Auto-advances.",
        "sourceOption": "b",
        "available": true
      },
      {
        "id": "b",
        "label": "Swipe",
        "description": "Projects move like a swipe: the current one slides off as the next slides in right beside it, with a quick start and soft landing. Drag or swipe the hero to change projects yourself. Auto-advances.",
        "sourceOption": "d",
        "available": true
      },
      {
        "id": "c",
        "label": "Ken Burns + line reveal",
        "description": "Slow zoom on each photo, soft crossfades, headlines rising word-by-word, and the red rule before “Our Expertise” and the white bar under the text sliding out on load and on every slide. Auto-advances.",
        "sourceOption": "a",
        "available": true
      }
    ]
  },
  {
    "id": "banner",
    "label": "“Building to make life better”",
    "original": "Static image link.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Red lift",
        "description": "A Clayco-red panel lifts away as the image rises into place. No zoom.",
        "sourceOption": "b",
        "available": true
      },
      {
        "id": "b",
        "label": "Wipe reveal",
        "description": "Image unveils left-to-right behind a red leading edge as it enters view.",
        "sourceOption": "a",
        "available": true
      },
      {
        "id": "c",
        "label": "Line & open",
        "description": "A thin red line draws across the middle of the banner, then splits in two: one rides the top edge up and one the bottom edge down as the image opens between them.",
        "sourceOption": "c",
        "available": true
      }
    ]
  },
  {
    "id": "industries",
    "label": "Industries grid",
    "original": "Static 3×3 grid.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Red split reveal",
        "description": "Each photo starts under a red panel that splits and slides away quickly and smoothly, column by column.",
        "sourceOption": "c",
        "available": false,
        "note": "Removed from Sofia’s current panel."
      },
      {
        "id": "b",
        "label": "Hover reveal",
        "description": "Photos unmask on entry; on hover the photo zooms, a red rule draws under the title and a red “Explore” bar slides up.",
        "sourceOption": "b",
        "available": true
      },
      {
        "id": "c",
        "label": "Staggered rise",
        "description": "Cards rise into place column by column, photos settling from a slight zoom.",
        "sourceOption": "a",
        "available": true
      }
    ]
  },
  {
    "id": "cta",
    "label": "Careers / Vendors CTA",
    "original": "Static headline and buttons.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Highlighter headline",
        "description": "Words rise in one at a time, then “Clayco” gets a red highlighter swipe and the buttons pop in.",
        "sourceOption": "c",
        "available": true
      },
      {
        "id": "b",
        "label": "Red sweep",
        "description": "A flat red panel sweeps once across the section and off the other side, leaving the button outlines red.",
        "sourceOption": "b",
        "available": true
      },
      {
        "id": "c",
        "label": "Kinetic marquee",
        "description": "Giant type outlined in Clayco red streams behind the headline and speeds up (and reverses) with your scroll.",
        "sourceOption": "a",
        "available": true
      }
    ]
  },
  {
    "id": "approach",
    "label": "Integrated Approach",
    "original": "Three static cards.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Expanding panels",
        "description": "The three companies sit side by side; the active one widens and fills with its color to show what it does. Cycles on its own, or hover to choose.",
        "sourceOption": "c",
        "available": true
      },
      {
        "id": "b",
        "label": "Relay sequence (ink)",
        "description": "The same relay, drawn in ink: the rail and step markers are dark instead of red, and the cards have no colored top bars.",
        "sourceOption": "d",
        "available": true
      },
      {
        "id": "c",
        "label": "Relay sequence",
        "description": "A rail draws across Develop → Design → Build, lighting each step and card in order.",
        "sourceOption": "a",
        "available": true
      }
    ]
  },
  {
    "id": "featured",
    "label": "Featured Projects",
    "original": "One slide at a time, instant cut.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Wipe",
        "description": "On each change the next project wipes in from left to right and the caption slides in after it. Auto-advances every 6s.",
        "sourceOption": "b",
        "available": true
      },
      {
        "id": "b",
        "label": "Peek carousel",
        "description": "Neighboring projects peek in at the sides with a red caption box. Auto-advances every 6s; arrows or drag to skip.",
        "sourceOption": "a",
        "available": true
      },
      {
        "id": "c",
        "label": "Continuous drift",
        "description": "Projects glide sideways in an endless loop; hover to pause, arrows to skip ahead.",
        "sourceOption": "c",
        "available": true
      }
    ]
  },
  {
    "id": "values",
    "label": "Safety · Rising · Sustainability · Quality",
    "original": "Alternating text/media blocks.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Fade & lift",
        "description": "The copy fades up line by line as a red panel lifts off the media. Standard layout, no pinning.",
        "sourceOption": "b",
        "available": true
      },
      {
        "id": "b",
        "label": "Split slide-in",
        "description": "Copy and media slide in from opposite sides as each block arrives.",
        "sourceOption": "a",
        "available": true
      },
      {
        "id": "c",
        "label": "Drawn numbers",
        "description": "Big outlined step numbers draw themselves stroke by stroke as each block arrives; images stay as they are.",
        "sourceOption": "c",
        "available": true
      }
    ]
  },
  {
    "id": "footer",
    "label": "Footer / Offices",
    "original": "Static footer.",
    "options": [
      {
        "id": "o",
        "label": "Original design",
        "description": "Use the designer’s original layout and motion.",
        "sourceOption": "o",
        "available": true
      },
      {
        "id": "a",
        "label": "Red bar rise",
        "description": "Row by row from the top, in quick succession, a red bar rises up each set of three offices, revealing them bottom-to-top, and stays as a red rule on top.",
        "sourceOption": "c",
        "available": true
      },
      {
        "id": "b",
        "label": "Live local time",
        "description": "Each office shows its ticking local time; hovering an office swipes a red highlight across its name.",
        "sourceOption": "b",
        "available": true
      },
      {
        "id": "c",
        "label": "Cascade",
        "description": "Office cards fall in one by one with red rules drawing across.",
        "sourceOption": "a",
        "available": true
      }
    ]
  }
];
export const MOTION_PRESETS = [
  {
    "id": "o",
    "label": "Original",
    "settings": {
      "header": "o",
      "hero": "o",
      "banner": "o",
      "industries": "o",
      "cta": "o",
      "approach": "o",
      "featured": "o",
      "values": "o",
      "footer": "o"
    }
  },
  {
    "id": "a",
    "label": "A · Block",
    "settings": {
      "header": "a",
      "hero": "a",
      "banner": "a",
      "industries": "b",
      "cta": "a",
      "approach": "a",
      "featured": "a",
      "values": "a",
      "footer": "a"
    }
  },
  {
    "id": "b",
    "label": "B · Swipe",
    "settings": {
      "header": "b",
      "hero": "b",
      "banner": "b",
      "industries": "b",
      "cta": "b",
      "approach": "b",
      "featured": "b",
      "values": "b",
      "footer": "b"
    }
  },
  {
    "id": "c",
    "label": "C · Linear",
    "settings": {
      "header": "c",
      "hero": "c",
      "banner": "c",
      "industries": "c",
      "cta": "c",
      "approach": "c",
      "featured": "c",
      "values": "c",
      "footer": "c"
    }
  }
];
export const MOTION_SCHEMA_VERSION = 2;
