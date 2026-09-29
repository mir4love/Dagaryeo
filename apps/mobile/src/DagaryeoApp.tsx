import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, piiLabels, radius, spacing} from '@dagaryeo/ui';
import {canShare, transition} from '@dagaryeo/workflow';
import type {Finding, NormalizedRect} from '@dagaryeo/pii-core';
import {DocumentCanvas} from './components/DocumentCanvas';
import {
  analyzeImage,
  pickImage,
  redactAndVerify,
  removeTemporaryFile,
  saveVerifiedImages,
  shareVerifiedImage,
  validateImage,
} from './services/imagePipeline';
import type {MobileJob, Redaction} from './types';

type Screen = 'home' | 'import' | 'analysis' | 'review' | 'result';

const initialJob: MobileJob = {
  state: 'imported',
  findings: [],
  manualRedactions: [],
  verificationPassed: false,
};

export function DagaryeoApp() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('home');
  const [job, setJob] = useState(initialJob);
  const [manualMode, setManualMode] = useState(false);
  const [saveOriginal, setSaveOriginal] = useState(false);

  const reset = useCallback(async () => {
    await removeTemporaryFile(job.outputUri).catch(() => undefined);
    setJob(initialJob);
    setScreen('home');
    setManualMode(false);
    setSaveOriginal(false);
  }, [job.outputUri]);

  const importPhoto = async (source: 'camera' | 'library') => {
    try {
      const selectedImage = await pickImage(source);
      if (!selectedImage) return;
      const image = await validateImage(selectedImage);
      setJob({...initialJob, image});
      setScreen('import');
    } catch (error) {
      Alert.alert('사진을 가져오지 못했습니다', error instanceof Error ? error.message : '다시 시도해 주세요.');
    }
  };

  const startAnalysis = async () => {
    if (!job.image) return;
    setScreen('analysis');
    setJob(current => ({...current, state: transition(current.state, 'analyzing'), error: undefined}));
    try {
      const findings = await analyzeImage(job.image);
      setJob(current => ({...current, state: transition(current.state, 'review-pending'), findings}));
    } catch {
      setJob(current => ({
        ...current,
        state: 'review-pending',
        findings: [],
        error: '자동 분석을 완료하지 못했습니다. 수동으로 영역을 지정해 주세요.',
      }));
    }
    setScreen('review');
  };

  const toggleFinding = (id: string) => setJob(current => ({
    ...current,
    findings: current.findings.map(finding =>
      finding.id === id ? {...finding, selected: !finding.selected} : finding),
  }));

  const addManualRegion = useCallback((rect: NormalizedRect) => {
    const redaction: Redaction = {
      id: `manual-${Date.now()}`,
      rect,
      selected: true,
      origin: 'manual',
    };
    setJob(current => ({...current, manualRedactions: [...current.manualRedactions, redaction]}));
  }, []);

  const selectedRegions = useMemo(() => [
    ...job.findings.filter(finding => finding.selected).map(finding => finding.rect),
    ...job.manualRedactions.filter(redaction => redaction.selected).map(redaction => redaction.rect),
  ], [job.findings, job.manualRedactions]);

  const exportImage = async () => {
    if (!job.image || selectedRegions.length === 0) {
      Alert.alert('영역을 확인해 주세요', '자동 후보를 선택하거나 수동 영역을 한 개 이상 지정해 주세요.');
      return;
    }
    setScreen('result');
    setJob(current => ({...current, state: 'exporting', verificationPassed: false, error: undefined}));
    try {
      const outputUri = await redactAndVerify(job.image, selectedRegions);
      setJob(current => ({...current, state: 'verified', outputUri, verificationPassed: true}));
    } catch (error) {
      setJob(current => ({
        ...current,
        state: 'failed',
        verificationPassed: false,
        error: error instanceof Error ? error.message : '출력 검증에 실패했습니다.',
      }));
    }
  };

  const share = async () => {
    if (!job.outputUri || !canShare(job.state, job.verificationPassed)) return;
    await shareVerifiedImage(job.outputUri);
  };

  const saveToPhotos = async () => {
    if (!job.outputUri || !job.image || !canShare(job.state, job.verificationPassed)) return;
    try {
      const saved = await saveVerifiedImages({
        outputUri: job.outputUri,
        original: job.image,
        includeOriginal: saveOriginal,
      });
      setJob(current => ({
        ...current,
        savedToPhotos: true,
        savedOriginal: Boolean(saved.originalUri),
      }));
    } catch (error) {
      Alert.alert(
        '사진을 저장하지 못했습니다',
        error instanceof Error ? error.message : '다시 시도해 주세요.',
      );
    }
  };

  return (
    <View style={[styles.app, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>
      {screen === 'home' ? <HomeScreen onPick={importPhoto} /> : null}
      {screen === 'import' && job.image ? (
        <ImportScreen image={job.image} onBack={reset} onStart={startAnalysis} />
      ) : null}
      {screen === 'analysis' ? <AnalysisScreen onCancel={reset} /> : null}
      {screen === 'review' && job.image ? (
        <ReviewScreen
          image={job.image}
          findings={job.findings}
          selectedRegions={selectedRegions}
          warning={job.error}
          manualMode={manualMode}
          onManualMode={() => setManualMode(value => !value)}
          onManualRegion={addManualRegion}
          onToggle={toggleFinding}
          onApply={exportImage}
          onBack={reset}
        />
      ) : null}
      {screen === 'result' ? (
        <ResultScreen
          state={job.state}
          count={selectedRegions.length}
          error={job.error}
          outputUri={job.outputUri}
          savedToPhotos={job.savedToPhotos}
          savedOriginal={job.savedOriginal}
          saveOriginal={saveOriginal}
          shareEnabled={canShare(job.state, job.verificationPassed)}
          onSave={saveToPhotos}
          onToggleSaveOriginal={() => setSaveOriginal(value => !value)}
          onShare={share}
          onDone={reset}
        />
      ) : null}
    </View>
  );
}

function HomeScreen({onPick}: {onPick: (source: 'camera' | 'library') => void}) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.brandRow}><Text style={styles.logo}>◀▶</Text><Text style={styles.brand}>다가려</Text></View>
      <View style={styles.privacyBanner}>
        <Text style={styles.bannerTitle}>파일은 기기에서 처리합니다</Text>
        <Text style={styles.body}>업로드 없이 이 기기에서 안전하게 분석합니다.</Text>
      </View>
      <ActionCard icon="▣" title="사진 촬영" subtitle="문서를 촬영하여 개인정보 후보를 찾습니다." onPress={() => onPick('camera')} />
      <ActionCard icon="▧" title="사진 선택" subtitle="앨범에서 이미지를 선택합니다." onPress={() => onPick('library')} />
      <ActionCard icon="PDF" title="PDF 선택" subtitle="PDF 안전 내보내기는 검증 중입니다." disabled />
      <Text style={styles.sectionTitle}>최근 작업</Text>
      <View style={styles.emptyCard}><Text style={styles.body}>민감한 내용은 기본적으로 기록하지 않습니다.</Text></View>
    </ScrollView>
  );
}

