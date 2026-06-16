# 予月安然工作室

月月的个人音乐、影像、灵感、故事与照片小站。

## 本地打开

1. 双击 `打开月月音乐小站.bat`
2. 浏览器会直接打开 `index.html`
3. 点击“上传音乐”添加自己的歌，点击“添加照片”放照片
4. 灵感和故事会保存在当前浏览器里

## 本地服务版

如果以后遇到浏览器限制，再双击 `启动本地服务版.bat`，它会打开
`http://127.0.0.1:8765/`。服务版需要保留那个小黑窗，关掉网页就会断。

## 发布到 GitHub Pages

1. 登录 GitHub。
2. 新建一个公开仓库，例如 `yuyue-anran-studio`。
3. 把这个文件夹里的内容全部上传到仓库根目录，包括：
   - `index.html`
   - `styles.css`
   - `app.js`
   - `site-data.js`
   - `assets` 文件夹
   - `.nojekyll`
4. 进入仓库的 `Settings` -> `Pages`。
5. `Build and deployment` 选择 `Deploy from a branch`。
6. Branch 选择 `main`，目录选择 `/root`，保存。
7. 等 GitHub 生成网址后，别人就可以访问这个小站。

注意：浏览器里临时上传的音乐和照片目前是“本机小站”模式。要发给别人看，需要先把公开展示用的音乐、封面、照片正式放进网站文件夹，再上传到 GitHub。
