// 리모션 전역 설정 — 엔트리포인트·출력 형식
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./remotion/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
