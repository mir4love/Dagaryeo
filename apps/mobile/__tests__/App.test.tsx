/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DagaryeoApp} from '../src/DagaryeoApp';

jest.mock('../src/components/DocumentCanvas', () => ({
  DocumentCanvas: () => null,
}));

jest.mock('../src/services/imagePipeline', () => ({
  analyzeImage: jest.fn(),
  pickImage: jest.fn(),
  redactAndVerify: jest.fn(),
  removeTemporaryFile: jest.fn(),
  saveVerifiedImages: jest.fn(),
  shareVerifiedImage: jest.fn(),
  validateImage: jest.fn(),
}));

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider
        initialMetrics={{
          frame: {x: 0, y: 0, width: 390, height: 844},
          insets: {top: 47, right: 0, bottom: 34, left: 0},
        }}>
        <DagaryeoApp />
      </SafeAreaProvider>,
    );
  });

  expect(renderer!.root.findByProps({accessibilityLabel: '다가려 앱 아이콘'})).toBeTruthy();
  expect(renderer!.root.findByProps({children: '사진 속 개인정보를 찾아 확인하고 안전하게 가려주는 앱입니다.'})).toBeTruthy();
});
