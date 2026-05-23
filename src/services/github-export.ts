// ═══════════════════════════════════════════════════════════
// GitHub API 导出服务 — 将小说内容推送到 GitHub 仓库
// ═══════════════════════════════════════════════════════════
import type { Novel } from '@/types';
import type { FrameworkVolume } from '@/types/novel-framework';

function toBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

interface GitHubFile {
  path: string;
  content: string;
}

async function githubRequest(
  config: GitHubConfig,
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<Response> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getFileSha(config: GitHubConfig, path: string): Promise<string | null> {
  const resp = await githubRequest(config, 'GET', path);
  if (resp.status === 404) return null;
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`GitHub API 错误 (${resp.status}): ${(err as { message?: string }).message || '未知'}`);
  }
  const data = await resp.json() as { sha?: string };
  return data.sha ?? null;
}

async function upsertFile(config: GitHubConfig, file: GitHubFile): Promise<void> {
  const sha = await getFileSha(config, file.path);
  const body: Record<string, unknown> = {
    message: sha ? `更新 ${file.path}` : `创建 ${file.path}`,
    content: toBase64(file.content),
  };
  if (sha) body.sha = sha;

  const resp = await githubRequest(config, 'PUT', file.path, body);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`上传失败 ${file.path} (${resp.status}): ${(err as { message?: string }).message || '未知'}`);
  }
}

export async function createOrGetRepo(config: GitHubConfig): Promise<void> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const resp = await fetch(url, { headers });
  if (resp.ok) return; // repo exists
  if (resp.status !== 404) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`GitHub API 错误 (${resp.status}): ${(err as { message?: string }).message || '未知'}`);
  }

  // Create repo
  const createResp = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: config.repo,
      private: false,
      description: 'InkFlow DS Pro 导出的小说项目',
    }),
  });
  if (!createResp.ok) {
    const err = await createResp.json().catch(() => ({}));
    throw new Error(`创建仓库失败 (${createResp.status}): ${(err as { message?: string }).message || '未知'}`);
  }
}

