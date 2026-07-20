//////////////////////////////////////// 업로드 헬퍼 ////////////////////////////////////////
// assets 폴더의 이미지들을 숨김 input[type=file]에 주입
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { HumanPage } from "../../scripts/lib/humanize";

const ASSETS_ROOT = resolve(__dirname, "../../assets");

export const uploadAssets = async (p: HumanPage, folder: string, limit?: number) => {
  const dir = join(ASSETS_ROOT, folder);
  const files = readdirSync(dir)
    .filter((f) => /\.(jpg|jpeg|png|webp|xlsx)$/i.test(f))
    .slice(0, limit)
    .map((f) => join(dir, f));
  await p.page.locator('input[type="file"]').first().setInputFiles(files);
  return files.length;
};