function ImportScreen({image, onBack, onStart}: {
  image: NonNullable<MobileJob['image']>;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <View style={styles.screen}>
      <Header title="파일 확인" onBack={onBack} />
      <View style={styles.previewCard}>
        <Image source={{uri: image.uri}} style={styles.importThumbnail} resizeMode="contain" accessibilityLabel="선택한 원본 사진 미리보기" />
        <Text style={styles.fileIcon}>원본 사진</Text>
        <Text numberOfLines={1} style={styles.cardTitle}>{image.fileName}</Text>
        <Text style={styles.body}>{image.width} × {image.height}px</Text>
        <Text style={styles.body}>{image.fileSize ? `${Math.round(image.fileSize / 1024)}KB` : '크기 확인 완료'}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>분석 범위</Text><Text style={styles.value}>전체 이미지</Text>
      </View>
      <Text style={styles.notice}>원본은 변경하지 않으며 OCR 결과가 없더라도 사진 전체를 직접 확인해야 합니다.</Text>
      <PrimaryButton label="개인정보 찾기" onPress={onStart} />
    </View>
  );
}

function AnalysisScreen({onCancel}: {onCancel: () => void}) {
  return (
    <View style={[styles.screen, styles.center]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.title}>기기에서 분석 중</Text>
      <Text style={[styles.body, styles.centerText]}>사진은 밖으로 전송되지 않습니다.{`\n`}한국어 문자를 읽고 후보 영역을 확인합니다.</Text>
      <Pressable accessibilityRole="button" onPress={onCancel}><Text style={styles.link}>취소하고 임시 데이터 정리</Text></Pressable>
    </View>
  );
}

