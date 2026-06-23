export function SchoolIllustration() {
  return (
    <svg viewBox="0 0 440 320" className="h-full w-auto max-w-full" preserveAspectRatio="xMidYMid meet" role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="si-glow" cx="50%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#e3edff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#e3edff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="si-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe39a" />
          <stop offset="100%" stopColor="#ffc94d" />
        </radialGradient>
        <linearGradient id="si-domeMain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fa6f5" />
          <stop offset="100%" stopColor="#3b63d8" />
        </linearGradient>
        <linearGradient id="si-domeSide" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fb3f6" />
          <stop offset="100%" stopColor="#4f78e0" />
        </linearGradient>
        <linearGradient id="si-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef3fd" />
        </linearGradient>
        <linearGradient id="si-mountain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#aebdde" />
          <stop offset="100%" stopColor="#c9d4ef" />
        </linearGradient>
        <linearGradient id="si-tree1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9fe0a0" />
          <stop offset="100%" stopColor="#4fae6a" />
        </linearGradient>
        <linearGradient id="si-tree2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd0a0" />
          <stop offset="100%" stopColor="#3fa873" />
        </linearGradient>
        <linearGradient id="si-lawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe3a8" />
          <stop offset="100%" stopColor="#9ed084" />
        </linearGradient>
        <linearGradient id="si-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f1f4fa" />
          <stop offset="100%" stopColor="#dbe2f0" />
        </linearGradient>
        <filter id="si-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3b63d8" floodOpacity="0.16" />
        </filter>
      </defs>

      {/* sky glow */}
      <rect x="0" y="0" width="440" height="320" fill="url(#si-glow)" />

      {/* sun */}
      <circle cx="380" cy="40" r="20" fill="url(#si-sun)" opacity="0.9" />
      <g stroke="#ffc94d" strokeWidth="3" strokeLinecap="round" opacity="0.7">
        <line x1="380" y1="8" x2="380" y2="1" />
        <line x1="408" y1="40" x2="415" y2="40" />
        <line x1="402" y1="18" x2="407" y2="13" />
        <line x1="402" y1="62" x2="407" y2="67" />
      </g>

      {/* clouds */}
      <g opacity="0.9" fill="#ffffff">
        <ellipse cx="58" cy="38" rx="26" ry="14" />
        <ellipse cx="82" cy="32" rx="19" ry="11" />
        <ellipse cx="36" cy="34" rx="14" ry="9" />
        <ellipse cx="300" cy="58" rx="20" ry="11" />
        <ellipse cx="320" cy="52" rx="14" ry="8" />
      </g>

      {/* birds */}
      <g stroke="#94a8d6" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.75">
        <path d="M150 26 L158 20 L166 26" />
        <path d="M178 42 L186 36 L194 42" />
        <path d="M248 22 L256 16 L264 22" />
      </g>

      {/* distant mountains */}
      <path d="M0 200 L40 168 L80 196 L120 158 L170 200 L220 172 L270 200 L320 164 L370 198 L410 176 L440 200 L440 320 L0 320 Z" fill="url(#si-mountain)" opacity="0.55" />

      {/* rolling lawn */}
      <path d="M0 230 Q60 212 130 226 Q230 244 320 222 Q390 206 440 224 L440 320 L0 320 Z" fill="url(#si-lawn)" />
      <path d="M0 248 Q90 232 180 244 Q280 258 380 240 Q420 234 440 240 L440 320 L0 320 Z" fill="#aedb92" opacity="0.65" />

      {/* bushes along the building base */}
      <g filter="url(#si-shadow)">
        {[[104, 232, 16], [128, 238, 13], [292, 238, 13], [318, 232, 16]].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="url(#si-tree2)" />
        ))}
      </g>

      {/* flowers in the foreground beds */}
      <g>
        {[24, 60, 380, 412].map((x, i) => (
          <g key={x} transform={`translate(${x} ${280 + (i % 2) * 8})`}>
            <circle r="3.4" cx="-4" cy="-2" fill="#ff8fae" />
            <circle r="3.4" cx="4" cy="-2" fill="#ffd166" />
            <circle r="3.4" cx="0" cy="-7" fill="#ff8fae" />
            <circle r="3.4" cx="0" cy="2" fill="#ff8fae" />
            <circle r="1.8" cx="0" cy="-2" fill="#7a4f9e" />
          </g>
        ))}
      </g>

      {/* side trees, fuller layered canopy */}
      <g filter="url(#si-shadow)">
        <rect x="38" y="206" width="11" height="56" rx="3" fill="#9a7350" />
        <circle cx="44" cy="196" r="30" fill="url(#si-tree1)" />
        <circle cx="20" cy="210" r="19" fill="url(#si-tree2)" />
        <circle cx="68" cy="212" r="19" fill="url(#si-tree2)" />
        <circle cx="44" cy="172" r="17" fill="url(#si-tree1)" opacity="0.9" />
      </g>
      <g filter="url(#si-shadow)">
        <rect x="386" y="212" width="10" height="50" rx="3" fill="#9a7350" />
        <circle cx="391" cy="202" r="26" fill="url(#si-tree1)" />
        <circle cx="370" cy="216" r="16" fill="url(#si-tree2)" />
        <circle cx="410" cy="216" r="16" fill="url(#si-tree2)" />
      </g>

      {/* ===== school building ===== */}
      <g filter="url(#si-shadow)">
        {/* main block */}
        <rect x="126" y="138" width="188" height="120" rx="3" fill="url(#si-wall)" stroke="#d7e3f9" strokeWidth="2" />
        {/* corner quoins */}
        {[130, 304].map((x) => (
          <g key={x} stroke="#dbe6fb" strokeWidth="1.4">
            {[146, 162, 178, 194, 210, 226, 242].map((y) => (
              <line key={y} x1={x} y1={y} x2={x + 6} y2={y} />
            ))}
          </g>
        ))}
        {/* roofline */}
        <rect x="120" y="134" width="200" height="8" rx="2" fill="#2f56c4" />

        {/* left side tower */}
        <rect x="134" y="104" width="30" height="38" fill="url(#si-wall)" stroke="#d7e3f9" strokeWidth="1.5" />
        <polygon points="134,104 164,104 149,84" fill="url(#si-domeSide)" />
        <circle cx="149" cy="86" r="4" fill="url(#si-domeSide)" />

        {/* right side tower */}
        <rect x="276" y="104" width="30" height="38" fill="url(#si-wall)" stroke="#d7e3f9" strokeWidth="1.5" />
        <polygon points="276,104 306,104 291,84" fill="url(#si-domeSide)" />
        <circle cx="291" cy="86" r="4" fill="url(#si-domeSide)" />

        {/* central tower + dome */}
        <rect x="196" y="66" width="48" height="72" fill="url(#si-wall)" stroke="#d7e3f9" strokeWidth="2" />
        <path d="M192 66 Q220 16 248 66 Z" fill="url(#si-domeMain)" />
        <circle cx="220" cy="22" r="5" fill="url(#si-domeMain)" />

        {/* flag */}
        <line x1="220" y1="22" x2="220" y2="2" stroke="#9aa7bd" strokeWidth="2.2" />
        <path d="M220,2 q15,2 0,9 q-15,7 0,9 z" fill="#f4805c" />

        {/* clock */}
        <circle cx="220" cy="92" r="15" fill="#ffffff" stroke="#3b63d8" strokeWidth="3" />
        <g stroke="#3b63d8" strokeWidth="1.4">
          <line x1="220" y1="80" x2="220" y2="83" />
          <line x1="220" y1="101" x2="220" y2="104" />
          <line x1="208" y1="92" x2="211" y2="92" />
          <line x1="229" y1="92" x2="232" y2="92" />
        </g>
        <line x1="220" y1="92" x2="220" y2="83" stroke="#3b63d8" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="220" y1="92" x2="228" y2="95" stroke="#3b63d8" strokeWidth="2.2" strokeLinecap="round" />

        {/* columns flanking the entrance */}
        {[176, 192, 248, 264].map((x) => (
          <g key={x}>
            <rect x={x} y="196" width="8" height="62" fill="#f5f8ff" stroke="#d7e3f9" strokeWidth="1.2" />
            <rect x={x - 2} y="192" width="12" height="6" rx="1.5" fill="#dbe6fb" />
          </g>
        ))}

        {/* entrance steps */}
        <rect x="178" y="252" width="84" height="6" fill="#dbe6fb" />
        <rect x="184" y="258" width="72" height="6" fill="#c8d6f3" />

        {/* door (arched) */}
        <path d="M202 258 v-30 a18 18 0 0 1 36 0 v30 z" fill="#3b63d8" />
        <line x1="220" y1="228" x2="220" y2="258" stroke="#2f56c4" strokeWidth="1.4" />
        <circle cx="226" cy="244" r="1.6" fill="#ffe6bd" />

        {/* arched windows, left + right, gridded panes */}
        {[150, 178, 264, 292].map((x) => (
          <g key={x}>
            <path d={`M${x} 222 v-24 a13 13 0 0 1 26 0 v24 z`} fill="#bcd2f7" />
            <line x1={x} y1="206" x2={x + 26} y2="206" stroke="#ffffff" strokeWidth="1.4" />
            <line x1={x + 13} y1="198" x2={x + 13} y2="222" stroke="#ffffff" strokeWidth="1.4" />
          </g>
        ))}
        {/* lower row, square gridded windows */}
        {[140, 168, 274, 302].map((x) => (
          <g key={x}>
            <rect x={x} y="160" width="24" height="22" rx="2" fill="#bcd2f7" />
            <line x1={x} y1="171" x2={x + 24} y2="171" stroke="#ffffff" strokeWidth="1.2" />
            <line x1={x + 12} y1="160" x2={x + 12} y2="182" stroke="#ffffff" strokeWidth="1.2" />
          </g>
        ))}
      </g>

      {/* paved path with tile lines */}
      <polygon points="182,258 258,258 300,300 140,300" fill="url(#si-path)" />
      {[270, 282, 294].map((y, i) => (
        <line key={y} x1={150 + i * 6} y1={y} x2={290 - i * 6} y2={y} stroke="#c3cee6" strokeWidth="1.2" opacity="0.7" />
      ))}

      {/* kids walking toward the school (back view) */}
      <g filter="url(#si-shadow)">
        {/* kid 1 */}
        <g>
          <rect x="121" y="262" width="6" height="14" rx="2" fill="#1f2a44" />
          <rect x="133" y="262" width="6" height="14" rx="2" fill="#1f2a44" />
          <path d="M118 238 q12 -8 24 0 l-2 28 h-20 z" fill="#ffffff" />
          <rect x="121" y="248" width="18" height="20" rx="4" fill="#2f56c4" />
          <rect x="123" y="246" width="14" height="17" rx="4" fill="#3b63d8" stroke="#2f56c4" strokeWidth="1" />
          <line x1="124" y1="247" x2="123" y2="240" stroke="#2f56c4" strokeWidth="2" strokeLinecap="round" />
          <line x1="136" y1="247" x2="137" y2="240" stroke="#2f56c4" strokeWidth="2" strokeLinecap="round" />
          <circle cx="130" cy="232" r="9" fill="#3a2a1d" />
        </g>
        {/* kid 2 */}
        <g>
          <rect x="159" y="266" width="6" height="13" rx="2" fill="#1f2a44" />
          <rect x="170" y="266" width="6" height="13" rx="2" fill="#1f2a44" />
          <path d="M156 244 q11 -7 22 0 l-2 26 h-18 z" fill="#ffffff" />
          <rect x="159" y="253" width="16" height="18" rx="4" fill="#e0566f" />
          <rect x="161" y="251" width="13" height="15" rx="4" fill="#d6334f" stroke="#b32540" strokeWidth="1" />
          <line x1="161" y1="252" x2="160" y2="246" stroke="#b32540" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="173" y1="252" x2="174" y2="246" stroke="#b32540" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="167" cy="238" r="8" fill="#2c2117" />
        </g>
        {/* kid 3 (girl, pigtails + skirt) */}
        <g>
          <rect x="197" y="270" width="6" height="13" rx="2" fill="#1f2a44" />
          <rect x="209" y="270" width="6" height="13" rx="2" fill="#1f2a44" />
          <path d="M193 246 q12 8 24 0 l3 26 h-30 z" fill="#1f2a44" />
          <path d="M194 244 q11 -8 22 0 l-2 14 h-18 z" fill="#ffffff" />
          <rect x="197" y="251" width="16" height="14" rx="4" fill="#e0566f" />
          <rect x="199" y="249" width="13" height="13" rx="4" fill="#d6334f" stroke="#b32540" strokeWidth="1" />
          <line x1="199" y1="250" x2="198" y2="244" stroke="#b32540" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="211" y1="250" x2="212" y2="244" stroke="#b32540" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="205" cy="236" r="8" fill="#3a2416" />
          <circle cx="195" cy="240" r="3.4" fill="#3a2416" />
          <circle cx="215" cy="240" r="3.4" fill="#3a2416" />
        </g>
        {/* kid 4 */}
        <g>
          <rect x="235" y="262" width="6" height="14" rx="2" fill="#1f2a44" />
          <rect x="247" y="262" width="6" height="14" rx="2" fill="#1f2a44" />
          <path d="M232 238 q12 -8 24 0 l-2 28 h-20 z" fill="#ffffff" />
          <rect x="235" y="248" width="18" height="20" rx="4" fill="#2f56c4" />
          <rect x="237" y="246" width="14" height="17" rx="4" fill="#3b63d8" stroke="#2f56c4" strokeWidth="1" />
          <line x1="238" y1="247" x2="237" y2="240" stroke="#2f56c4" strokeWidth="2" strokeLinecap="round" />
          <line x1="250" y1="247" x2="251" y2="240" stroke="#2f56c4" strokeWidth="2" strokeLinecap="round" />
          <circle cx="244" cy="232" r="9" fill="#2c2117" />
        </g>
      </g>
    </svg>
  );
}
