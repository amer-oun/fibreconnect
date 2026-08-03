/**
 * An OTDR trace — the reflectometer curve a fibre technician reads all day.
 *
 * Optical power falls steadily with distance; each connector and each splice
 * puts a spike or a step in the line, and the fibre end drops off the scale.
 * It is the most characteristic artifact of this trade, so it opens the site
 * instead of an abstract hero image.
 *
 * Static by design: the project allows exactly one animation, and it is spent
 * on the intervention timeline.
 */
export default function TraceOtdr({ className = "" }: { className?: string }) {
  const evenements = [
    { x: 90, y: 120, libelle: "NRO", detail: "0 km" },
    { x: 300, y: 152, libelle: "Épissure", detail: "2,4 km" },
    { x: 480, y: 176, libelle: "Coupleur 1:8", detail: "4,1 km" },
    { x: 660, y: 205, libelle: "PBO", detail: "6,8 km" },
    { x: 800, y: 224, libelle: "ONT client", detail: "7,9 km" },
  ];

  return (
    <svg
      viewBox="0 0 900 300"
      className={className}
      role="img"
      aria-label="Trace de réflectométrie : la puissance optique décroît le long de la fibre, avec un pic à chaque connecteur et à chaque épissure."
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="voile-trace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grille de mesure */}
      <g stroke="#1A3A67" strokeWidth="1">
        {[60, 110, 160, 210, 260].map((y) => (
          <line key={y} x1="40" y1={y} x2="880" y2={y} />
        ))}
      </g>

      {/* Axes */}
      <g
        fill="#64748B"
        fontSize="11"
        fontFamily="var(--font-mono, monospace)"
        letterSpacing="0.06em"
      >
        <text x="40" y="52">
          dB
        </text>
        <text x="836" y="284">
          km
        </text>
      </g>

      {/* Surface sous la courbe */}
      <path
        d="M40 96 L90 108 L96 120 L300 140 L306 152 L480 164 L488 176 L660 194 L668 205 L800 216 L806 224 L830 262 L880 262 L880 285 L40 285 Z"
        fill="url(#voile-trace)"
      />

      {/* La trace elle-meme */}
      <path
        d="M40 96 L90 108 L90 92 L96 120 L300 140 L300 126 L306 152 L480 164 L480 148 L488 176 L660 194 L660 178 L668 205 L800 216 L800 200 L806 224 L830 262 L880 262"
        fill="none"
        stroke="#22D3EE"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Evenements repertories sur la ligne */}
      {evenements.map((e) => (
        <g key={e.libelle}>
          <line
            x1={e.x}
            y1={e.y}
            x2={e.x}
            y2={286}
            stroke="#1A3A67"
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          <circle cx={e.x} cy={e.y} r="3.5" fill="#0B1D3A" stroke="#22D3EE" strokeWidth="1.5" />
          <text
            x={e.x}
            y={e.y - 14}
            fill="#F5F7FA"
            fontSize="11.5"
            fontWeight="500"
            textAnchor="middle"
            fontFamily="var(--font-sans, sans-serif)"
          >
            {e.libelle}
          </text>
          <text
            x={e.x}
            y={299}
            fill="#64748B"
            fontSize="10"
            textAnchor="middle"
            fontFamily="var(--font-mono, monospace)"
          >
            {e.detail}
          </text>
        </g>
      ))}
    </svg>
  );
}
