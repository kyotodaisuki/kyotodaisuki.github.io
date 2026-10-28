# sennta Tech Blog — Minimal Mistakes 版

用 Minimal Mistakes Jekyll 主题（remote theme 方式）搭建的个人技术博客，
部署到 GitHub Pages。已有文章：大规模 CSV 导入超时应对（中文版 + 日文版）。

这个版本和之前 Astro 版的区别：不需要自己写构建脚本，
推到 GitHub 后由 GitHub Pages 自带的 Jekyll 构建器自动生成网站。

## 部署到 GitHub Pages（只做一次）

1. 在 GitHub 上新建一个公开仓库，仓库名必须是 `kyotodaisuki.github.io`
   （用这个名字就不用另外配置子路径）。
   建仓库时不要勾选 Add a README，保持空仓库最干净。
2. `_config.yml` 里已经写好了：
   `url: https://kyotodaisuki.github.io`，
   `remote_theme: mmistakes/minimal-mistakes`，
   作者和 GitHub 链接也已经是 kyotodaisuki，不用再改。
3. 把这个文件夹推到仓库（命令行版）：

```bash
git init
git add .
git commit -m "Initial blog"
git branch -M main
git remote add origin https://github.com/kyotodaisuki/kyotodaisuki.github.io.git
git push -u origin main
```

   不会用命令行，就用 GitHub Desktop：先在网站上建好空仓库，
   在 Desktop 里克隆它，把解压后的博客文件全部复制进去，
   写提交信息 `Initial blog`，Commit to main，再 Push origin。

4. 在 GitHub 仓库里打开 Settings → Pages，
   Build and deployment 的 Source 选择 **Deploy from a branch**，
   Branch 选择 **main**，文件夹选择 **/(root)**，点 Save。
   注意：这个版本不要选 GitHub Actions，Astro 版的 workflow 在这里用不上，
   也不要把 Astro 版的文件混进来。
5. 等几分钟，GitHub Pages 构建完成后，
   访问 `https://kyotodaisuki.github.io` 就能看到博客。
   如果页面还是 404 或还是旧内容，先去仓库的 Actions 标签页看构建有没有报错。

## 写新文章

复制 `_posts/2026-10-28-csv-import-timeout.md`，按这个规则改名：

```
_posts/2026-11-02-文章英文简称.md
```

开头的 frontmatter 不要删，改这几项就行：

```yaml
title: "文章标题"
date: 2026-11-02
categories:
  - 分类
tags:
  - 标签
excerpt: "一句话简介"
```

正文用 Markdown 写。文章已脱敏，不要放公司、客户和生产代码。

## 本地预览（可选，不是发布必需的）

发布不需要在本地跑起来，GitHub Pages 会帮你构建。
如果想在自己电脑上先预览，需要先装 Ruby 和 Bundler，然后：

```bash
bundle install
bundle exec jekyll serve
```

再打开 http://localhost:4000 。改了 `_config.yml` 要重启这个命令才生效。
