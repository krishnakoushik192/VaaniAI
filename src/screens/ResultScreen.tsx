import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { generatePDF } from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { TextField } from '../components/Form';
import { BottomSheet } from '../components/Sheet';
import { ErrorBanner } from '../components/Feedback';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { StatusChip } from '../components/StatusChip';
import { T } from '../components/Text';
import { PaymentMethod } from '../data/types';
import { TFn, useT } from '../i18n';
import { invoiceFileName, invoiceHtml } from '../logic/invoice';
import { BillItem, formatINR } from '../logic/money';
import { ResultKind, useRouter } from '../navigation/Router';
import { methodLabel, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';
import { unitText } from './BillReviewScreen';

const qtyText = (t: TFn, i: BillItem) => (i.unit === 'pc' ? String(i.qty) : `${i.qty} ${unitText(t, i.unit)}`);
const perUnit = (t: TFn, i: BillItem) => (i.unit === 'pc' ? t('unit.each') : i.unit === 'L' ? t('unit.litre') : unitText(t, i.unit));

/** Bill saved / Added to Khata / Payment recorded. Only shown after the server confirmed the save. */
export function ResultScreen({ kind, amount, customerId, method }: { kind: ResultKind; amount: number; customerId: string | null; method: PaymentMethod }) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, customerById, setCustomerPhone } = useStore();
  const [askPhone, setAskPhone] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneTried, setPhoneTried] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  // Only a bill has an invoice (not a dues payment), and only the one just saved.
  const bill = kind !== 'payment' ? state.lastBill : null;

  // The customer's number: saved on the customer, or typed in when sharing.
  const savedPhone = bill?.customerPhone ?? (bill?.customerId ? customerById(bill.customerId)?.phone : undefined) ?? null;

  /**
   * Make the invoice PDF on the phone and send it on WhatsApp straight to `to` (10 digits).
   * No number, or no WhatsApp on this phone: the normal share sheet opens instead.
   */
  const sendInvoice = async (to: string | null) => {
    if (!bill || !state.shop || sharing) {
      return;
    }
    setSharing(true);
    setShareError(null);
    try {
      const fileName = invoiceFileName(state.shop.shopName, bill.number);
      const html = invoiceHtml({ t, shop: state.shop, bill, qtyText: i => qtyText(t, i), unitText: i => perUnit(t, i) });
      const pdf = await generatePDF({ html, fileName, width: 595, height: 842 }); // A4
      const file = {
        url: pdf.filePath.startsWith('file://') ? pdf.filePath : `file://${pdf.filePath}`,
        type: 'application/pdf',
        filename: fileName,
        title: t('inv.shareTitle', { shop: state.shop.shopName }),
      };
      let sent = false;
      if (to) {
        for (const [social, pkg] of [
          [Share.Social.WHATSAPP, 'com.whatsapp'],
          [Share.Social.WHATSAPPBUSINESS, 'com.whatsapp.w4b'],
        ] as const) {
          const installed = await Share.isPackageInstalled(pkg).catch(() => ({ isInstalled: false }));
          if (installed.isInstalled) {
            // whatsAppNumber: country code + number; supported on Android, missing from the library's types
            await Share.shareSingle({ ...file, social, whatsAppNumber: `91${to}` } as Parameters<typeof Share.shareSingle>[0]);
            sent = true;
            break;
          }
        }
        if (!sent) {
          setShareError(t('inv.noWhatsapp'));
        }
      }
      if (!sent) {
        await Share.open({ ...file, failOnCancel: false });
      }
    } catch {
      setShareError(t('inv.failed'));
    } finally {
      setSharing(false);
    }
  };

  const shareInvoice = () => {
    if (savedPhone) {
      sendInvoice(savedPhone);
    } else {
      setPhone('');
      setPhoneTried(false);
      setAskPhone(true); // no number yet: ask for it first
    }
  };

  const phoneOk = /^[6-9]\d{9}$/.test(phone);
  const sendToTyped = async () => {
    setPhoneTried(true);
    if (!phoneOk) {
      return;
    }
    setAskPhone(false);
    if (bill?.customerId) {
      await setCustomerPhone(bill.customerId, phone).catch(() => {}); // remembered for next time; sending still goes ahead
    }
    sendInvoice(phone);
  };
  const customer = customerById(customerId);
  const name = customer?.name ?? t('common.walkIn');

  const khata = kind === 'khata';
  const title = kind === 'payment' ? t('result.paymentRecorded') : khata ? t('result.addedKhata') : t('result.billSaved');
  const line = khata ? t('result.addedLine', { amount: formatINR(amount), name }) : t('result.receivedLine', { amount: formatINR(amount), name });

  return (
    <Screen
      footer={
        <>
          <Button
            label={t('result.next')}
            onPress={() => {
              router.reset('home');
              router.push({ name: 'recorder' });
            }}
          />
          {bill ? (
            <Button label={sharing ? t('inv.making') : t('inv.share')} variant="secondary" icon="send" onPress={shareInvoice} disabled={sharing} />
          ) : null}
          {customer ? (
            <Button label={t('result.openKhata', { name: customer.name })} variant="secondary" onPress={() => router.resetTo({ name: 'customer', id: customer.id })} />
          ) : null}
          <Button label={t('common.home')} variant="ghost" small onPress={() => router.reset('home')} />
        </>
      }>
      {shareError ? <ErrorBanner message={shareError} onRetry={shareInvoice} /> : null}
      <BottomSheet visible={askPhone} onClose={() => setAskPhone(false)} title={t('inv.phoneTitle')}>
        <View style={styles.sheet}>
          <T variant="supporting" color={colors.ink2}>
            {bill?.customerId ? t('inv.phoneSubSave', { name: bill.customerName ?? '' }) : t('inv.phoneSub')}
          </T>
          <TextField
            label={t('login.mobile')}
            value={phone}
            onChangeText={v => setPhone(v.replace(/\D/g, ''))}
            prefix="+91"
            keyboardType="number-pad"
            maxLength={10}
            autoFocus
            error={phoneTried && !phoneOk ? t('login.errMobile') : undefined}
          />
          <Button label={t('inv.send')} icon="send" onPress={sendToTyped} />
          <Button
            label={t('inv.otherApps')}
            variant="ghost"
            small
            onPress={() => {
              setAskPhone(false);
              sendInvoice(null);
            }}
          />
        </View>
      </BottomSheet>
      <View style={styles.center}>
        <View style={[styles.well, { backgroundColor: khata ? colors.warningSoft : colors.successSoft }]}>
          <Icon name={khata ? 'khata' : 'check'} size={40} color={khata ? colors.warning : colors.success} strokeWidth={2.4} />
        </View>
        <T variant="screenTitle" style={styles.text}>
          {title}
        </T>
        <T variant="displayAmount" color={khata ? colors.warningText : colors.success}>
          {khata ? formatINR(amount) : formatINR(amount, { sign: true })}
        </T>
        <T variant="body" color={colors.ink2} style={styles.text}>
          {line}
        </T>
        <View style={styles.chips}>
          <StatusChip kind={khata ? 'due' : 'paid'} align="center" label={khata ? undefined : methodLabel(t, method)} />
          <StatusChip kind="synced" align="center" />
        </View>
        {customer && customer.balance > 0 ? (
          <T variant="supporting" color={colors.ink2}>
            {t('result.nowOwes', { name: customer.name, amount: formatINR(customer.balance) })}
          </T>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space[3], paddingTop: space[10] },
  well: { width: 88, height: 88, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
  text: { textAlign: 'center' },
  chips: { flexDirection: 'row', gap: space[2] },
  sheet: { gap: space[3] },
});
