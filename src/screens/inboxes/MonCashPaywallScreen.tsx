import React, { useCallback, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { Button, Icon, KozeCard, KozeTextInput, Spinner } from '@/components-next';
import { TelegramFilledIcon, WhatsAppFilledIcon } from '@/svg-icons';
import { showToast } from '@/utils/toastUtils';
import { showAdminError } from '@/store/admin/adminService';
import { BillingService, BillingSummary } from '@/store/billing/billingService';
import type { SettingsStackParamList } from '@/navigation/stack/SettingsStack';

const formatHtg = (amount: number) => amount.toLocaleString('fr-FR');

const ReceiptRow = ({
  label,
  value,
  isTotal = false,
}: {
  label: string;
  value: string;
  isTotal?: boolean;
}) => (
  <View
    style={tailwind.style(
      'flex-row justify-between items-center py-3',
      isTotal ? 'border-t-[1.5px] border-t-koze-line mt-1' : '',
    )}>
    <Animated.Text
      style={tailwind.style(
        isTotal ? 'font-inter-580-24 text-koze-navy' : 'font-inter-normal-20 text-koze-muted',
      )}>
      {label}
    </Animated.Text>
    <Animated.Text
      style={tailwind.style(
        'text-right flex-shrink',
        isTotal ? 'text-lg font-inter-580-24 text-blue-800' : 'font-inter-420-20 text-koze-navy',
      )}>
      {value}
    </Animated.Text>
  </View>
);

// Koze: adding an inbox costs 1,500 HTG per month, paid with MonCash. The server checks the
// payment again when the inbox is created, so this screen is not the only guard.
const MonCashPaywallScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  // Accounts created before signup asked for a MonCash number add it here.
  const [moncashDigits, setMoncashDigits] = useState('');
  const [numberError, setNumberError] = useState<string>();
  const [isSavingNumber, setIsSavingNumber] = useState(false);

  const saveNumber = async () => {
    const digits = moncashDigits.replace(/[\s-]/g, '');
    if (!/^\d{8}$/.test(digits)) {
      setNumberError(i18n.t('SIGNUP.MONCASH_ERROR'));
      return;
    }
    setNumberError(undefined);
    setIsSavingNumber(true);
    try {
      setBilling(await BillingService.setMoncashNumber(`+509${digits}`));
    } catch (error) {
      showAdminError(error);
    } finally {
      setIsSavingNumber(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      BillingService.summary()
        .then(summary => isActive && setBilling(summary))
        .catch(showAdminError);
      return () => {
        isActive = false;
      };
    }, []),
  );

  const pay = async () => {
    if (isPaying || !billing) return;
    setIsPaying(true);
    try {
      const { payment } = await BillingService.startPayment();
      // The real MonCash gateway sends the customer to its own page to approve the payment.
      if (payment.redirect_url) {
        await WebBrowser.openBrowserAsync(payment.redirect_url);
      }
      const result = await BillingService.confirmPayment(payment.id);
      setBilling(result);
      if (result.payment.status === 'success') {
        showToast({ message: i18n.t('PAYWALL.SUCCESS') });
      } else {
        showToast({ message: i18n.t('PAYWALL.FAILED') });
      }
    } catch (error) {
      showAdminError(error);
    } finally {
      setIsPaying(false);
    }
  };

  const chooseChannel = (channel: 'whatsapp' | 'telegram') =>
    navigation.replace('AdminAddInbox', { channel });

  if (!billing) {
    return (
      <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas items-center')}>
        <View style={tailwind.style('pt-16')}>
          <Spinner size={24} />
        </View>
      </SafeAreaView>
    );
  }

  const hasCredit = billing.available_credits > 0;
  const price = formatHtg(billing.price);

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <ScrollView contentContainerStyle={tailwind.style('px-5 pt-2 pb-8')}>
        <Animated.Text style={tailwind.style('font-inter-normal-20 text-koze-muted pb-4')}>
          {i18n.t('PAYWALL.SUBTITLE')}
        </Animated.Text>

        {hasCredit ? (
          <KozeCard style={tailwind.style('p-5 gap-3')}>
            <Animated.Text style={tailwind.style('font-inter-580-24 text-koze-navy')}>
              {i18n.t('PAYWALL.CREDIT_AVAILABLE')}
            </Animated.Text>
            <Animated.Text style={tailwind.style('font-inter-normal-20 text-koze-muted pb-2')}>
              {i18n.t('PAYWALL.CHOOSE_CHANNEL')}
            </Animated.Text>
            <View style={tailwind.style('flex-row items-center gap-3')}>
              <Icon size={24} icon={<WhatsAppFilledIcon />} />
              <View style={tailwind.style('flex-1')}>
                <Button
                  text={i18n.t('ADMIN.ADD_WHATSAPP')}
                  handlePress={() => chooseChannel('whatsapp')}
                />
              </View>
            </View>
            <View style={tailwind.style('flex-row items-center gap-3')}>
              <Icon size={24} icon={<TelegramFilledIcon />} />
              <View style={tailwind.style('flex-1')}>
                <Button
                  variant="secondary"
                  text={i18n.t('ADMIN.ADD_TELEGRAM')}
                  handlePress={() => chooseChannel('telegram')}
                />
              </View>
            </View>
          </KozeCard>
        ) : (
          <>
            <KozeCard style={tailwind.style('px-5 pt-4 pb-2')}>
              <Animated.Text
                style={tailwind.style('text-sm font-inter-medium-24 text-koze-muted pb-1')}>
                {i18n.t('PAYWALL.RECEIPT')}
              </Animated.Text>
              <ReceiptRow label={i18n.t('PAYWALL.ITEM')} value={`${price} HTG`} />
              <ReceiptRow
                label={i18n.t('PAYWALL.PERIOD')}
                value={i18n.t('PAYWALL.PERIOD_VALUE', { days: billing.period_days })}
              />
              <ReceiptRow
                label={i18n.t('PAYWALL.MONCASH_NUMBER')}
                value={billing.moncash_number || i18n.t('PAYWALL.NO_NUMBER')}
              />
              <ReceiptRow
                isTotal
                label={i18n.t('PAYWALL.TOTAL')}
                value={i18n.t('PAYWALL.PRICE', { price })}
              />
            </KozeCard>

            {billing.gateway === 'simulated' && (
              <Animated.Text
                style={tailwind.style(
                  'pt-3 text-sm text-center font-inter-normal-20 text-koze-muted',
                )}>
                {i18n.t('PAYWALL.SIMULATED')}
              </Animated.Text>
            )}

            {billing.moncash_number ? (
              <View style={tailwind.style('pt-6')}>
                <Button
                  disabled={isPaying}
                  text={isPaying ? i18n.t('PAYWALL.PAYING') : i18n.t('PAYWALL.PAY', { price })}
                  handlePress={pay}
                />
              </View>
            ) : (
              <KozeCard style={tailwind.style('mt-6 p-5 gap-3')}>
                <Animated.Text style={tailwind.style('font-inter-420-20 text-koze-navy')}>
                  {i18n.t('PAYWALL.ADD_NUMBER')}
                </Animated.Text>
                <KozeTextInput
                  prefix="+509"
                  value={moncashDigits}
                  onChangeText={setMoncashDigits}
                  hasError={!!numberError}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
                {numberError ? (
                  <Animated.Text style={tailwind.style('font-inter-normal-20 text-ruby-900')}>
                    {numberError}
                  </Animated.Text>
                ) : null}
                <Button
                  disabled={isSavingNumber}
                  text={i18n.t('PAYWALL.SAVE_NUMBER')}
                  handlePress={saveNumber}
                />
              </KozeCard>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MonCashPaywallScreen;
