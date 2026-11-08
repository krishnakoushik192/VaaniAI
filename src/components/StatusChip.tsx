import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StringKey, useT } from '../i18n';
import { radii, useTheme } from '../theme';
import { Icon, IconName } from './Icon';
import { T } from './Text';

export type ChipKind = 'paid' | 'settled' | 'due' | 'overdue' | 'pending' | 'failed' | 'synced' | 'syncing' | 'offline';

const DEFAULTS: Record<ChipKind, { label: StringKey; icon?: IconName }> = {
  paid: { label: 'status.paid', icon: 'check' },
  settled: { label: 'status.settled', icon: 'check' },
  syncing: { label: 'status.syncing', icon: 'refresh' },
  due: { label: 'status.due' },
  overdue: { label: 'status.overdue', icon: 'warning' },
  pending: { label: 'status.pending', icon: 'clock' },
  failed: { label: 'status.failed', icon: 'warning' },
  synced: { label: 'status.synced', icon: 'check' },
  offline: { label: 'status.offline', icon: 'cloudOff' },
};

/** Status is a word and an icon, never colour alone. */
export function StatusChip({ kind, label, align = 'end' }: { kind: ChipKind; label?: string; align?: 'start' | 'center' | 'end' }) {
  const { colors } = useTheme();
  const t = useT();
  const d = DEFAULTS[kind];
  const tone =
    kind === 'paid' || kind === 'synced' || kind === 'settled'
      ? { fg: colors.successText, bg: colors.successSoft, icon: colors.success }
      : kind === 'overdue' || kind === 'failed'
      ? { fg: colors.danger, bg: colors.dangerSoft, icon: colors.danger }
      : kind === 'offline' || kind === 'syncing'
      ? { fg: colors.ink2, bg: colors.surfaceMuted, icon: colors.ink2 }
      : { fg: colors.warningText, bg: colors.warningSoft, icon: colors.warning };
  return (
    <View style={[styles.chip, { backgroundColor: tone.bg, alignSelf: align === 'start' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end' }]}>
      {d.icon ? <Icon name={d.icon} size={14} color={tone.icon} strokeWidth={2.2} /> : null}
      <T variant="caption" color={tone.fg} style={styles.label} numberOfLines={1}>
        {label ?? t(d.label)}
      </T>
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
    flexShrink: 0,
  },
  label: { letterSpacing: 0, flexShrink: 0 },
});
