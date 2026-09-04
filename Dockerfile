# 採用輕量且安全的 Node.js 20 Alpine 作為基礎映像檔
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 複製依賴描述文件並安裝生產環境套件
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# 複製所有應用程式原始碼
COPY . .

# 設定環境變數
ENV NODE_ENV=production
ENV PORT=8080

# 暴露 Google Cloud Run 預設監聽連接埠 8080
EXPOSE 8080

# 啟動伺服器
CMD ["npm", "start"]