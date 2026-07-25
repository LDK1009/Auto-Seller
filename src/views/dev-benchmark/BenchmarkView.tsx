'use client';

//////////////////////////////////////// 누끼 성능 벤치마크 (개발용) ////////////////////////////////////////
// L-1 실측 도구 — R-1(아하 모먼트 성립) 판정용. 네비게이션에 노출하지 않는다.
// 시나리오: GPU+fp16(현행) / CPU+fp16(WebGPU 없는 환경 시뮬) / CPU+quint8(경량 대안)

import { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';

//////////////////// 시나리오 정의 ////////////////////
type BenchScenario = {
  key: string;
  label: string;
  device: 'cpu' | 'gpu';
  model: 'isnet_fp16' | 'isnet_quint8';
};

const SCENARIOS: BenchScenario[] = [
  { key: 'gpu-fp16', label: 'GPU + fp16 (현행 기본)', device: 'gpu', model: 'isnet_fp16' },
  { key: 'cpu-fp16', label: 'CPU + fp16 (WebGPU 없는 환경)', device: 'cpu', model: 'isnet_fp16' },
  { key: 'cpu-quint8', label: 'CPU + quint8 (경량 대안)', device: 'cpu', model: 'isnet_quint8' },
];

// 로컬 샘플 (public/samples — git 미추적, 로컬에만 존재)
const SAMPLE_PATHS = Array.from({ length: 15 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return number === '12' ? `/samples/cosmetic-12.png` : `/samples/cosmetic-${number}.jpg`;
});

type BenchResult = {
  scenarioKey: string;
  count: number;
  coldMs: number; // 첫 장 (모델 로드 포함)
  warmAvgMs: number; // 2장째부터 평균
  totalMs: number;
  perImageMs: number[];
};

//////////////////// 판정 기준 (아하: 10장 일괄) ////////////////////
const PASS_MS = 180_000; // 웜 기준 10장 3분 이하 = 성립
const WARN_MS = 360_000; // 6분 이하 = 경계 (UX 보완 필요)

function judge(result: BenchResult): { label: string; color: 'success' | 'warning' | 'error' } {
  const tenWarm = result.warmAvgMs * 10;
  if (tenWarm <= PASS_MS) return { label: `성립 (10장 ≈ ${Math.round(tenWarm / 1000)}s)`, color: 'success' };
  if (tenWarm <= WARN_MS) return { label: `경계 (10장 ≈ ${Math.round(tenWarm / 1000)}s)`, color: 'warning' };
  return { label: `위험 (10장 ≈ ${Math.round(tenWarm / 60000)}분)`, color: 'error' };
}

export default function BenchmarkView() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState('대기');
  const [runningKey, setRunningKey] = useState<string | null>(null);
  const [results, setResults] = useState<BenchResult[]>([]);

  // SSR-클라이언트 하이드레이션 불일치 방지 — navigator는 마운트 후에만 읽는다
  const [hasWebGpu, setHasWebGpu] = useState<boolean | null>(null);
  useEffect(() => {
    setHasWebGpu('gpu' in navigator);
  }, []);

  ////////// 샘플 로드 (public/samples 로컬 전용)
  const loadSamples = async () => {
    setStatus('샘플 로드 중…');
    const loaded: File[] = [];
    for (const path of SAMPLE_PATHS) {
      try {
        const response = await fetch(path);
        if (!response.ok) continue;
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) continue;
        loaded.push(new File([blob], path.split('/').pop() as string, { type: blob.type }));
      } catch {
        // 없는 파일은 건너뜀
      }
    }
    setFiles(loaded.slice(0, 10)); // 아하 기준 = 10장
    setStatus(`샘플 ${Math.min(loaded.length, 10)}장 준비됨`);
  };

  ////////// 시나리오 실행
  const runScenario = async (scenario: BenchScenario) => {
    if (files.length === 0 || runningKey) return;
    setRunningKey(scenario.key);

    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const perImageMs: number[] = [];

      for (let index = 0; index < files.length; index += 1) {
        setStatus(`[${scenario.label}] ${index + 1}/${files.length} 처리 중…`);
        const startedAt = performance.now();
        await removeBackground(files[index], {
          device: scenario.device,
          model: scenario.model,
          output: { format: 'image/png', quality: 0.8 },
        });
        perImageMs.push(performance.now() - startedAt);
      }

      const coldMs = perImageMs[0];
      const warmTimes = perImageMs.slice(1);
      const warmAvgMs = warmTimes.length > 0 ? warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length : coldMs;
      const totalMs = perImageMs.reduce((a, b) => a + b, 0);

      setResults((prev) => [
        ...prev.filter((r) => r.scenarioKey !== scenario.key),
        { scenarioKey: scenario.key, count: files.length, coldMs, warmAvgMs, totalMs, perImageMs },
      ]);
      setStatus(`[${scenario.label}] 완료`);
    } catch (error) {
      console.error(error);
      setStatus(`[${scenario.label}] 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setRunningKey(null);
    }
  };

  ////////// 결과 JSON 복사
  const copyResults = async () => {
    const payload = {
      userAgent: navigator.userAgent,
      webGpu: hasWebGpu,
      imageCount: files.length,
      results: results.map((r) => ({
        scenario: r.scenarioKey,
        coldSec: +(r.coldMs / 1000).toFixed(1),
        warmAvgSec: +(r.warmAvgMs / 1000).toFixed(1),
        totalSec: +(r.totalMs / 1000).toFixed(1),
        perImageSec: r.perImageMs.map((ms) => +(ms / 1000).toFixed(1)),
      })),
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setStatus('결과 JSON을 클립보드에 복사했어요');
  };

  return (
    <Container maxWidth="md">
      <Stack spacing={3} sx={{ py: 5 }}>
        <Stack spacing={0.5}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            누끼 성능 벤치마크 (L-1 · 개발용)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            아하 모먼트(10장 일괄 ZIP) 성립 판정 — 웜 기준 10장 3분 이하 성립 / 6분 이하 경계 / 초과 위험
          </Typography>
          <Typography variant="caption" color="text.secondary">
            WebGPU 지원:{' '}
            {hasWebGpu === null ? '확인 중…' : hasWebGpu ? '✅ 사용 가능' : '❌ 없음 (GPU 시나리오도 CPU로 폴백됨)'}
          </Typography>
        </Stack>

        {/* 이미지 준비 */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
            <Button variant="outlined" onClick={loadSamples} disabled={runningKey !== null}>
              샘플 10장 불러오기
            </Button>
            <Button component="label" variant="outlined" disabled={runningKey !== null}>
              직접 선택
              <HiddenInput
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.target.files ?? []).slice(0, 10);
                  if (selected.length > 0) {
                    setFiles(selected);
                    setStatus(`선택 ${selected.length}장 준비됨`);
                  }
                  event.target.value = '';
                }}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              준비된 이미지: {files.length}장
            </Typography>
          </Stack>
        </Paper>

        {/* 시나리오 실행 */}
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            {SCENARIOS.map((scenario) => {
              const result = results.find((r) => r.scenarioKey === scenario.key);
              const verdict = result ? judge(result) : null;
              return (
                <Stack
                  key={scenario.key}
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                  useFlexGap
                >
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => runScenario(scenario)}
                    disabled={files.length === 0 || runningKey !== null}
                    startIcon={runningKey === scenario.key ? <CircularProgress size={14} color="inherit" /> : undefined}
                  >
                    실행
                  </Button>
                  <Typography variant="body2" sx={{ minWidth: 220 }}>
                    {scenario.label}
                  </Typography>
                  {result && (
                    <>
                      <Typography variant="caption" color="text.secondary">
                        콜드 {(result.coldMs / 1000).toFixed(1)}s · 웜 평균 {(result.warmAvgMs / 1000).toFixed(1)}s ·
                        총 {(result.totalMs / 1000).toFixed(1)}s
                      </Typography>
                      {verdict && <Chip size="small" label={verdict.label} color={verdict.color} />}
                    </>
                  )}
                </Stack>
              );
            })}
          </Stack>
        </Paper>

        {/* 상태 + 결과 복사 */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            상태: {status}
          </Typography>
          <Button variant="outlined" size="small" onClick={copyResults} disabled={results.length === 0}>
            결과 JSON 복사
          </Button>
        </Stack>

        <Typography variant="caption" color="text.disabled">
          주의: 시나리오 첫 실행(콜드)은 해당 모델 다운로드 시간을 포함해요. GPU→CPU 순서로 실행하세요.
          같은 시나리오 재실행 시 캐시로 콜드가 짧아질 수 있어요 (정확한 콜드 측정은 시크릿 창에서).
        </Typography>
      </Stack>
    </Container>
  );
}

//////////////////////////////////////// 스타일 ////////////////////////////////////////
const HiddenInput = styled.input({
  display: 'none',
});
