import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Vaani 24px line set: 1.9 stroke, round caps. 20px in buttons/rows, 22px in tabs.

export type IconName =
  | 'mic'
  | 'close'
  | 'back'
  | 'chevronRight'
  | 'check'
  | 'home'
  | 'khata'
  | 'history'
  | 'receipt'
  | 'userPlus'
  | 'payment'
  | 'search'
  | 'warning'
  | 'clock'
  | 'cloudOff'
  | 'cloud'
  | 'language'
  | 'plus'
  | 'trash'
  | 'edit'
  | 'phone'
  | 'send'
  | 'fingerprint'
  | 'moon'
  | 'help'
  | 'store'
  | 'user'
  | 'qr'
  | 'refresh'
  | 'logout';

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 20, color, strokeWidth = 1.9 }: Props) {
  const p = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {render(name, p)}
    </Svg>
  );
}

function render(name: IconName, p: object) {
  switch (name) {
    case 'mic':
      return (
        <>
          <Rect x={9} y={3} width={6} height={11} rx={3} {...p} />
          <Path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" {...p} />
        </>
      );
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" {...p} />;
    case 'back':
      return <Path d="M15 6l-6 6 6 6" {...p} />;
    case 'chevronRight':
      return <Path d="M9 6l6 6-6 6" {...p} />;
    case 'check':
      return <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />;
    case 'home':
      return <Path d="M4 11l8-7 8 7v9h-5v-6H9v6H4v-9z" {...p} />;
    case 'khata':
      return (
        <>
          <Path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z" {...p} />
          <Path d="M9 9h6M9 13h4" {...p} />
        </>
      );
    case 'history':
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Path d="M12 7.5V12l3 2" {...p} />
        </>
      );
    case 'receipt':
      return (
        <>
          <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" {...p} />
          <Path d="M9 8h6M9 12h6" {...p} />
        </>
      );
    case 'userPlus':
      return (
        <>
          <Circle cx={10} cy={8} r={4} {...p} />
          <Path d="M3 20c1-4 4-6 7-6s4.5 1 5.5 2.5M18 14v6M15 17h6" {...p} />
        </>
      );
    case 'payment':
      return (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={2.5} {...p} />
          <Path d="M3 10h18M7 15h4" {...p} />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={6.5} {...p} />
          <Path d="M16 16l4 4" {...p} />
        </>
      );
    case 'warning':
      return <Path d="M12 4l9 16H3l9-16zM12 10v4M12 17v.5" {...p} />;
    case 'cloudOff':
      return <Path d="M7 18h10a4 4 0 00.8-7.9A6 6 0 006.3 9.2 4.5 4.5 0 007 18zM4 4l16 16" {...p} />;
    case 'cloud':
      return <Path d="M7 18h10a4 4 0 00.8-7.9A6 6 0 006.3 9.2 4.5 4.5 0 007 18z" {...p} />;
    case 'language':
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.3 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.3-3.5-8.5s1-6 3.5-8.5z" {...p} />
        </>
      );
    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...p} />;
    case 'trash':
      return <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" {...p} />;
    case 'edit':
      return <Path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" {...p} />;
    case 'phone':
      return <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" {...p} />;
    case 'send':
      return <Path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" {...p} />;
    case 'fingerprint':
      return <Path d="M7 17c1-2 1.5-4 1.5-6a3.5 3.5 0 017 0c0 3-.5 6-2 9M12 11c0 3.5-1 6.5-3 9M5 13.5c.3-1 .5-2 .5-2.5a6.5 6.5 0 0113 0c0 1.5-.1 3-.4 4.5M17.5 19c.3-.7.6-1.5.8-2.3" {...p} />;
    case 'moon':
      return <Path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" {...p} />;
    case 'help':
      return (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.2-1.5 2.2M12 16.5v.5" {...p} />
        </>
      );
    case 'store':
      return (
        <>
          <Path d="M4 9l1.5-5h13L20 9a2.7 2.7 0 01-5.3 0 2.7 2.7 0 01-5.4 0A2.7 2.7 0 014 9z" {...p} />
          <Path d="M5.5 12v8h13v-8M10 20v-5h4v5" {...p} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4.5 20c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6" {...p} />
        </>
      );
    case 'qr':
      return <Path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" {...p} />;
    case 'refresh':
      return <Path d="M20 12a8 8 0 01-14 5.3M4 12A8 8 0 0118 6.7M18 3v4h-4M6 21v-4h4" {...p} />;
    case 'logout':
      return <Path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" {...p} />;
  }
}
