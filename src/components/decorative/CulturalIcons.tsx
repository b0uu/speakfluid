/** Decorative SVG line illustrations — conversation/language themed.
 *  Single-stroke style, consistent 1.5px weight. */

interface IconProps {
  className?: string;
}

export function SpeechBubbleIcon({ className }: IconProps) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 16C12 12.686 14.686 10 18 10H46C49.314 10 52 12.686 52 16V36C52 39.314 49.314 42 46 42H28L18 50V42H18C14.686 42 12 39.314 12 36V16Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <text x="24" y="31" fontSize="11" fontStyle="italic" fill="currentColor" opacity="0.6" fontFamily="Georgia, serif">hola</text>
    </svg>
  );
}

export function SoundWaveIcon({ className }: IconProps) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="16" y1="24" x2="16" y2="40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="18" x2="22" y2="46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="22" x2="28" y2="42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="34" y1="14" x2="34" y2="50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="20" x2="40" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="46" y1="26" x2="46" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function OpenBookIcon({ className }: IconProps) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 18V50M32 18C28 14 20 12 12 14V46C20 44 28 46 32 50M32 18C36 14 44 12 52 14V46C44 44 36 46 32 50"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConversationIcon({ className }: IconProps) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left bubble */}
      <path
        d="M8 14C8 11.79 9.79 10 12 10H32C34.21 10 36 11.79 36 14V26C36 28.21 34.21 30 32 30H16L10 36V30H12C9.79 30 8 28.21 8 26V14Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Right bubble */}
      <path
        d="M56 28C56 25.79 54.21 24 52 24H36C33.79 24 32 25.79 32 28V40C32 42.21 33.79 44 36 44H48L54 50V44H52C54.21 44 56 42.21 56 40V28Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function MicrophoneIcon({ className }: IconProps) {
  return (
    <svg className={className} width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="24" y="10" width="16" height="28" rx="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 32C16 40.837 23.163 48 32 48C40.837 48 48 40.837 48 32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="48" x2="32" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24" y1="56" x2="40" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
