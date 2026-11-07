import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { AppHeader, Screen } from '../components/Layout';
import { T } from '../components/Text';
import { Waveform } from '../components/Waveform';
import { useStore } from '../store/AppStore';
import { mmss, PROCESSING_STEPS, useVoiceRecorder } from '../logic/useVoiceRecorder';
import { useRouter } from '../navigation/Router';
import { radii, size, space, type, useTheme } from '../theme';

export function RecorderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const rec = useVoiceRecorder();
  const { newDraft } = useStore();
  const [billNo] = useState(() => newDraft().number);

  useEffect(() => {
    if (rec.state === 'done' && rec.result) {
      router.replace({ name: 'review', draft: newDraft({ ...rec.result }) });
    }
  }, [rec.state, rec.result, router, newDraft]);

  const processing = rec.state === 'processing' || rec.state === 'done';
  const overline = processing ? 'WORKING ON IT' : rec.state === 'paused' ? 'PAUSED' : 'LISTENING';

  return (
    <Screen
      scroll={false}
      header={
        <AppHeader
          title="New bill"
          onBack={router.back}
          close
          right={
            <T variant="caption" color={colors.ink2} style={{ paddingRight: space[3] }}>
              BILL {billNo}
            </T>
          }
        />
      }>
      <View style={[styles.panel, { backgroundColor: colors.premium, borderColor: colors.premiumLine }]}>
        <View style={{ gap: 6 }}>
          <T variant="caption" color={colors.premiumAccent} style={{ letterSpacing: 1 }}>
            {overline}
          </T>
          <T variant="displaySerif" color={colors.onPremium} style={type.displaySerif}>
            Say the bill
          </T>
          <T variant="teTitle" color={colors.premiumMuted}>
            వస్తువులు, ధర, పరిమాణం చెప్పండి
          </T>
        </View>

        <View style={styles.row8}>
          <View style={[styles.langChip, { borderColor: colors.premiumLine }]}>
            <T variant="caption" color={colors.onPremium} style={{ letterSpacing: 0 }}>
              Telugu + English
            </T>
          </View>
          <Icon name="language" size={14} color={colors.premiumMuted} />
          <T variant="caption" color={colors.premiumMuted} style={{ letterSpacing: 0 }}>
            Auto-detected
          </T>
        </View>

        <Waveform active={rec.state === 'recording'} level={processing ? 1 : (rec.seconds % 8) / 8 + 0.3} />

        <T variant="displayAmount" color={colors.onPremium} style={styles.center}>
          {mmss(rec.seconds)}
        </T>

        <View style={[styles.transcript, { borderColor: colors.premiumLine }]}>
          {processing ? (
            <View style={{ gap: space[3] }} accessibilityLiveRegion="polite">
              {PROCESSING_STEPS.map((s, i) => {
                const done = i < rec.step;
                const now = i === rec.step;
                return (
                  <View key={s} style={styles.row8}>
                    {done ? (
                      <Icon name="check" size={18} color={colors.premiumAccent} strokeWidth={2.4} />
                    ) : now ? (
                      <ActivityIndicator size="small" color={colors.premiumAccent} />
                    ) : (
                      <View style={[styles.dot, { borderColor: colors.premiumMuted }]} />
                    )}
                    <T variant="body" color={done || now ? colors.onPremium : colors.premiumMuted}>
                      {s}
                    </T>
                  </View>
                );
              })}
            </View>
          ) : (
            <>
              <T variant="caption" color={colors.premiumMuted}>
                TRANSCRIPT
              </T>
              <T variant="body" color={colors.onPremium}>
                {rec.transcript || '…'}
              </T>
            </>
          )}
        </View>

        <View style={styles.controls}>
          <Button
            label="Type instead"
            variant="onPremium"
            style={styles.flex}
            onPress={() => router.replace({ name: 'editItems', draft: newDraft() })}
            disabled={processing}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop and review bill"
            disabled={processing}
            onPress={rec.stop}
            style={({ pressed }) => [
              styles.mic,
              { backgroundColor: pressed ? colors.primaryPressed : colors.primary, borderColor: 'rgba(201,169,110,0.3)', opacity: processing ? 0.5 : 1 },
            ]}>
            <View style={styles.stop} />
          </Pressable>
          <Button
            label={rec.state === 'paused' ? 'Resume' : 'Pause'}
            variant="onPremium"
            style={styles.flex}
            onPress={rec.state === 'paused' ? rec.resume : rec.pause}
            disabled={processing}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: {
    flex: 1,
    marginHorizontal: -space[2],
    marginTop: -space[1],
    marginBottom: -space[6],
    borderWidth: 1,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: space[6],
    paddingTop: 28,
    paddingBottom: space[8],
    gap: space[6],
  },
  row8: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  langChip: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  center: { textAlign: 'center' },
  transcript: { flex: 1, borderWidth: 1, borderRadius: radii.md, padding: space[4], gap: 6, backgroundColor: 'rgba(255,255,255,0.04)' },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  mic: { width: size.mic, height: size.mic, borderRadius: radii.pill, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  stop: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#ffffff' },
});
