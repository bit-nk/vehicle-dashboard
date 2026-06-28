import { useId } from 'react'

// Lightweight, fully self-contained car illustration. No network images, so it
// paints instantly even on low-end phones. Recolors to each vehicle and offers
// several "shots" (side / front / rear / interior) for the gallery.

function shade(hex, amt) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.max(0, Math.min(255, Math.round(r + amt)))
  g = Math.max(0, Math.min(255, Math.round(g + amt)))
  b = Math.max(0, Math.min(255, Math.round(b + amt)))
  return `rgb(${r},${g},${b})`
}

function Backdrop({ id }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3f5f8" />
          <stop offset="55%" stopColor="#e7ebf1" />
          <stop offset="100%" stopColor="#dbe1ea" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="360" height="200" fill={`url(#${id}-bg)`} />
      <rect x="0" y="0" width="360" height="200" fill={`url(#${id}-glow)`} />
    </>
  )
}

function Paint({ id, color }) {
  return (
    <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={shade(color, 38)} />
      <stop offset="45%" stopColor={color} />
      <stop offset="100%" stopColor={shade(color, -34)} />
    </linearGradient>
  )
}

function Wheel({ cx }) {
  return (
    <g>
      <circle cx={cx} cy="150" r="25" fill="#16181d" />
      <circle cx={cx} cy="150" r="13" fill="#cfd4db" />
      <circle cx={cx} cy="150" r="12" fill="none" stroke="#9aa2ad" strokeWidth="1.5" />
      <circle cx={cx} cy="150" r="4" fill="#7a828d" />
    </g>
  )
}

function SideView({ id, color, bodyStyle }) {
  const glass = '#aebccd'
  // greenhouse (cabin) shape per body style
  let cabin
  if (bodyStyle === 'Truck') {
    cabin = 'M120 96 L120 64 Q121 58 128 58 L188 58 Q196 58 198 66 L202 96 Z'
  } else if (bodyStyle === 'SUV' || bodyStyle === 'Minivan') {
    cabin = 'M112 96 L114 60 Q115 54 123 54 L236 54 Q245 54 247 62 L250 96 Z'
  } else {
    // sedan / coupe / hatchback - lower sloped roofline
    cabin = 'M118 96 L132 64 Q136 58 145 58 L222 58 Q235 58 240 70 L250 96 Z'
  }
  return (
    <g>
      {/* shadow */}
      <ellipse cx="186" cy="178" rx="150" ry="13" fill="#000" opacity="0.12" />
      {/* cabin */}
      <path d={cabin} fill={shade(color, -12)} />
      <path
        d={cabin}
        fill={glass}
        transform="translate(0 5) scale(0.94)"
        style={{ transformOrigin: '186px 78px' }}
        opacity="0.92"
      />
      {/* lower body */}
      <path
        d="M34 150 Q30 120 44 112 L96 104 Q120 90 168 90 L250 92 Q300 96 322 120 L330 138 Q332 150 322 150 Z"
        fill={`url(#${id}-paint)`}
        stroke={shade(color, -50)}
        strokeWidth="1"
      />
      {/* door seams */}
      <path d="M150 96 L150 148 M210 94 L210 148" stroke={shade(color, -38)} strokeWidth="1.2" opacity="0.5" />
      {/* highlight */}
      <path d="M70 116 Q170 102 300 120" stroke="#fff" strokeWidth="2" opacity="0.35" fill="none" />
      {/* lights */}
      <rect x="318" y="118" width="12" height="9" rx="2" fill="#fff6d8" />
      <rect x="36" y="120" width="9" height="9" rx="2" fill="#e2655e" />
      {/* wheel arches */}
      <circle cx="96" cy="150" r="30" fill={shade(color, -45)} />
      <circle cx="276" cy="150" r="30" fill={shade(color, -45)} />
      <Wheel cx="96" />
      <Wheel cx="276" />
    </g>
  )
}

