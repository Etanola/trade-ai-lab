# trade-ai-lab
AI を活用して株式トレードの自動化・分析を行うためのプロジェクトです。  
Python（Conda）環境で動作し、GitHub Copilot や gh CLI を使った開発効率化も取り入れています。

---

## 🚀 Features（特徴）

- AI（LLM / OpenAI API など）を用いた株価分析
- 売買戦略のバックテスト機能（予定）
- 自動トレード（将来実装）
- GitHub Copilot によるコード補完
- GitHub CLI（gh）を使った自動コミットワークフロー

---

## 🛠 Development Environment（開発環境）

### ■ Python / Conda
このプロジェクトは以下の環境で構築されています。
---
```
conda create -n tradeai python=3.11
conda activate tradeai
pip install -r requirements.txt
```

## 📦 Installation（インストール）

1. リポジトリを clone

```
gh repo clone <your-name>/TradeAI
cd TradeAI
```

2. Conda 環境を有効化

```
conda activate tradeai
```

3. 依存関係インストール

```
pip install -r requirements.txt
```

---

## 🤖 GitHub Copilot

VSCode の拡張機能から Copilot を有効化できます。

1. VSCode → Extensions  
2. “GitHub Copilot” を検索  
3. Install  
4. GitHub アカウントで Login  
5. Status Bar に "Copilot: Enabled" と表示されればOK  

---

## 📝 Commit Message Automation（コミット自動化）

以下のスクリプトを `scripts/commit.sh` に置くことで、  
AI によるコミットメッセージ生成（例：Copilot CLI or OpenAI API）を利用できます。

```
bash
#!/bin/bash

# 使い方: ./commit.sh "変更内容の簡単な説明"
MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
    echo "コミット内容の要約を指定してください。"
    exit 1
fi

git add .
git commit -m "$MESSAGE"
git push
```

📁 Directory Structure（ディレクトリ構成）
```
TradeAI/
  ├── src/
  │     ├── data/
  │     ├── strategies/
  │     ├── utils/
  │     └── main.py
  ├── scripts/
  │     └── commit.sh
  ├── .gitignore
  ├── requirements.txt
  └── README.md
  ```

🧪 Roadmap（今後の実装予定）

* 株価データ取得モジュールの整備

* 売買シグナルの生成

* バックテスト機能

* OpenAI API を使った戦略最適化

* 自動取引の実装（松井証券 API 対応）

📄 License

MIT License

🙏 Acknowledgements

OpenAI API

GitHub Copilot

Anaconda

Python Community


---