function buildNovelFiles(novel: Novel): GitHubFile[] {
  const files: GitHubFile[] = [];
  const baseDir = `书籍/${novel.title}`;

  // README
  files.push({
    path: `${baseDir}/README.md`,
    content: [
      `# ${novel.title}`,
      '',
      novel.subtitle ? `> ${novel.subtitle}` : '',
      '',
      `- **类型**: ${novel.genre || '未设定'}`,
      `- **流派标签**: ${novel.tropeTag || '无'}`,
      `- **状态**: ${novel.status}`,
      '',
      '## 简介',
      '',
      novel.description || '暂无',
    ].join('\n'),
  });

  // 大纲
  if (novel.generationOutline?.outline) {
    files.push({
      path: `${baseDir}/大纲.md`,
      content: [
        '# 核心大纲',
        '',
        novel.generationOutline.outline,
      ].join('\n'),
    });
  }

  // 灵感
  if (novel.inspirationText) {
    files.push({
      path: `${baseDir}/灵感.md`,
      content: [
        '# 创作灵感',
        '',
        novel.inspirationText,
      ].join('\n'),
    });
  }

  // 框架 — 篇大纲
  const framework = novel.novelFramework;
  if (framework) {
    const volList = (framework.volumes ?? []).map((v: FrameworkVolume) => {
      return [
        `## ${v.title}`,
        '',
        `- **叙事弧线**: ${v.arc}`,
        `- **主题**: ${v.theme}`,
        `- **章节范围**: 第 ${v.chapterRange[0]} 章 ~ 第 ${v.chapterRange[1]} 章`,
        `- **核心冲突**: ${v.mainConflict}`,
        `- **篇末高潮**: ${v.volumeEnding}`,
        '',
        v.synopsis,
        '',
      ].join('\n');
    }).join('\n');

    files.push({
      path: `${baseDir}/框架-篇大纲.md`,
      content: [
        `# ${framework.bookTitle} — 框架大纲`,
        '',
        `- **类型**: ${framework.bookType}`,
        `- **简介**: ${framework.oneLiner}`,
        '',
        '## 主角',
        '',
        `**${framework.protagonist.name}**: ${framework.protagonist.personality || ''}`,
        framework.protagonist.abilities ? `\n能力：${framework.protagonist.abilities}` : '',
        '',
        '## 世界观',
        '',
        `${framework.worldSetting.worldName}（${framework.worldSetting.worldType}）`,
        framework.worldSetting.worldRules ? `\n${framework.worldSetting.worldRules}` : '',
        '',
        '## 篇级大纲',
        '',
        volList || '暂无篇目',
      ].join('\n'),
    });

    // 篇章详情 — 细化章节
    const volumeChapters = novel.volumeChapters;
    if (volumeChapters && Object.keys(volumeChapters).length > 0) {
      const allChapters: string[] = ['# 章节详情', ''];
      for (const vol of (framework.volumes ?? [])) {
        const chs = volumeChapters[vol.id];
        if (chs && chs.length > 0) {
          allChapters.push(`## ${vol.title}`, '');
          for (const ch of chs) {
            allChapters.push(`### ${ch.chapterTitle}`);
            allChapters.push('');
            allChapters.push(`- **剧情**: ${ch.microPlot}`);
            allChapters.push(`- **断崖**: ${ch.cliffhangerPoint}`);
            allChapters.push('');
          }
        }
      }
      files.push({
        path: `${baseDir}/框架-章节目录.md`,
        content: allChapters.join('\n'),
      });
    }
  }

  // 角色
  if (novel.protagonist?.name) {
    const p = novel.protagonist;
    const charLines = [
      '# 主角',
      '',
      `**${p.name}**`,
      p.gender ? `- 性别: ${p.gender}` : '',
      p.age ? `- 年龄: ${p.age}` : '',
      p.personality ? `- 性格: ${p.personality}` : '',
      p.background ? `- 背景: ${p.background}` : '',
      p.abilities ? `- 能力: ${p.abilities}` : '',
      p.goals ? `- 目标: ${p.goals}` : '',
    ].filter(Boolean);
    files.push({ path: `${baseDir}/角色.md`, content: charLines.join('\n') });
  }

  if (novel.characters?.length) {
    const chars = ['# 配角', ''];
    for (const c of novel.characters) {
      chars.push(`## ${c.name || '未命名'}`);
      if (c.role) chars.push(`- 身份: ${c.role}`);
      if (c.description) chars.push(`- ${c.description}`);
      chars.push('');
    }
    if (chars.length > 2) files.push({ path: `${baseDir}/角色-配角.md`, content: chars.join('\n') });
  }

  // 世界观
  if (novel.worldSettings?.length) {
    const ws = ['# 世界观设定', ''];
    for (const w of novel.worldSettings) {
      ws.push(`## ${w.title || '未命名'}`);
      if (w.content) ws.push(w.content);
      ws.push('');
    }
    files.push({ path: `${baseDir}/世界观.md`, content: ws.join('\n') });
  }

  if (novel.worldBuildingText) {
    files.push({ path: `${baseDir}/世界观-描述.md`, content: `# 世界观描述\n\n${novel.worldBuildingText}` });
  }

  // 时间线
  if (novel.timeline?.length) {
    const tl = ['# 时间线', ''];
    for (const t of novel.timeline) {
      tl.push(`## ${t.phase}: ${t.event}`);
      if (t.description) tl.push(t.description);
      tl.push('');
    }
    files.push({ path: `${baseDir}/时间线.md`, content: tl.join('\n') });
  }

  // 章节内容
  const chapters = (novel.chapters ?? []).slice().sort((a, b) => a.order - b.order);
  if (chapters.length > 0) {
    files.push({
      path: `${baseDir}/章节/README.md`,
      content: `# 章节列表\n\n共 ${chapters.length} 章\n`,
    });

    for (const ch of chapters) {
      files.push({
        path: `${baseDir}/章节/${String(ch.order).padStart(3, '0')}-${ch.title}.md`,
        content: `# ${ch.title}\n\n${ch.content || '（暂无内容）'}`,
      });
    }
  }

  return files;
}

export async function exportNovelToGitHub(
  config: GitHubConfig,
  novel: Novel,
  onProgress?: (current: number, total: number, path: string) => void,
): Promise<void> {
  // Ensure repo exists
  await createOrGetRepo(config);

  const files = buildNovelFiles(novel);
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    onProgress?.(i + 1, total, file.path);
    await upsertFile(config, file);
  }
}
