import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useJournalCreateRecord,
  useJournalDeleteRecord,
  useJournalUpdateRecord,
} from '../hooks/useJournalQueries';
import type {
  JournalRecordListItem,
  JournalRecordWriteBody,
  JournalStockMaster,
} from '../types/journal.types';
import {
  calcPnl,
  clampYmd,
  formatKrw,
  formatKrwUnsigned,
  formatPct,
  parseListingDateToYmd,
  pnlColor,
  todayYmd,
} from '../utils/journal-ui.utils';
import { SellDatePickerModal } from './SellDatePickerModal';
import { StockPickerModal } from './StockPickerModal';
import { useToast } from '../../../shared';

type Mode = 'create' | 'edit';

type Props = {
  visible: boolean;
  mode: Mode;
  /** edit 모드에서 채울 초기값. create 모드에서도 lockStock과 함께 prefill 용도로 사용 가능. */
  initial?: JournalRecordListItem;
  /** create 모드에서 종목명을 고정(StockPicker 진입 불가)하고 싶을 때. IPO 상세에서 진입할 때 사용. */
  lockStock?: boolean;
  onClose: () => void;
  /** 저장/삭제 성공 시 화면이 자동 펼침 등 후처리할 수 있도록 (year, monthKey, ymd) 전달 */
  onSaved?: (info: { year: number; monthKey: string }) => void;
};

type FormState = {
  종목명: string;
  종목코드: string;
  확정공모가: number | null;
  상장일: string; // "YYYY.MM.DD" 서버 원본
  수량: string;
  매도가: string;
  매도일: string;
  수수료: string;
  제세금: string;
  메모: string;
};

const EMPTY: FormState = {
  종목명: '',
  종목코드: '',
  확정공모가: null,
  상장일: '',
  수량: '',
  매도가: '',
  매도일: '',
  수수료: '',
  제세금: '',
  메모: '',
};

const DEFAULT_COMMISSION = '2000';

function fromRecord(r: JournalRecordListItem): FormState {
  return {
    종목명: r.종목명,
    종목코드: r.종목코드,
    확정공모가: r.확정공모가,
    상장일: r.상장일,
    수량: r.수량 ? String(r.수량) : '',
    매도가: String(r.매도가),
    매도일: r.매도일,
    수수료: r.수수료 ? String(r.수수료) : '',
    제세금: r.제세금 ? String(r.제세금) : '',
    메모: r.메모 ?? '',
  };
}

type PartialWriteBody = Omit<JournalRecordWriteBody, '손익금' | '수익률'>;

function tryBuildBody(
  f: FormState,
): { ok: true; body: PartialWriteBody } | { ok: false; message: string } {
  const num = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  const numOrZero = (s: string): number => num(s) ?? 0;

  const quantity = num(f.수량);
  if (!quantity || quantity <= 0) {
    return { ok: false, message: '수량을 입력해주세요.' };
  }

  const sellPrice = num(f.매도가);
  if (!sellPrice || sellPrice <= 0) {
    return { ok: false, message: '매도가를 입력해주세요.' };
  }

  const sellDate = f.매도일.trim();
  if (!sellDate || !/^\d{4}-\d{2}-\d{2}$/.test(sellDate)) {
    return { ok: false, message: '매도일을 YYYY-MM-DD 형식으로 입력해주세요.' };
  }

  const cap = todayYmd();
  if (sellDate > cap) {
    return { ok: false, message: '매도일은 오늘 이하여야 합니다.' };
  }

  const listingText = f.상장일.trim();
  const listingYmd = parseListingDateToYmd(listingText);
  if (!listingText || !listingYmd) {
    return {
      ok: false,
      message: '상장일 정보가 없습니다. 종목을 다시 선택해주세요.',
    };
  }
  if (sellDate < listingYmd) {
    return { ok: false, message: '매도일은 상장일 이전일 수 없습니다.' };
  }

  if (f.확정공모가 == null || f.확정공모가 <= 0) {
    return {
      ok: false,
      message: '확정공모가가 없습니다. 종목을 다시 선택해주세요.',
    };
  }

  return {
    ok: true,
    body: {
      종목명: f.종목명,
      종목코드: f.종목코드,
      확정공모가: f.확정공모가,
      수량: quantity,
      매도가: sellPrice,
      매도일: sellDate,
      수수료: numOrZero(f.수수료),
      제세금: numOrZero(f.제세금),
      메모: f.메모,
      상장일: listingText,
    },
  };
}

