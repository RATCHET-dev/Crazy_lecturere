import { AvatarExpression } from '../game/avatarSystem';

interface AvatarFaceBadgeProps {
  expression: AvatarExpression;
  hoodieColor: string;
  skinColor?: string;
}

export function AvatarFaceBadge({
  expression,
  hoodieColor,
  skinColor = '#a06c48',
}: AvatarFaceBadgeProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-10 h-10 shrink-0 rounded-md border border-white/15 bg-[#141820]"
      aria-label={`Avatar expression: ${expression}`}
    >
      {/* Hoodie shoulders */}
      <path d="M8 64 Q14 48 32 48 Q50 48 56 64 Z" fill={hoodieColor} />
      <rect x="26" y="42" width="12" height="10" fill={skinColor} />
      {/* Head + Hair */}
      <rect x="18" y="13" width="28" height="32" rx="12" fill={skinColor} />
      <path d="M17 24 Q17 10 32 10 Q47 10 47 24 Q39 17 32 18 Q25 17 17 24 Z" fill="#121214" />

      {/* Expressions matching protagonist_sheet_e5bac211.svg */}
      {expression === 'frightened' && (
        <g>
          <path d="M21 22 L28 19 M36 19 L43 22" stroke="#121214" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="25" cy="28" r="3.4" fill="#fff" />
          <circle cx="25" cy="28" r="1.2" fill="#111" />
          <circle cx="39" cy="28" r="3.4" fill="#fff" />
          <circle cx="39" cy="28" r="1.2" fill="#111" />
          <ellipse cx="32" cy="39" rx="3.5" ry="4.5" fill="#3a1810" />
          <path d="M46 13 Q43 19 46 21 Q49 19 46 13 Z" fill="#9fd3e6" />
        </g>
      )}

      {expression === 'surprised' && (
        <g>
          <path d="M21 21 Q25 18 29 21 M35 21 Q39 18 43 21" stroke="#121214" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx="25" cy="28" r="3.2" fill="#fff" />
          <circle cx="25" cy="28" r="1.5" fill="#111" />
          <circle cx="39" cy="28" r="3.2" fill="#fff" />
          <circle cx="39" cy="28" r="1.5" fill="#111" />
          <ellipse cx="32" cy="39" rx="2.6" ry="3.2" fill="#3a1810" />
        </g>
      )}

      {expression === 'exhausted' && (
        <g>
          <path d="M21 24 L29 21 M35 21 L43 24" stroke="#121214" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="25" cy="29" rx="3" ry="1.5" fill="#fff" />
          <circle cx="25" cy="29" r="1.1" fill="#111" />
          <ellipse cx="39" cy="29" rx="3" ry="1.5" fill="#fff" />
          <circle cx="39" cy="29" r="1.1" fill="#111" />
          <path d="M27 40 Q32 36 37 40" stroke="#4a2616" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}

      {expression === 'determined' && (
        <g>
          <path d="M21 21 L29 24 M35 24 L43 21" stroke="#121214" strokeWidth="2.6" strokeLinecap="round" />
          <ellipse cx="25" cy="28" rx="3.2" ry="1.8" fill="#fff" />
          <circle cx="25" cy="28" r="1.3" fill="#111" />
          <ellipse cx="39" cy="28" rx="3.2" ry="1.8" fill="#fff" />
          <circle cx="39" cy="28" r="1.3" fill="#111" />
          <path d="M27 38 L37 38" stroke="#4a2616" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}

      {expression === 'neutral' && (
        <g>
          <path d="M21 22 L29 22 M35 22 L43 22" stroke="#121214" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="25" cy="28" rx="3" ry="2.2" fill="#fff" />
          <circle cx="25" cy="28" r="1.3" fill="#111" />
          <ellipse cx="39" cy="28" rx="3" ry="2.2" fill="#fff" />
          <circle cx="39" cy="28" r="1.3" fill="#111" />
          <path d="M27 38 Q32 40.5 37 38" stroke="#4a2616" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}
