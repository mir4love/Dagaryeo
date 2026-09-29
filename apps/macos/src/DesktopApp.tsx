import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing} from '@dagaryeo/ui';

type Page = 'dashboard' | 'files' | 'review' | 'export';

export function DesktopApp() {
  const [page, setPage] = useState<Page>('dashboard');
  return (
    <View style={styles.app}>
      <View style={styles.sidebar}>
        <Text style={styles.brand}>◀▶ 다가려</Text>
        <Nav label="대시보드" active={page === 'dashboard'} onPress={() => setPage('dashboard')} />
        <Nav label="파일 목록" active={page === 'files'} onPress={() => setPage('files')} />
        <Nav label="검토" active={page === 'review'} onPress={() => setPage('review')} />
        <Nav label="내보내기" active={page === 'export'} onPress={() => setPage('export')} />
        <View style={styles.flex} />
        <Text style={styles.disabledText}>폴더 검사 Pro 준비 중</Text>
      </View>
      <View style={styles.main}>{page === 'dashboard' ? <Dashboard /> : page === 'files' ? <Files /> : page === 'review' ? <Review /> : <Export />}</View>
    </View>
  );
}

const Dashboard = () => <View style={styles.page}><Text style={styles.title}>안녕하세요.</Text><Text style={styles.body}>파일을 추가하거나 검토할 작업을 확인하세요.</Text><View style={styles.row}><Card title="검토 대기" value="0" /><Card title="처리 완료" value="0" /></View><View style={styles.empty}><Text style={styles.cardTitle}>최근 파일이 없습니다</Text><Text style={styles.body}>데스크톱 파일 어댑터 연결 전에는 가져오기 기능을 활성화하지 않습니다.</Text></View></View>;
const Files = () => <View style={styles.page}><Text style={styles.title}>파일 목록</Text><Text style={styles.body}>후보 수와 검토 상태, 출력 검증 상태를 분리해 표시합니다.</Text><View style={styles.table}><Text style={styles.tableHead}>파일 이름             종류      후보      상태</Text><Text style={styles.emptyText}>추가된 파일이 없습니다.</Text></View></View>;
const Review = () => <View style={styles.page}><Text style={styles.title}>검토 작업공간</Text><View style={styles.workspace}><View style={styles.pane}><Text style={styles.cardTitle}>파일과 페이지</Text></View><View style={[styles.pane, styles.preview]}><Text style={styles.body}>검토할 파일을 선택하세요.</Text></View><View style={styles.pane}><Text style={styles.cardTitle}>탐지 결과</Text><Text style={styles.body}>후보 선택과 수동 영역은 파일을 연 뒤 사용할 수 있습니다.</Text></View></View></View>;
const Export = () => <View style={styles.page}><Text style={styles.title}>내보내기</Text><Text style={styles.body}>검토 완료와 출력 검증은 서로 다른 상태입니다.</Text><View style={styles.empty}><Text style={styles.cardTitle}>내보낼 파일이 없습니다</Text><Text style={styles.body}>검토 완료 전에는 저장 버튼을 활성화하지 않습니다. 원본 덮어쓰기는 제공하지 않습니다.</Text></View></View>;

function Nav({label, active, onPress}: {label: string; active: boolean; onPress: () => void}) { return <Pressable onPress={onPress} style={[styles.nav, active && styles.navActive]}><Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text></Pressable>; }
function Card({title, value}: {title: string; value: string}) { return <View style={styles.card}><Text style={styles.body}>{title}</Text><Text style={styles.value}>{value}</Text></View>; }

const styles = StyleSheet.create({
  app: {flex: 1, minWidth: 900, flexDirection: 'row', backgroundColor: colors.background}, sidebar: {width: 210, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface}, main: {flex: 1}, page: {flex: 1, padding: spacing.xl, gap: spacing.md}, flex: {flex: 1}, brand: {fontSize: 21, fontWeight: '800', color: colors.navy, marginBottom: spacing.lg}, nav: {padding: 12, borderRadius: radius.sm}, navActive: {backgroundColor: colors.surfaceMint}, navText: {color: colors.muted, fontWeight: '700'}, navTextActive: {color: colors.primaryDark}, disabledText: {fontSize: 12, color: colors.muted}, title: {fontSize: 28, fontWeight: '800', color: colors.navy}, body: {fontSize: 14, color: colors.muted, lineHeight: 20}, row: {flexDirection: 'row', gap: spacing.md}, card: {minWidth: 180, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md}, cardTitle: {fontSize: 16, fontWeight: '800', color: colors.navy}, value: {fontSize: 30, fontWeight: '800', color: colors.navy}, empty: {padding: spacing.xl, gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface}, table: {padding: spacing.lg, minHeight: 220, borderRadius: radius.md, backgroundColor: colors.surface}, tableHead: {fontWeight: '800', color: colors.navy}, emptyText: {marginTop: 70, textAlign: 'center', color: colors.muted}, workspace: {flex: 1, flexDirection: 'row', gap: spacing.md}, pane: {width: 230, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface}, preview: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
