import React, {useMemo, useRef, useState} from 'react';
import {
  Image,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  normalizedToViewRect,
  viewRectToNormalized,
  type NormalizedRect,
} from '@dagaryeo/pii-core';
import {colors} from '@dagaryeo/ui';
import type {LocalImage} from '../types';

type Props = {
  image: LocalImage;
  regions: NormalizedRect[];
  manualMode: boolean;
  onManualRegion: (rect: NormalizedRect) => void;
};

export function DocumentCanvas({image, regions, manualMode, onManualRegion}: Props) {
  const [layout, setLayout] = useState({width: 0, height: 0});
  const [draft, setDraft] = useState<{x: number; y: number; width: number; height: number}>();
  const origin = useRef({x: 0, y: 0});
  const onLayout = (event: LayoutChangeEvent) => setLayout(event.nativeEvent.layout);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => manualMode,
    onMoveShouldSetPanResponder: () => manualMode,
    onPanResponderGrant: event => {
      origin.current = {x: event.nativeEvent.locationX, y: event.nativeEvent.locationY};
      setDraft({...origin.current, width: 1, height: 1});
    },
    onPanResponderMove: event => {
      const x = Math.min(origin.current.x, event.nativeEvent.locationX);
      const y = Math.min(origin.current.y, event.nativeEvent.locationY);
      setDraft({
        x,
        y,
        width: Math.abs(event.nativeEvent.locationX - origin.current.x),
        height: Math.abs(event.nativeEvent.locationY - origin.current.y),
      });
    },
    onPanResponderRelease: () => {
      if (draft && draft.width > 8 && draft.height > 8 && layout.width && layout.height) {
        onManualRegion(viewRectToNormalized(
          draft,
          image.width,
          image.height,
          layout.width,
          layout.height,
        ));
      }
      setDraft(undefined);
    },
    onPanResponderTerminate: () => setDraft(undefined),
  }), [draft, image.height, image.width, layout.height, layout.width, manualMode, onManualRegion]);

  return (
    <View
      accessibilityLabel="문서 미리보기"
      onLayout={onLayout}
      style={styles.canvas}
      {...panResponder.panHandlers}>
      <Image source={{uri: image.uri}} resizeMode="contain" style={StyleSheet.absoluteFill} />
      {layout.width > 0 && regions.map((region, index) => {
        const rect = normalizedToViewRect(
          region,
          image.width,
          image.height,
          layout.width,
          layout.height,
        );
        return <View key={`${index}-${rect.x}`} pointerEvents="none" style={[styles.mask, rect]} />;
      })}
      {draft ? <View pointerEvents="none" style={[styles.draft, draft]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    minHeight: 300,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#E6EEF0',
  },
  mask: {
    position: 'absolute',
    backgroundColor: colors.mask,
  },
  draft: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 169, 183, 0.18)',
  },
});
