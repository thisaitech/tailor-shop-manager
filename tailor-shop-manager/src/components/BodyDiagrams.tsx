interface BodyDiagramProps {
  gender: 'male' | 'female';
  type: 'upper' | 'lower';
}

export function BodyDiagram({ gender, type }: BodyDiagramProps) {
  if (type === 'lower') {
    return <LowerBodyDiagram gender={gender} />;
  }
  return <UpperBodyDiagram gender={gender} />;
}

function UpperBodyDiagram({ gender }: { gender: 'male' | 'female' }) {
  const isFemale = gender === 'female';

  return (
    <g>
      {/* Head */}
      <ellipse cx="150" cy="45" rx="25" ry="30" fill="#E8D5C4" stroke="#C4A484" strokeWidth="1.5" />

      {/* Neck */}
      <rect x="140" y="70" width="20" height="25" fill="#E8D5C4" stroke="#C4A484" strokeWidth="1" />

      {/* Shoulders and Torso */}
      <path
        d={isFemale
          ? "M110 95 L140 95 L150 95 L160 95 L190 95 L195 130 L192 180 L108 180 L105 130 Z"
          : "M105 95 L140 95 L150 95 L160 95 L195 95 L200 130 L195 185 L105 185 L100 130 Z"
        }
        fill="#E8D5C4"
        stroke="#C4A484"
        strokeWidth="1.5"
      />

      {/* Chest detail for female */}
      {isFemale && (
        <>
          <ellipse cx="135" cy="125" rx="18" ry="15" fill="#E8D5C4" stroke="#C4A484" strokeWidth="1" />
          <ellipse cx="165" cy="125" rx="18" ry="15" fill="#E8D5C4" stroke="#C4A484" strokeWidth="1" />
        </>
      )}

      {/* Left Arm */}
      <path
        d="M105 95 L85 115 L70 175 L80 178 L95 120 L105 100"
        fill="#E8D5C4"
        stroke="#C4A484"
        strokeWidth="1.5"
      />

      {/* Right Arm */}
      <path
        d="M195 95 L215 115 L230 175 L220 178 L205 120 L195 100"
        fill="#E8D5C4"
        stroke="#C4A484"
        strokeWidth="1.5"
      />

      {/* Left Hand */}
      <ellipse cx="75" cy="182" rx="8" ry="10" fill="#E8D5C4" stroke="#C4A484" strokeWidth="1" />

      {/* Right Hand */}
      <ellipse cx="225" cy="182" rx="8" ry="10" fill="#E8D5C4" stroke="#C4A484" strokeWidth="1" />

      {/* Measurement guide lines (subtle) */}
      <line x1="110" y1="95" x2="190" y2="95" stroke="#ddd" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1="108" y1="130" x2="192" y2="130" stroke="#ddd" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1="108" y1="180" x2="192" y2="180" stroke="#ddd" strokeWidth="0.5" strokeDasharray="2,2" />
    </g>
  );
}

function LowerBodyDiagram({ gender }: { gender: 'male' | 'female' }) {
  const isFemale = gender === 'female';

  return (
    <g>
      {/* Waist/Hip Area */}
      <path
        d={isFemale
          ? "M105 90 L195 90 L210 135 L200 145 L165 150 L150 148 L135 150 L100 145 L90 135 Z"
          : "M110 90 L190 90 L200 130 L195 140 L160 145 L150 143 L140 145 L105 140 L100 130 Z"
        }
        fill="#E8D5C4"
        stroke="#C4A484"
        strokeWidth="1.5"
      />

      {/* Left Leg */}
      <path
        d={isFemale
          ? "M100 145 L135 150 L140 200 L138 300 L132 385 L118 385 L120 300 L115 200 L90 135"
          : "M105 140 L140 145 L142 200 L140 300 L135 385 L120 385 L122 300 L118 200 L100 130"
        }
        fill="#E8D5C4"
        stroke="#C4A484"
        strokeWidth="1.5"
      />

      {/* Right Leg */}
      <path
        d={isFemale
          ? "M200 145 L165 150 L160 200 L162 300 L168 385 L182 385 L180 300 L185 200 L210 135"
          : "M195 140 L160 145 L158 200 L160 300 L165 385 L180 385 L178 300 L182 200 L200 130"
        }
        fill="#E8D5C4"
        stroke="#C4A484"
        strokeWidth="1.5"
      />

      {/* Left Foot */}
      <ellipse cx="125" cy="392" rx="12" ry="8" fill="#E8D5C4" stroke="#C4A484" strokeWidth="1" />

      {/* Right Foot */}
      <ellipse cx="175" cy="392" rx="12" ry="8" fill="#E8D5C4" stroke="#C4A484" strokeWidth="1" />

      {/* Measurement guide lines (subtle) */}
      <line x1="105" y1="100" x2="195" y2="100" stroke="#ddd" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1="95" y1="135" x2="205" y2="135" stroke="#ddd" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1="118" y1="175" x2="137" y2="175" stroke="#ddd" strokeWidth="0.5" strokeDasharray="2,2" />
    </g>
  );
}
