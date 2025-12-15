# Experimental scripts

このディレクトリは実験用スクリプトの旧ロケーションです。現在は主要な実行スクリプトを `tools/` に移動済みです。

残した理由:
- 履歴的な説明と参照用に README を残します。

主要スクリプトは以下です（`tools/` に移動済み）:

- `backtest_with_ml.js` — ML 信号を使ったバックテスト
- `check_coincheck.js` — データ取得テスト
- `check_original_backtest.js` — original ストラテジの確認
- `debug_atr_entries.js` — ATR エントリのデバッグ
- `debug_stoploss.js` — ストップロスのトリガ確認
- `export_features.js` — 特徴量エクスポート
- `run_smoke_tests.js` — 1m/5m のスモークテスト
- `sweep_atr.js`, `sweep_backtests.js` — パラメータスイープ
- `walkforward_atr.js` — ATR のウォークフォワード検証

使い方: `node tools/<script>.js` を実行してください。
