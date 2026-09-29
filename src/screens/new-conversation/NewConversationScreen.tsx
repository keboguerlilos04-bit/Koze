import React, { useMemo, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { StackActions, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { tailwind } from '@/theme';
import i18n from '@/i18n';
import { useAppSelector } from '@/hooks';
import { Icon, KozeCard, KozeEmptyState, KozeTextInput } from '@/components-next';
import { WhatsAppFilledIcon } from '@/svg-icons';
import { showToast } from '@/utils/toastUtils';
import { getTemplatesForInbox } from '@/utils/messageTemplateUtils';
import { selectAllInboxes } from '@/store/inbox/inboxSelectors';
import { showAdminError } from '@/store/admin/adminService';
import { NewConversationService } from '@/store/new-conversation/newConversationService';
import type { NormalizedTemplate, TemplateSendParams } from '@/types';
import {
  WhatsAppTemplateForm,
  WhatsAppTemplateItem,
} from '@/screens/chat-screen/components/whatsapp-templates';

const PHONE_REGEX = /^\+\d{8,15}$/;

const Label = ({ text }: { text: string }) => (
  <Animated.Text style={tailwind.style('font-inter-420-20 text-koze-navy pb-2')}>{text}</Animated.Text>
);

// Koze: start a WhatsApp conversation. WhatsApp only lets a business write first with an
// approved template, so the owner picks the inbox, the customer's number and a template.
const NewConversationScreen = () => {
  const navigation = useNavigation();
  const inboxes = useAppSelector(selectAllInboxes);
  const whatsAppInboxes = useMemo(
    () => inboxes.filter(inbox => inbox.channelType === 'Channel::Whatsapp'),
    [inboxes],
  );
  const [inboxId, setInboxId] = useState<number | undefined>(whatsAppInboxes[0]?.id);
  const [phoneNumber, setPhoneNumber] = useState('+509');
  const [contactName, setContactName] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [template, setTemplate] = useState<NormalizedTemplate | null>(null);
  const [isSending, setIsSending] = useState(false);

  const inbox = whatsAppInboxes.find(item => item.id === inboxId);
  const templates = useMemo(() => getTemplatesForInbox(inbox), [inbox]);
  const cleanPhone = phoneNumber.replace(/[\s-]/g, '');

  const pickTemplate = (picked: NormalizedTemplate) => {
    if (!PHONE_REGEX.test(cleanPhone)) {
      setPhoneError(i18n.t('NEW_CONVERSATION.PHONE_ERROR'));
      return;
    }
    setPhoneError(undefined);
    setTemplate(picked);
  };

  const send = async ({
    message,
    templateParams,
  }: {
    message: string;
    templateParams: TemplateSendParams;
  }) => {
    if (isSending || !inboxId) return;
    setIsSending(true);
    try {
      const conversationId = await NewConversationService.start({
        inboxId,
        phoneNumber: cleanPhone,
        contactName: contactName.trim(),
        message,
        templateParams,
      });
      showToast({ message: i18n.t('NEW_CONVERSATION.STARTED') });
      navigation.dispatch(StackActions.replace('ChatScreen', { conversationId }));
    } catch (error) {
      showAdminError(error);
      setIsSending(false);
    }
  };

  if (whatsAppInboxes.length === 0) {
    return (
      <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas pt-16')}>
        <KozeEmptyState
          title={i18n.t('NEW_CONVERSATION.TITLE')}
          subtitle={i18n.t('NEW_CONVERSATION.NO_WHATSAPP')}
        />
      </SafeAreaView>
    );
  }

  if (template) {
    return (
      <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-white')}>
        <WhatsAppTemplateForm template={template} onBack={() => setTemplate(null)} onSend={send} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={tailwind.style('flex-1 bg-koze-canvas')}>
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
        contentContainerStyle={tailwind.style('px-5 pt-3 pb-10 gap-5')}>
        {whatsAppInboxes.length > 1 && (
          <View>
            <Label text={i18n.t('NEW_CONVERSATION.INBOX')} />
            <View style={tailwind.style('flex-row flex-wrap gap-2')}>
              {whatsAppInboxes.map(item => {
                const isSelected = item.id === inboxId;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => setInboxId(item.id)}
                    style={tailwind.style(
                      'flex-row items-center gap-2 px-3 py-2 rounded-full border-[1.5px]',
                      isSelected ? 'bg-blue-800 border-blue-800' : 'bg-white border-koze-line',
                    )}>
                    <Icon size={16} icon={<WhatsAppFilledIcon />} />
                    <Animated.Text
                      style={tailwind.style(
                        'font-inter-medium-24',
                        isSelected ? 'text-white' : 'text-koze-navy',
                      )}>
                      {item.name}
                    </Animated.Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View>
          <Label text={i18n.t('NEW_CONVERSATION.PHONE')} />
          <KozeTextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            hasError={!!phoneError}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          <Animated.Text
            style={tailwind.style(
              'pt-2 text-sm font-inter-normal-20',
              phoneError ? 'text-ruby-900' : 'text-koze-muted',
            )}>
            {phoneError ?? i18n.t('NEW_CONVERSATION.PHONE_HINT')}
          </Animated.Text>
        </View>

        <View>
          <Label text={i18n.t('NEW_CONVERSATION.NAME')} />
          <KozeTextInput value={contactName} onChangeText={setContactName} autoCapitalize="words" />
        </View>

        <View>
          <Label text={i18n.t('NEW_CONVERSATION.TEMPLATE')} />
          <Animated.Text style={tailwind.style('text-sm font-inter-normal-20 text-koze-muted pb-3')}>
            {i18n.t('NEW_CONVERSATION.TEMPLATE_HINT')}
          </Animated.Text>
          {templates.length === 0 ? (
            <KozeCard style={tailwind.style('p-4')}>
              <Animated.Text style={tailwind.style('font-inter-normal-20 text-koze-muted')}>
                {i18n.t('NEW_CONVERSATION.NO_TEMPLATES')}
              </Animated.Text>
            </KozeCard>
          ) : (
            <KozeCard style={tailwind.style('overflow-hidden')}>
              {templates.map((item, index) => (
                <WhatsAppTemplateItem
                  key={item.id}
                  template={item}
                  onPress={pickTemplate}
                  isLastItem={index === templates.length - 1}
                />
              ))}
            </KozeCard>
          )}
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default NewConversationScreen;
