import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radii, useTheme } from '../theme';
import { Icon, IconName } from './Icon';
import { T } from './Text';

export type ChipKind = 'paid' | 'settled' | 'due' | 'overdue' | 'pending' | 'failed' | 'synced' | 'syncing' | 'offline';

const DEFAULTS: Record<ChipKind, { en: string; te?: string; icon?: IconName }> = {
  paid: { en: 'Paid', te: 'చెల్లించారు', icon: 'check' },
  settled: { en: 'Settled', icon: 'check' },
  syncing: { en: 'Syncing', icon: 'refresh' },
  due: { en: 'Due', te: 'బాకీ' },
  overdue: { en: 'Overdue', icon: 'warning' },
  pending: { en: 'Waiting for payment', icon: 'clock' },
  failed: { en: 'Sync failed', icon: 'warning' },
  synced: { en: 'Synced', icon: 'check' },
  offline: { en: 'Saved on this phone', icon: 'cloudOff' },
};

/** Status is a word and an icon, never colour alone. Reads "Due | బాకీ" on one line. */
export function StatusChip({
  kind,
  label,
  te,
  showTe = false,
  align = 'end',
}: {
  kind: ChipKind;
  label?: string;
  te?: string;
  showTe?: boolean;
  align?: 'start' | 'center' | 'end';
}) {
  const { colors } = useTheme();
  const d = DEFAULTS[kind];
  const tone =
    kind === 'paid' || kind === 'synced' || kind === 'settled'
      ? { fg: colors.successText, bg: colors.successSoft, icon: colors.success }
      : kind === 'overdue' || kind === 'failed'
      ? { fg: colors.danger, bg: colors.dangerSoft, icon: colors.danger }
      : kind === 'offline' || kind === 'syncing'
      ? { fg: colors.ink2, bg: colors.surfaceMuted, icon: colors.ink2 }
      : { fg: colors.warningText, bg: colors.warningSoft, icon: colors.warning };
  const teText = te ?? (showTe || kind === 'due' ? d.te : undefined);
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg, alignSelf: align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end' }]}>
      {d.icon ? <Icon name={d.icon} size={14} color={tone.icon} strokeWidth={2.2} /> : null}
      <T variant="caption" color={tone.fg} style={styles.noCaps}>
        {label ?? d.en}
      </T>
      {teText ? (
        <>
          <View style={[styles.divider, { backgroundColor: tone.fg }]} />
          <T variant="teLine" color={tone.fg} style={styles.te}>
            {teText}
          </T>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  noCaps: { letterSpacing: 0 },
  divider: { width: StyleSheet.hairlineWidth, height: 12, opacity: 0.6, marginHorizontal: 2 },
  te: { fontSize: 12, lineHeight: 16 },
});