function ReviewScreen({
  image,
  findings,
  selectedRegions,
  warning,
  manualMode,
  onManualMode,
  onManualRegion,
  onToggle,
  onApply,
  onBack,
}: {
  image: NonNullable<MobileJob['image']>;
  findings: Finding[];
  selectedRegions: NormalizedRect[];
  warning?: string;
  manualMode: boolean;
  onManualMode: () => void;
  onManualRegion: (rect: NormalizedRect) => void;
  onToggle: (id: string) => void;
  onApply: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.reviewScreen}>
      <Header title="개인정보 검토" onBack={onBack} />
      <View style={styles.canvasWrap}>
        <DocumentCanvas image={image} regions={selectedRegions} manualMode={manualMode} onManualRegion={onManualRegion} />
      </View>
      <View style={styles.reviewPanel}>
        <Text style={styles.sectionTitle}>탐지된 개인정보 후보</Text>
        <Text style={styles.notice}>{warning ?? (findings.length === 0 ? '자동으로 찾은 항목이 없습니다. 문서를 직접 확인해 주세요.' : '누락될 수 있으니 이미지 전체를 직접 확인해 주세요.')}</Text>
        <ScrollView style={styles.findings}>
          {findings.map(finding => (
            <Pressable key={finding.id} style={styles.findingRow} onPress={() => onToggle(finding.id)} accessibilityRole="checkbox" accessibilityState={{checked: finding.selected}}>
              <View style={[styles.checkbox, finding.selected && styles.checkboxSelected]}><Text style={styles.check}>{finding.selected ? '✓' : ''}</Text></View>
              <View style={styles.flex}><Text style={styles.cardTitle}>{piiLabels[finding.kind]}</Text><Text style={styles.body}>{Math.round(finding.confidence * 100)}% 후보</Text></View>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={[styles.manualButton, manualMode && styles.manualButtonActive]} onPress={onManualMode} accessibilityRole="button">
          <Text style={styles.manualButtonText}>{manualMode ? '사진에서 영역을 드래그하세요' : '수동 영역 지정'}</Text>
        </Pressable>
        <PrimaryButton label={`${selectedRegions.length}개 영역 마스킹 적용`} onPress={onApply} />
      </View>
    </View>
  );
}

function ResultScreen({
  state,
  count,
  error,
  outputUri,
  savedToPhotos,
  savedOriginal,
  saveOriginal,
  shareEnabled,
  onSave,
  onToggleSaveOriginal,
  onShare,
  onDone,
}: {
  state: MobileJob['state'];
  count: number;
  error?: string;
  outputUri?: string;
  savedToPhotos?: boolean;
  savedOriginal?: boolean;
  saveOriginal: boolean;
  shareEnabled: boolean;
  onSave: () => void;
  onToggleSaveOriginal: () => void;
  onShare: () => void;
  onDone: () => void;
}) {
  const exporting = state === 'exporting';
  return (
    <ScrollView
      style={styles.resultScroll}
      contentContainerStyle={[styles.screen, styles.resultScreenContent]}
      showsVerticalScrollIndicator>
      <Header title="처리 결과" onBack={onDone} />
      <View style={[styles.resultCard, error && styles.errorCard]}>
        {outputUri && !error ? <Image source={{uri: outputUri}} style={styles.resultThumbnail} resizeMode="contain" accessibilityLabel="마스킹된 결과 사진 미리보기" /> : null}
        {exporting ? <ActivityIndicator size="large" color={colors.primary} /> : <Text style={styles.resultIcon}>{error ? '!' : '✓'}</Text>}
        <Text style={styles.title}>{exporting ? '새 사본을 만드는 중' : error ? '출력 검증 실패' : '검증 완료'}</Text>
        <Text style={[styles.body, styles.centerText]}>{exporting ? '선택 영역을 새 픽셀 버퍼에 적용하고 다시 확인합니다.' : error ?? '선택한 영역이 새 이미지에 적용되었습니다.'}</Text>
      </View>
      <View style={styles.infoCard}><Text style={styles.cardTitle}>{count}개 영역 마스킹</Text><Text style={styles.body}>원본 파일은 그대로 유지됩니다.</Text></View>
      {Platform.OS === 'android' && shareEnabled ? (
        <Pressable
          onPress={onToggleSaveOriginal}
          style={styles.saveOption}
          accessibilityRole="checkbox"
          accessibilityState={{checked: saveOriginal}}>
          <View style={[styles.checkbox, saveOriginal && styles.checkboxSelected]}><Text style={styles.check}>{saveOriginal ? '✓' : ''}</Text></View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>원본도 함께 저장</Text>
            <Text style={styles.warningText}>원본에는 가려지지 않은 개인정보가 포함될 수 있습니다.</Text>
          </View>
        </Pressable>
      ) : null}
      {savedToPhotos ? (
        <Text style={styles.savedNotice}>사진 앱의 Dagaryeo 앨범에 마스킹 사진{savedOriginal ? '과 원본' : ''}을 저장했습니다.</Text>
      ) : null}
      <View style={styles.spacer} />
      {Platform.OS === 'android' ? <PrimaryButton label={savedToPhotos ? '사진에 저장됨' : '사진에 저장'} onPress={onSave} disabled={!shareEnabled || savedToPhotos} /> : null}
      <PrimaryButton label="공유" onPress={onShare} disabled={!shareEnabled} />
      <Pressable onPress={onDone} style={styles.secondaryButton}><Text style={styles.secondaryText}>완료</Text></Pressable>
    </ScrollView>
  );
}

function Header({title, onBack}: {title: string; onBack: () => void}) {
  return <View style={styles.header}><Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.headerTitle}>{title}</Text><View style={styles.headerGap} /></View>;
}

function ActionCard({icon, title, subtitle, onPress, disabled}: {icon: string; title: string; subtitle: string; onPress?: () => void; disabled?: boolean}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.actionCard, disabled && styles.disabled]} accessibilityRole="button">
      <View style={[styles.actionIcon, title.includes('PDF') && styles.pdfIcon]}><Text style={styles.iconText}>{icon}</Text></View>
      <View style={styles.flex}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.body}>{subtitle}</Text></View><Text style={styles.chevron}>{disabled ? '준비 중' : '›'}</Text>
    </Pressable>
  );
}

