import WheelPicker from '@quidone/react-native-wheel-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { todayYmd } from '../utils/journal-ui.utils';

type Props = {
  visible: boolean;
  initialYmd?: string; // "YYYY-MM-DD"
  minYmd: string;
  onClose: () => void;
  onConfirm: (ymd: string) => void;
};

type Ymd = { y: number; m: number; d: number };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate(); // m: 1~12
}

function cmp(a: Ymd, b: Ymd): number {
  if (a.y !== b.y) return a.y - b.y;
  if (a.m !== b.m) return a.m - b.m;
  return a.d - b.d;
}

function parseYmdStrict(ymd: string | undefined): Ymd | null {
  if (!ymd || ymd.length < 10) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  if (!y || !m || !d) return null;
  return { y, m, d };
}

/** initialYmd 비어 있거나 깨지면 fallback 사용 */
function parseYmd(ymd: string | undefined, fallback: Ymd): Ymd {
  return parseYmdStrict(ymd) ?? fallback;
}

function clampBetween(x: Ymd, lo: Ymd, hi: Ymd): Ymd {
  if (cmp(x, lo) < 0) return lo;
  if (cmp(x, hi) > 0) return hi;
  return x;
}

export function SellDatePickerModal({
  visible,
  initialYmd,
  minYmd,
  onClose,
  onConfirm,
}: Props) {
  const max = useMemo(() => {
    const t = todayYmd();
    return parseYmdStrict(t) ?? { y: 2000, m: 1, d: 1 };
  }, []);

  const lowerParsed = useMemo(
    () => parseYmdStrict(minYmd),
    [minYmd],
  );
  /** 오늘을 넘는 비정상 값이면 오늘로 자름 */
  const lowerBound = useMemo(() => {
    if (!lowerParsed) return null;
    if (cmp(lowerParsed, max) > 0) return max;
    return lowerParsed;
  }, [lowerParsed, max]);

  const [year, setYear] = useState(max.y);
  const [month, setMonth] = useState(max.m);
  const [day, setDay] = useState(max.d);

  // 모달 열릴 때 [하한, 오늘]으로 clamp
  useEffect(() => {
    if (!visible) return;
    const lo = lowerBound ?? { y: 2000, m: 1, d: 1 };
    const raw = parseYmd(initialYmd, max);
    const clamped = clampBetween(raw, lo, max);
    setYear(clamped.y);
    setMonth(clamped.m);
    setDay(clamped.d);
  }, [visible, initialYmd, lowerBound, max]);

  const years = useMemo(() => {
    const start = lowerBound ? lowerBound.y : 2000;
    const end = max.y;
    const arr: Array<{ label: string; value: number }> = [];
    for (let y = end; y >= start; y--) {
      arr.push({ label: `${y}년`, value: y });
    }
    return arr;
  }, [max.y, lowerBound]);

  const months = useMemo(() => {
    const mStart = lowerBound && year === lowerBound.y ? lowerBound.m : 1;
    const mEnd = year === max.y ? max.m : 12;
    const start = Math.min(mStart, mEnd);
    const end = Math.max(mStart, mEnd);
    return Array.from({ length: end - start + 1 }, (_, i) => ({
      label: `${start + i}월`,
      value: start + i,
    }));
  }, [year, lowerBound, max.y, max.m]);

  const dim = daysInMonth(year, month);
  const selectableMinDay =
    lowerBound && year === lowerBound.y && month === lowerBound.m
      ? lowerBound.d
      : 1;
  const selectableMaxDay =
    year === max.y && month === max.m ? Math.min(dim, max.d) : dim;
  const dLow = Math.min(selectableMinDay, selectableMaxDay);
  const dHigh = Math.max(selectableMinDay, selectableMaxDay);

  const days = useMemo(
    () =>
      Array.from({ length: dHigh - dLow + 1 }, (_, i) => ({
        label: `${dLow + i}일`,
        value: dLow + i,
      })),
    [dLow, dHigh],
  );

  useEffect(() => {
    const mStart = lowerBound && year === lowerBound.y ? lowerBound.m : 1;
    const mEnd = year === max.y ? max.m : 12;
    if (month < mStart) setMonth(mStart);
    else if (month > mEnd) setMonth(mEnd);
  }, [year, month, lowerBound, max.y, max.m]);

  useEffect(() => {
    if (day < dLow) setDay(dLow);
    else if (day > dHigh) setDay(dHigh);
  }, [year, month, day, dLow, dHigh]);

  const ymd = `${year}-${pad2(month)}-${pad2(day)}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="rounded-t-[20px] bg-white pb-6 pt-3 dark:bg-gray-900 h-[40%]">
          <View className="self-center mb-2 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />

          <View className="px-5">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-900 dark:text-white">
                매도일 선택
              </Text>
            </View>

            <View
              className="flex-row items-center justify-center"
              style={{ height: 170 }}
            >
              <WheelPicker
                data={years}
                value={year}
                onValueChanged={({ item: { value } }) => setYear(value)}
                itemHeight={40}
                width={110}
                itemTextStyle={{ fontSize: 18, fontWeight: '700' }}
              />
              <WheelPicker
                data={months}
                value={month}
                onValueChanged={({ item: { value } }) => setMonth(value)}
                itemHeight={40}
                width={90}
                itemTextStyle={{ fontSize: 18, fontWeight: '700' }}
              />
              <WheelPicker
                data={days}
                value={day}
                onValueChanged={({ item: { value } }) => setDay(value)}
                itemHeight={40}
                width={90}
                itemTextStyle={{ fontSize: 18, fontWeight: '700' }}
              />
            </View>

            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.85}
                className="flex-1 items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 py-3"
              >
                <Text className="text-base font-bold text-gray-800 dark:text-gray-200">
                  취소
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onConfirm(ymd);
                  onClose();
                }}
                activeOpacity={0.85}
                className="flex-1 items-center justify-center rounded-xl bg-gray-900 dark:bg-white py-3"
              >
                <Text className="text-base font-bold text-white dark:text-gray-900">
                  확인
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