function FrontView({ id, color }) {
  return (
    <g>
      <ellipse cx="180" cy="176" rx="120" ry="12" fill="#000" opacity="0.12" />
      {/* body */}
      <path d="M84 158 Q80 96 110 82 Q180 66 250 82 Q280 96 276 158 Z" fill={`url(#${id}-paint)`} stroke={shade(color, -50)} strokeWidth="1" />
      {/* windshield */}
      <path d="M116 92 Q180 80 244 92 L232 116 Q180 108 128 116 Z" fill="#aebccd" opacity="0.92" />
      {/* hood highlight */}
      <path d="M118 124 Q180 116 242 124" stroke="#fff" strokeWidth="2" opacity="0.3" fill="none" />
      {/* grille */}
      <rect x="150" y="132" width="60" height="16" rx="4" fill={shade(color, -52)} />
      <rect x="158" y="150" width="44" height="9" rx="3" fill={shade(color, -40)} />
      {/* headlights */}
      <path d="M96 120 Q112 116 134 122 L130 134 Q112 130 100 132 Z" fill="#fff6d8" />
      <path d="M264 120 Q248 116 226 122 L230 134 Q248 130 260 132 Z" fill="#fff6d8" />
      {/* mirrors */}
      <rect x="78" y="104" width="12" height="8" rx="3" fill={shade(color, -20)} />
      <rect x="270" y="104" width="12" height="8" rx="3" fill={shade(color, -20)} />
    </g>
  )
}

function RearView({ id, color }) {
  return (
    <g>
      <ellipse cx="180" cy="176" rx="120" ry="12" fill="#000" opacity="0.12" />
      <path d="M84 158 Q80 96 110 82 Q180 66 250 82 Q280 96 276 158 Z" fill={`url(#${id}-paint)`} stroke={shade(color, -50)} strokeWidth="1" />
      <path d="M120 92 Q180 82 240 92 L240 118 Q180 110 120 118 Z" fill="#aebccd" opacity="0.9" />
      {/* taillights */}
      <rect x="92" y="120" width="40" height="16" rx="4" fill="#e2655e" />
      <rect x="228" y="120" width="40" height="16" rx="4" fill="#e2655e" />
      {/* plate */}
      <rect x="156" y="138" width="48" height="14" rx="2" fill="#eef1f5" stroke={shade(color, -30)} strokeWidth="1" />
      <path d="M120 126 Q180 120 240 126" stroke="#fff" strokeWidth="2" opacity="0.25" fill="none" />
    </g>
  )
}

function InteriorView({ interiorHex = '#2a2d33' }) {
  const seat = interiorHex
  return (
    <g>
      <rect x="0" y="0" width="360" height="200" fill="#1c1f25" />
      {/* dashboard */}
      <path d="M0 96 Q180 70 360 96 L360 130 Q180 112 0 130 Z" fill="#2b2f37" />
      {/* infotainment */}
      <rect x="156" y="92" width="48" height="32" rx="4" fill="#0c0e12" stroke="#3a3f49" />
      <rect x="160" y="96" width="40" height="9" rx="2" fill="#3385fc" opacity="0.6" />
      {/* steering wheel */}
      <circle cx="92" cy="120" r="26" fill="none" stroke="#0e1014" strokeWidth="9" />
      <circle cx="92" cy="120" r="6" fill="#0e1014" />
      <line x1="92" y1="120" x2="68" y2="120" stroke="#0e1014" strokeWidth="6" />
      <line x1="92" y1="120" x2="108" y2="138" stroke="#0e1014" strokeWidth="6" />
      {/* seats */}
      <rect x="232" y="120" width="44" height="58" rx="10" fill={seat} />
      <rect x="240" y="108" width="28" height="34" rx="9" fill={shade(interiorHex, 18)} />
      <rect x="296" y="120" width="44" height="58" rx="10" fill={seat} opacity="0.85" />
      {/* windshield glow */}
      <path d="M0 0 H360 V70 Q180 50 0 70 Z" fill="#3a4658" opacity="0.5" />
    </g>
  )
}

export default function CarImage({
  color = '#5d6066',
  interiorHex = '#2a2d33',
  bodyStyle = 'Sedan',
  view = 'side',
  className = '',
  rounded = true,
  ...rest
}) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 360 200"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label={`${bodyStyle} ${view} view`}
      style={{ display: 'block', width: '100%', height: '100%', borderRadius: rounded ? 'inherit' : 0 }}
      {...rest}
    >
      {view !== 'interior' && <Backdrop id={id} />}
      <defs>
        <Paint id={id} color={color} />
      </defs>
      {view === 'front' && <FrontView id={id} color={color} />}
      {view === 'rear' && <RearView id={id} color={color} />}
      {view === 'interior' && <InteriorView interiorHex={interiorHex} />}
      {(view === 'side' || !['front', 'rear', 'interior'].includes(view)) && (
        <SideView id={id} color={color} bodyStyle={bodyStyle} />
      )}
    </svg>
  )
}