export function JournalRecordSheet({
  visible,
  mode,
  initial,
  lockStock = false,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sellDatePickerOpen, setSellDatePickerOpen] = useState(false);

  const createMut = useJournalCreateRecord();
  const updateMut = useJournalUpdateRecord();
  const deleteMut = useJournalDeleteRecord();
  const saving = createMut.isPending || updateMut.isPending;
  const { show: showToast } = useToast();

  /** 시트 열릴 때마다 폼 초기화 */
  useEffect(() => {
    if (!visible) {
      return;
    }
    if (mode === 'edit' && initial) {
      setForm(fromRecord(initial));
      return;
    }
    if (mode === 'create' && initial) {
      // IPO 상세 등에서 prefill 진입한 경우 — onPickStock과 동일한 결과를 만든다.
      // 종목/상장일/확정공모가만 채우고, 수량·매도가·제세금은 빈 값(사용자 입력 대기),
      // 매도일은 오늘(상장일 이후로 clamp), 수수료는 DEFAULT_COMMISSION.
      const minYmd = parseListingDateToYmd(initial.상장일);
      const cap = todayYmd();
      const sellDefault = clampYmd(cap, minYmd, cap);
      setForm({
        종목명: initial.종목명,
        종목코드: initial.종목코드,
        확정공모가: initial.확정공모가 || null,
        상장일: initial.상장일,
        수량: initial.수량 ? String(initial.수량) : '',
        매도가: initial.매도가 ? String(initial.매도가) : '',
        매도일: initial.매도일 || sellDefault,
        수수료: initial.수수료 ? String(initial.수수료) : DEFAULT_COMMISSION,
        제세금: initial.제세금 ? String(initial.제세금) : '',
        메모: initial.메모 ?? '',
      });
      return;
    }
    setForm(EMPTY);
  }, [visible, mode, initial]);

  const stockSelected = !!form.종목코드;

  const livePnl = useMemo(() => {
    const qty = Number(form.수량);
    const sell = Number(form.매도가);
    if (!form.확정공모가 || !(qty > 0) || !(sell > 0)) {
      return { 손익금: null, 수익률: null };
    }
    return calcPnl({
      확정공모가: form.확정공모가,
      수량: qty,
      매도가: sell,
      수수료: Number(form.수수료) || 0,
      제세금: Number(form.제세금) || 0,
    });
  }, [form.확정공모가, form.수량, form.매도가, form.수수료, form.제세금]);

  const disabled = mode === 'create' && !stockSelected;
  const fieldOpacity = disabled ? 0.35 : 1;

  const sheetTitle = mode === 'create' ? '기록 추가' : '기록 수정';
  const canSave = stockSelected && !saving;

  const groupingYearMonth = useMemo<{
    year: number;
    monthKey: string;
  } | null>(() => {
    const d = form.매도일 || initial?.매도일 || todayYmd();
    if (!d || d.length < 7) return null;
    const y = Number(d.slice(0, 4));
    const m = Number(d.slice(5, 7));
    if (!y || !m) return null;
    return { year: y, monthKey: `${y}-${m}` };
  }, [form.매도일, initial?.매도일]);

  const onPickStock = (s: JournalStockMaster) => {
    const minYmd = parseListingDateToYmd(s.상장일);
    const cap = todayYmd();
    setForm((prev) => {
      const baseSell = prev.매도일 || cap;
      const 매도일 = clampYmd(baseSell, minYmd, cap);
      return {
        ...prev,
        종목명: s.종목명,
        종목코드: s.종목코드,
        확정공모가: s.확정공모가,
        상장일: s.상장일,
        매도일,
        수수료: prev.수수료 || DEFAULT_COMMISSION,
      };
    });
    setPickerOpen(false);
  };

  const onClearStock = () => {
    if (mode === 'edit') return;
    setForm(EMPTY);
  };

  const handleSave = () => {
    if (!canSave) return;
    const built = tryBuildBody(form);
    if (!built.ok) {
      Alert.alert('입력 확인', built.message);
      return;
    }
    const body: JournalRecordWriteBody = {
      ...built.body,
      손익금: livePnl.손익금 ?? 0,
      수익률: livePnl.수익률 ?? 0,
    };
    const onDone = () => {
      onClose();
      if (groupingYearMonth) {
        onSaved?.(groupingYearMonth);
      }
      showToast(mode === 'create' ? '저장되었습니다' : '수정되었습니다');
    };
    const onFail = (e: unknown) => {
      // axios error 형태를 강하게 가정하지 않고, 최대한 메시지를 뽑아낸다.
      const anyErr = e as any;
      const status = anyErr?.response?.status;
      const message =
        anyErr?.response?.data?.message ??
        anyErr?.message ??
        '요청에 실패했습니다. 잠시 후 다시 시도해주세요.';
      Alert.alert(
        '저장 실패',
        status ? `(${status}) ${String(message)}` : String(message),
      );
    };
    if (mode === 'create') {
      createMut.mutate(body, { onSuccess: onDone, onError: onFail });
    } else if (initial) {
      updateMut.mutate(
        { id: initial.id, body },
        { onSuccess: onDone, onError: onFail },
      );
    }
  };

  const handleDelete = () => {
    if (mode !== 'edit' || !initial) return;
    Alert.alert('기록 삭제', `${initial.종목명} 기록을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteMut.mutate(initial.id, {
            onSuccess: () => {
              onClose();
              if (groupingYearMonth) {
                onSaved?.(groupingYearMonth);
              }
              showToast('삭제되었습니다');
            },
            onError: (e: unknown) => {
              const anyErr = e as any;
              const status = anyErr?.response?.status;
              const message =
                anyErr?.response?.data?.message ??
                anyErr?.message ??
                '요청에 실패했습니다. 잠시 후 다시 시도해주세요.';
              Alert.alert(
                '삭제 실패',
                status ? `(${status}) ${String(message)}` : String(message),
              );
            },
          });
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={onClose}
          />
          <View className="rounded-t-[20px] bg-white pb-6 pt-3 dark:bg-gray-900 max-h-[92%]">
            <View className="self-center mb-2 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 20,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* 헤더: 종목 선택 / 고정 */}
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {sheetTitle}
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <Text className="text-xl text-gray-400">✕</Text>
                </TouchableOpacity>
              </View>

              <View className="mt-1 mb-4">
                <View className="flex-row items-center justify-between">
                  {mode === 'create' && !lockStock ? (
                    <TouchableOpacity
                      onPress={() => setPickerOpen(true)}
                      activeOpacity={0.8}
                      className="flex-row items-center gap-2 flex-1"
                    >
                      <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                        {form.종목명 || '종목 선택'}
                      </Text>
                      <Text className="text-gray-500 text-3xl">▾</Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-row items-center gap-3 flex-1">
                      <Text
                        className="text-2xl font-bold text-gray-900 dark:text-white shrink"
                        numberOfLines={1}
                      >
                        {form.종목명}
                      </Text>
                    </View>
                  )}
                  {mode === 'create' && !lockStock && stockSelected && (
                    <TouchableOpacity onPress={onClearStock} hitSlop={10}>
                      <Text className="text-xs text-gray-500">초기화</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 확정공모가 / 상장일: 종목명 바로 아래 */}
                {form.확정공모가 != null && (
                  <View className="flex-row items-center gap-3 mt-0.5">
                    {!!form.상장일 && (
                      <Text className="text-sm text-gray-700 dark:text-gray-300">
                        상장일{' '}
                        <Text className="font-semibold">{form.상장일}</Text>
                      </Text>
                    )}
                    <Text className="text-sm text-gray-700 dark:text-gray-300">
                      확정공모가{' '}
                      <Text className="font-semibold">
                        {formatKrwUnsigned(form.확정공모가)}
                      </Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* 폼 필드 */}
              <View
                style={{ opacity: fieldOpacity }}
                pointerEvents={disabled ? 'none' : 'auto'}
              >
                <Field label="수량 (주)">
                  <TextInput
                    value={form.수량}
                    onChangeText={(v) =>
                      setForm({ ...form, 수량: v.replace(/[^0-9]/g, '') })
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                    className={fieldClass}
                  />
                </Field>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field label="매도가 (원)">
                      <TextInput
                        value={form.매도가}
                        onChangeText={(v) =>
                          setForm({
                            ...form,
                            매도가: v.replace(/[^0-9.]/g, ''),
                          })
                        }
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor="#9ca3af"
                        className={fieldClass}
                      />
                    </Field>
                  </View>
                  <View className="flex-1">
                    <Field label="매도일">
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setSellDatePickerOpen(true)}
                      >
                        <View pointerEvents="none">
                          <TextInput
                            value={form.매도일}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#9ca3af"
                            className={fieldClass}
                            editable={false}
                          />
                        </View>
                      </TouchableOpacity>
                    </Field>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field label="수수료 (원)">
                      <TextInput
                        value={form.수수료}
                        onChangeText={(v) =>
                          setForm({ ...form, 수수료: v.replace(/[^0-9]/g, '') })
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        className={fieldClass}
                      />
                    </Field>
                  </View>
                  <View className="flex-1">
                    <Field label="제세금 (원)">
                      <TextInput
                        value={form.제세금}
                        onChangeText={(v) =>
                          setForm({ ...form, 제세금: v.replace(/[^0-9]/g, '') })
                        }
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor="#9ca3af"
                        className={fieldClass}
                      />
                    </Field>
                  </View>
                </View>

                <View className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    예상 손익
                  </Text>
                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                        손익금
                      </Text>
                      <Text
                        className="text-base font-bold"
                        style={{ color: pnlColor(livePnl.손익금) }}
                      >
                        {livePnl.손익금 != null
                          ? formatKrw(livePnl.손익금)
                          : '—'}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                        수익률
                      </Text>
                      <Text
                        className="text-base font-bold"
                        style={{ color: pnlColor(livePnl.손익금) }}
                      >
                        {livePnl.수익률 != null
                          ? formatPct(livePnl.수익률)
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                <Field label="메모">
                  <TextInput
                    value={form.메모}
                    onChangeText={(v) => setForm({ ...form, 메모: v })}
                    placeholder="메모를 입력하세요"
                    placeholderTextColor="#9ca3af"
                    className={fieldClass}
                  />
                </Field>
              </View>

              {/* 버튼 */}
              <View className="flex-row gap-2 mt-5">
                {mode === 'edit' && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    activeOpacity={0.85}
                    disabled={deleteMut.isPending}
                    className="flex-1 items-center justify-center rounded-xl border border-red-300 dark:border-red-700 py-3.5"
                  >
                    <Text className="text-base font-bold text-red-600 dark:text-red-400">
                      {deleteMut.isPending ? '삭제 중…' : '삭제'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSave}
                  activeOpacity={0.85}
                  disabled={!canSave}
                  className={`flex-1 items-center justify-center rounded-xl py-3.5 ${
                    canSave
                      ? 'bg-gray-900 dark:bg-white'
                      : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <Text
                    className={`text-base font-bold ${
                      canSave
                        ? 'text-white dark:text-gray-900'
                        : 'text-gray-100 dark:text-gray-400'
                    }`}
                  >
                    {saving ? '저장 중…' : '저장'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      <StockPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickStock}
      />

      <SellDatePickerModal
        visible={sellDatePickerOpen}
        initialYmd={form.매도일 || todayYmd()}
        minYmd={parseListingDateToYmd(form.상장일)}
        onClose={() => setSellDatePickerOpen(false)}
        onConfirm={(ymd) => setForm((prev) => ({ ...prev, 매도일: ymd }))}
      />
    </Modal>
  );
}

const fieldClass =
  'rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
        {label}
      </Text>
      {children}
    </View>
  );
}
