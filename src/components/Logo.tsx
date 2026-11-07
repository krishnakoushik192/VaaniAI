import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

// The Vaani logo set from the design system (Assets → Logos), as react-native-svg.
// Pick `ground` by what the logo sits on, not by the theme name.
// Clear space = the awning's height; min size: mark 24px, lockup 96px wide.

type Ground = 'light' | 'dark';

const INKS: Record<Ground, { awning: string; ink: string; coin: string }> = {
  light: { awning: '#1769e0', ink: '#151922', coin: '#a8823f' },
  dark: { awning: '#6ea8ff', ink: '#f3f5f8', coin: '#d4b47a' },
};

const AWNING = 'M20 16H100A6 6 0 0 1 106 22V32A11.5 11.5 0 0 1 83 32A11.5 11.5 0 0 1 60 32A11.5 11.5 0 0 1 37 32A11.5 11.5 0 0 1 14 32V22A6 6 0 0 1 20 16Z';
const BARS: [number, number, number][] = [
  [15.5, 70, 16],
  [28.5, 62, 32],
  [41.5, 53, 50],
  [69.5, 53, 50],
  [82.5, 62, 32],
  [95.5, 70, 16],
];

function MarkShapes({ g }: { g: Ground }) {
  const c = INKS[g];
  return (
    <>
      <Path d={AWNING} fill={c.awning} />
      {BARS.map(([x, y, h]) => (
        <Rect key={x} x={x} y={y} width={9} height={h} rx={4.5} fill={c.ink} />
      ))}
      <Circle cx={60} cy={78} r={9.5} fill={c.coin} />
    </>
  );
}

function WordShapes({ g }: { g: Ground }) {
  const c = INKS[g];
  const s = { fill: 'none', stroke: c.ink, strokeWidth: 8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <>
      <Path d="M4 4L22 46L40 4" {...s} />
      <Circle cx={62} cy={32} r={14} {...s} />
      <Path d="M76 18V46" {...s} />
      <Circle cx={104} cy={32} r={14} {...s} />
      <Path d="M118 18V46" {...s} />
      <Path d="M134 46V18M134 32A14 14 0 0 1 162 32V46" {...s} />
      <Path d="M180 22V46" {...s} />
      <Circle cx={180} cy={7} r={5.5} fill={c.coin} />
    </>
  );
}

const a11y = { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: 'Vaani' };

export function LogoMark({ size = 40, ground = 'light' }: { size?: number; ground?: Ground }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" {...a11y}>
      <MarkShapes g={ground} />
    </Svg>
  );
}

export function LogoWordmark({ width = 120, ground = 'light' }: { width?: number; ground?: Ground }) {
  return (
    <Svg width={width} height={(width * 54) / 192} viewBox="-2 -2 192 54" {...a11y}>
      <WordShapes g={ground} />
    </Svg>
  );
}

export function LogoLockup({ width = 220, ground = 'light' }: { width?: number; ground?: Ground }) {
  return (
    <Svg width={Math.max(96, width)} height={(Math.max(96, width) * 120) / 420} viewBox="0 0 420 120" {...a11y}>
      <MarkShapes g={ground} />
      <G transform="translate(144 34.6) scale(1.38)">
        <WordShapes g={ground} />
      </G>
    </Svg>
  );
}

/** Launcher-style tile: white tile on light, `premium` tile on dark. */
export function AppIcon({ size = 64, ground = 'light' }: { size?: number; ground?: Ground }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" {...a11y} accessibilityLabel="Vaani app icon">
      <Rect
        x={0.5}
        y={0.5}
        width={119}
        height={119}
        rx={27}
        fill={ground === 'light' ? '#ffffff' : '#111827'}
        stroke={ground === 'light' ? '#e6eaf0' : '#2a3344'}
      />
      <G transform="translate(15 13) scale(0.75)">
        <MarkShapes g={ground} />
      </G>
    </Svg>
  );
}
