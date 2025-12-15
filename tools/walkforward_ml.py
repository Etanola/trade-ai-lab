import json
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit
import joblib

# Walk-forward training: train on sequential windows and predict next window (out-of-sample)

def load_features(path='./tmp/features.json'):
    with open(path,'r') as f:
        data = json.load(f)
    return data


def prepare_matrix(data):
    X = []
    y = []
    timestamps = []
    for r in data:
        features = [r.get('ma5') or 0, r.get('ma7') or 0, r.get('ma20') or 0, r.get('ma50') or 0,
                    r.get('rsi') or 0, r.get('atr') or 0, r.get('adx') or 0, r.get('bb_width') or 0,
                    r.get('vol20') or 0, r.get('volume') or 0, r.get('macd') or 0, r.get('macd_signal') or 0]
        X.append(features)
        y.append(r.get('label',0))
        timestamps.append(r.get('timestamp'))
    return np.array(X), np.array(y), timestamps


def main():
    data = load_features()
    X,y,timestamps = prepare_matrix(data)
    n = X.shape[0]
    train_ratio = 0.6
    test_ratio = 0.2
    train_len = int(n * train_ratio)
    test_len = int(n * test_ratio)
    step = test_len

    oos_preds = []
    indices_used = set()

    for start in range(0, n - train_len - test_len + 1, step):
        train_idx = range(start, start + train_len)
        test_idx = range(start + train_len, start + train_len + test_len)
        X_train, y_train = X[train_idx], y[list(train_idx)]
        X_test = X[list(test_idx)]
        timestamps_test = [timestamps[i] for i in test_idx]

        clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        clf.fit(X_train, y_train)
        probs = clf.predict_proba(X_test)[:,1]
        preds = (probs > 0.5).astype(int)

        for t,p,pr,iidx in zip(timestamps_test, preds, probs.tolist(), test_idx):
            oos_preds.append({'timestamp': t, 'pred': int(p), 'prob': float(pr)})
            indices_used.add(iidx)

        print('Fold', start, 'trained; test positives', int(preds.sum()))

    # Some tail may remain — leave as no signal
    print('Produced', len(oos_preds), 'out-of-sample predictions')
    with open('./tmp/predictions_oos.json','w') as f:
        json.dump(oos_preds,f)
    print('Saved to tmp/predictions_oos.json')

if __name__=='__main__':
    main()
