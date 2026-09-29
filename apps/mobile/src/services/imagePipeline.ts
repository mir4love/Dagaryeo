import TextRecognition, {
  TextRecognitionScript,
} from '@react-native-ml-kit/text-recognition';
import {
  AlphaType,
  ColorType,
  ImageFormat,
  Skia,
} from '@shopify/react-native-skia';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
} from 'react-native-image-picker';
import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {
  detectFindings,
  normalizedToPixel,
  type Finding,
  type NormalizedRect,
  type OcrLine,
} from '@dagaryeo/pii-core';
import type {LocalImage} from '../types';

function toLocalImage(asset: Asset): LocalImage {
  if (!asset.uri || !asset.width || !asset.height) {
    throw new Error('이미지 파일의 크기와 경로를 확인할 수 없습니다.');
  }
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.type ?? 'image/jpeg',
    width: asset.width,
    height: asset.height,
    ...(asset.fileSize === undefined ? {} : {fileSize: asset.fileSize}),
  };
}

export async function pickImage(source: 'camera' | 'library') {
  const response = source === 'camera'
    ? await launchCamera({mediaType: 'photo', quality: 1, includeExtra: false})
    : await launchImageLibrary({mediaType: 'photo', selectionLimit: 1, quality: 1, includeExtra: false});
  if (response.didCancel) return undefined;
  if (response.errorCode) {
    throw new Error(response.errorMessage ?? '사진을 가져오지 못했습니다.');
  }
  const asset = response.assets?.[0];
  if (!asset) throw new Error('선택한 사진을 읽지 못했습니다.');
  return toLocalImage(asset);
}

export async function validateImage(image: LocalImage): Promise<LocalImage> {
  if (!image.type.startsWith('image/')) {
    throw new Error('지원하는 이미지 파일이 아닙니다.');
  }

  const data = await Skia.Data.fromURI(image.uri);
  const decoded = Skia.Image.MakeImageFromEncoded(data);
  if (!decoded || decoded.width() <= 0 || decoded.height() <= 0) {
    throw new Error('이미지 형식이나 픽셀 크기를 확인할 수 없습니다.');
  }

  return {...image, width: decoded.width(), height: decoded.height()};
}

export async function analyzeImage(image: LocalImage): Promise<Finding[]> {
  const result = await TextRecognition.recognize(
    image.uri,
    TextRecognitionScript.KOREAN,
  );
  const lines: OcrLine[] = [];
  result.blocks.forEach(block => {
    block.lines.forEach(line => {
      if (!line.frame) return;
      lines.push({
        text: line.text,
        frame: {
          x: line.frame.left,
          y: line.frame.top,
          width: line.frame.width,
          height: line.frame.height,
        },
      });
    });
  });
  return detectFindings(lines, image.width, image.height);
}

const withoutFileScheme = (uri: string) => uri.replace(/^file:\/\//, '');

export async function redactAndVerify(
  image: LocalImage,
  regions: NormalizedRect[],
  maskColor = '#072F35',
) {
  if (regions.length === 0) {
    throw new Error('적용할 영역을 한 개 이상 선택해 주세요.');
  }

  const sourceData = await Skia.Data.fromURI(image.uri);
  const sourceImage = Skia.Image.MakeImageFromEncoded(sourceData);
  if (!sourceImage) throw new Error('이미지 픽셀을 디코딩하지 못했습니다.');

  const width = sourceImage.width();
  const height = sourceImage.height();
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('새 이미지 버퍼를 만들지 못했습니다.');
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('#FFFFFF'));
  canvas.drawImage(sourceImage, 0, 0);

  const paint = Skia.Paint();
  paint.setColor(Skia.Color(maskColor));
  paint.setAntiAlias(false);
  const pixelRegions = regions.map(region => normalizedToPixel(region, width, height));
  pixelRegions.forEach(region => {
    canvas.drawRect(Skia.XYWHRect(region.x, region.y, region.width, region.height), paint);
  });
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot.encodeToBase64(ImageFormat.PNG, 100);
  const outputPath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/dagaryeo-${Date.now()}.png`;
  await ReactNativeBlobUtil.fs.writeFile(outputPath, base64, 'base64');

  const reopenedData = await Skia.Data.fromURI(`file://${outputPath}`);
  const reopened = Skia.Image.MakeImageFromEncoded(reopenedData);
  if (!reopened || reopened.width() !== width || reopened.height() !== height) {
    await ReactNativeBlobUtil.fs.unlink(outputPath).catch(() => undefined);
    throw new Error('출력 파일을 다시 확인하지 못했습니다.');
  }

  const pixels = reopened.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Opaque,
  });
  if (!pixels) {
    await ReactNativeBlobUtil.fs.unlink(outputPath).catch(() => undefined);
    throw new Error('출력 픽셀을 검사하지 못했습니다.');
  }

  const expected = [7, 47, 53];
  const allPixelsMasked = pixelRegions.every(region => {
    if (region.width < 1 || region.height < 1) return false;
    const right = Math.min(width, region.x + region.width);
    const bottom = Math.min(height, region.y + region.height);
    for (let y = Math.max(0, region.y); y < bottom; y += 1) {
      for (let x = Math.max(0, region.x); x < right; x += 1) {
        const index = (y * width + x) * 4;
        if (!expected.every((channel, offset) =>
          Math.abs(Number(pixels[index + offset]) - channel) <= 1)) {
          return false;
        }
      }
    }
    return true;
  });
  if (!allPixelsMasked) {
    await ReactNativeBlobUtil.fs.unlink(outputPath).catch(() => undefined);
    throw new Error('선택 영역의 픽셀 마스킹을 확인하지 못했습니다.');
  }

  return `file://${outputPath}`;
}

export async function shareVerifiedImage(uri: string) {
  if (Platform.OS === 'android') {
    const module = NativeModules.VerifiedImageShare;
    if (!module?.share) {
      throw new Error('Android 공유 기능을 불러오지 못했습니다.');
    }
    await module.share(uri);
    return;
  }

  const {default: Share} = await import('react-native-share');
  await Share.open({url: uri, type: 'image/png', failOnCancel: false});
}

async function requestLegacyPhotoWritePermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) >= 29) return;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    {
      title: '사진 저장 권한',
      message: '검증된 사진을 사진 앱에 저장하려면 저장소 권한이 필요합니다.',
      buttonPositive: '허용',
      buttonNegative: '취소',
    },
  );
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('사진 저장 권한이 허용되지 않았습니다.');
  }
}

export async function saveVerifiedImages({
  outputUri,
  original,
  includeOriginal,
}: {
  outputUri: string;
  original: LocalImage;
  includeOriginal: boolean;
}) {
  if (Platform.OS !== 'android') {
    throw new Error('현재 직접 저장은 Android에서 지원합니다.');
  }
  const module = NativeModules.VerifiedImageShare;
  if (!module?.saveToPhotos) {
    throw new Error('Android 사진 저장 기능을 불러오지 못했습니다.');
  }

  await requestLegacyPhotoWritePermission();
  const maskedUri = await module.saveToPhotos(
    outputUri,
    'masked',
    'image/png',
  );
  let originalUri: string | undefined;
  if (includeOriginal) {
    originalUri = await module.saveToPhotos(
      original.uri,
      'original',
      original.type,
    );
  }
  return {maskedUri, originalUri};
}

export async function removeTemporaryFile(uri?: string) {
  if (!uri) return;
  const path = withoutFileScheme(uri);
  if (await ReactNativeBlobUtil.fs.exists(path)) {
    await ReactNativeBlobUtil.fs.unlink(path);
  }
}
