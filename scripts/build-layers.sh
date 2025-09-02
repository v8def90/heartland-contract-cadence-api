#!/bin/bash

# Lambda Layers ビルドスクリプト
# 各Layerの依存関係をインストールしてデプロイ準備を行う

set -e

echo "🚀 Lambda Layers ビルド開始"

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 関数: Layer依存関係をインストール
build_layer() {
    local layer_name=$1
    local layer_path="layers/${layer_name}"
    
    echo -e "${YELLOW}📦 ${layer_name} Layer ビルド中...${NC}"
    
    if [ ! -f "${layer_path}/package.json" ]; then
        echo -e "${RED}❌ ${layer_path}/package.json が見つかりません${NC}"
        return 1
    fi
    
    cd "${layer_path}"
    
    # 既存のnode_modulesをクリア
    rm -rf nodejs/node_modules
    
    # 依存関係をインストール
    echo "   📥 依存関係インストール中..."
    npm install --production --no-package-lock
    
    # node_modulesをLayerの正しい場所に移動
    mv node_modules nodejs/
    
    # サイズ確認
    local size=$(du -sh nodejs/ | cut -f1)
    echo -e "${GREEN}   ✅ ${layer_name}: ${size}${NC}"
    
    cd ../..
}

# 各Layerをビルド
echo "📁 作業ディレクトリ: $(pwd)"

# 1. Runtime Layer (基本依存関係)
build_layer "runtime"

# 2. AWS SDK Layer
build_layer "aws-sdk"

# 3. Web Dependencies Layer
build_layer "web-deps"

# 4. Blockchain Layer (最後 - 時間がかかる)
echo -e "${YELLOW}⚠️ Blockchain Layer: Flow SDK + viem (160MB) のダウンロードに時間がかかります...${NC}"
build_layer "blockchain"

echo ""
echo -e "${GREEN}🎉 すべてのLayers ビルド完了！${NC}"
echo ""
echo "📊 Layer サイズ一覧:"
for layer in runtime aws-sdk web-deps blockchain; do
    if [ -d "layers/${layer}/nodejs" ]; then
        size=$(du -sh layers/${layer}/nodejs | cut -f1)
        echo "   ${layer}: ${size}"
    fi
done

echo ""
echo -e "${YELLOW}🚀 次のステップ:${NC}"
echo "   serverless deploy --stage dev"