function PrimaryButton({label, onPress, disabled}: {label: string; onPress: () => void; disabled?: boolean}) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.disabled]} accessibilityRole="button"><Text style={styles.primaryText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  app: {flex: 1, backgroundColor: colors.background},
  screen: {flexGrow: 1, padding: spacing.lg, gap: spacing.md},
  resultScroll: {flex: 1},
  resultScreenContent: {paddingBottom: spacing.xl * 2},
  reviewScreen: {flex: 1, paddingHorizontal: spacing.md},
  center: {justifyContent: 'center', alignItems: 'center'},
  centerText: {textAlign: 'center'},
  flex: {flex: 1},
  spacer: {flex: 1},
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: spacing.md},
  logo: {fontSize: 24, color: colors.primary, fontWeight: '900'},
  brand: {fontSize: 27, fontWeight: '800', color: colors.navy},
  privacyBanner: {backgroundColor: colors.surfaceBlue, borderRadius: radius.md, padding: spacing.md},
  bannerTitle: {fontSize: 16, fontWeight: '700', color: colors.primaryDark, marginBottom: 4},
  title: {fontSize: 24, fontWeight: '800', color: colors.navy, marginTop: spacing.md},
  sectionTitle: {fontSize: 17, fontWeight: '800', color: colors.navy, marginTop: spacing.sm},
  cardTitle: {fontSize: 16, fontWeight: '700', color: colors.navy},
  body: {fontSize: 13, lineHeight: 19, color: colors.muted},
  value: {fontSize: 18, fontWeight: '800', color: colors.navy, marginTop: 4},
  notice: {fontSize: 12, lineHeight: 17, color: colors.muted},
  link: {color: colors.primaryDark, fontWeight: '700', padding: spacing.lg},
  actionCard: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 86, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md},
  actionIcon: {width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMint},
  pdfIcon: {backgroundColor: '#FFF0ED'},
  iconText: {fontWeight: '800', color: colors.primaryDark},
  chevron: {fontSize: 16, color: colors.muted},
  emptyCard: {padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface},
  header: {height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  back: {fontSize: 38, color: colors.navy, width: 40},
  headerTitle: {fontSize: 18, fontWeight: '800', color: colors.navy},
  headerGap: {width: 40},
  previewCard: {alignItems: 'center', padding: spacing.xl, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface},
  importThumbnail: {width: '100%', height: 210, borderRadius: radius.md, backgroundColor: colors.surfaceBlue},
  fileIcon: {color: colors.coral, fontWeight: '900', fontSize: 20},
  infoCard: {padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface},
  primaryButton: {minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary},
  primaryText: {color: '#FFFFFF', fontSize: 16, fontWeight: '800'},
  secondaryButton: {minHeight: 50, alignItems: 'center', justifyContent: 'center'},
  secondaryText: {color: colors.primaryDark, fontWeight: '800'},
  disabled: {opacity: 0.45},
  canvasWrap: {flex: 1, minHeight: 260},
  reviewPanel: {maxHeight: '48%', paddingVertical: spacing.sm, gap: spacing.sm},
  findings: {maxHeight: 150},
  findingRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border},
  checkbox: {width: 25, height: 25, borderRadius: 7, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center'},
  checkboxSelected: {backgroundColor: colors.primary, borderColor: colors.primary},
  check: {color: '#FFFFFF', fontWeight: '900'},
  manualButton: {padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md},
  manualButtonActive: {backgroundColor: colors.surfaceMint},
  manualButtonText: {color: colors.primaryDark, fontWeight: '800'},
  resultCard: {alignItems: 'center', padding: spacing.xl, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface},
  resultThumbnail: {width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.surfaceBlue},
  errorCard: {borderWidth: 1, borderColor: colors.danger},
  resultIcon: {width: 64, height: 64, borderRadius: 32, textAlign: 'center', lineHeight: 64, backgroundColor: colors.surfaceMint, color: colors.success, fontSize: 34, fontWeight: '900'},
  saveOption: {flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface},
  warningText: {fontSize: 12, lineHeight: 17, color: colors.danger, marginTop: 3},
  savedNotice: {fontSize: 13, lineHeight: 19, color: colors.success, textAlign: 'center', fontWeight: '700'},
});
