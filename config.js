/**
 * NOCTIS — Configuration & Tuning File
 * All section heights, chapter ranges, frame counts, frame paths and callout positions.
 */

window.NOCTIS_CONFIG = {
  // Global Design Tokens
  tokens: {
    asphalt: '#07080A',
    graphite: '#121418',
    fog: '#8A8F98',
    bone: '#EDEAE4',
    xenon: '#CFE3FF',
    taillight: '#E1251B',
    hairline: 'rgba(237, 234, 228, 0.12)'
  },

  // Section 1: Hero scrollytelling
  hero: {
    frameCount: 600,
    desktopPath: 'assets/frames/hero/frame_{index}.webp',
    mobilePath: 'assets/frames/hero-mobile/frame_{index}.webp',
    sectionHeight: '600vh',
    lerpSpeed: 0.15,
    preloadInitialCount: 40, // Preloader waits for 40 frames before revealing page
    blackoutStartProgress: 0.95, // Fades to solid black over last 5%
    hud: {
      maxSpeed: 118,      // 000 -> 118 KM/H
      maxDistance: 4.2    // 0.0 -> 4.2 KM
    },
    chapters: [
      {
        id: 'ch1',
        start: 0.00,
        end: 0.14,
        hudChapter: '01/04',
        title: 'NOCTIS',
        subtitle: 'The city is asleep.',
        hint: 'SCROLL TO WAKE IT'
      },
      {
        id: 'ch2',
        start: 0.22,
        end: 0.42,
        hudChapter: '02/04',
        title: "It doesn't need the city's light."
      },
      {
        id: 'ch3',
        start: 0.50,
        end: 0.70,
        hudChapter: '03/04',
        title: "It brings its own."
      },
      {
        id: 'ch4',
        start: 0.80,
        end: 1.00,
        hudChapter: '04/04',
        title: "GT-E",
        specs: "0–100 KM/H 3.1S · 640 KM RANGE · DUAL MOTOR",
        linkText: "Discover the GT-E",
        linkHref: "#lineup"
      }
    ]
  },

  // Section 2: Statement (word-by-word reveal)
  statement: {
    label: "02 — ENGINEERING",
    sentence: "Every part was designed to disappear into one line of light."
  },

  // Section 3: Dismantle scrollytelling
  dismantle: {
    frameCount: 200,
    desktopPath: 'assets/frames/dismantle/frame_{index}.webp',
    mobilePath: 'assets/frames/dismantle-mobile/frame_{index}.webp',
    sectionHeight: '350vh',
    lerpSpeed: 0.15,
    title: "Look closer.",
    calloutsStartProgress: 0.70,
    // Percentage coordinates (x, y) relative to the stage viewport
    callouts: [
      {
        id: 'body',
        title: 'BODY',
        description: 'Carbon composite monocoque',
        // Target dot position on the exploded roof/chassis
        dotX: 42,
        dotY: 26,
        labelX: 24,
        labelY: 20,
        triggerProgress: 0.72
      },
      {
        id: 'battery',
        title: 'BATTERY',
        description: '110 kWh structural pack',
        // Target dot position on the lowered battery pack
        dotX: 38,
        dotY: 69,
        labelX: 20,
        labelY: 76,
        triggerProgress: 0.79
      },
      {
        id: 'drive',
        title: 'DRIVE',
        description: 'Dual axial-flux motors, 680 kW',
        // Target dot position on the front/rear motor assembly
        dotX: 68,
        dotY: 61,
        labelX: 74,
        labelY: 72,
        triggerProgress: 0.86
      },
      {
        id: 'light',
        title: 'LIGHT',
        description: 'Single-line LED signature',
        // Target dot position on the headlight bar
        dotX: 84,
        dotY: 53,
        labelX: 72,
        labelY: 42,
        triggerProgress: 0.93
      }
    ]
  },

  // Section 4: Lineup accordion
  lineup: {
    label: "03 — THE LINEUP",
    heading: "Five ways to drive the night.",
    cars: [
      {
        id: 'gt-e',
        num: '01',
        name: 'GT-E',
        tagline: 'The grand tourer.',
        specs: {
          range: '640 km',
          accel: '3.1 s',
          power: '680 kW'
        },
        image: 'assets/cars/gt-e.webp',
        alt: 'NOCTIS GT-E matte graphite electric grand tourer coupe',
        colors: ['#1C1E22', '#EDEAE4', '#0A1118', '#07080A'],
        colorNames: ['Matte Graphite', 'Satin Bone', 'Deep Midnight', 'Obsidian']
      },
      {
        id: 's',
        num: '02',
        name: 'S',
        tagline: 'Four doors, no compromise.',
        specs: {
          range: '600 km',
          accel: '3.6 s',
          power: '520 kW'
        },
        image: 'assets/cars/s.webp',
        alt: 'NOCTIS S satin bone white luxury four-door electric sport sedan',
        colors: ['#EDEAE4', '#1C1E22', '#182430', '#07080A'],
        colorNames: ['Satin Bone White', 'Matte Graphite', 'Midnight Navy', 'Obsidian']
      },
      {
        id: 'x',
        num: '03',
        name: 'X',
        tagline: 'Higher, never heavier.',
        specs: {
          range: '560 km',
          accel: '4.2 s',
          power: '480 kW'
        },
        image: 'assets/cars/x.webp',
        alt: 'NOCTIS X midnight blue performance electric SUV with coupe roofline',
        colors: ['#121D28', '#1C1E22', '#EDEAE4', '#07080A'],
        colorNames: ['Midnight Blue', 'Matte Graphite', 'Satin Bone', 'Obsidian']
      },
      {
        id: 'r',
        num: '04',
        name: 'R',
        tagline: 'Built for the track.',
        specs: {
          range: '420 km',
          accel: '2.4 s',
          power: '900 kW'
        },
        image: 'assets/cars/r.webp',
        alt: 'NOCTIS R track-focused two-seat electric coupe in satin black with red accents',
        colors: ['#0A0A0A', '#E1251B', '#1C1E22', '#EDEAE4'],
        colorNames: ['Satin Black', 'Apex Red', 'Matte Graphite', 'Satin Bone']
      },
      {
        id: 'one',
        num: '05',
        name: 'ONE',
        tagline: 'The future, early.',
        specs: {
          range: 'Concept',
          accel: 'Sub 2.0 s',
          power: '1,100 kW'
        },
        image: 'assets/cars/one.webp',
        alt: 'NOCTIS ONE liquid silver prototype electric hypercar',
        colors: ['#C5CBD3', '#07080A', '#1C1E22', '#CFE3FF'],
        colorNames: ['Liquid Silver', 'Obsidian', 'Graphite', 'Xenon Glaze']
      }
    ]
  },

  // Cursor physics & dimensions
  cursor: {
    lerpSpeed: 0.18,
    dotRadius: 3,
    ringRadius: 14,
    barWidth: 44,
    barHeight: 2
  },

  // Grain effect
  grain: {
    fps: 8,
    opacity: 0.035,
    size: 160
  }
};

