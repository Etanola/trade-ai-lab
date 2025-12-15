import json
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
from sklearn.metrics import classification_report, accuracy_score
import joblib

# Train model on tmp/features.json and output tmp/model.pkl and tmp/predictions.json

def load_features(path='./tmp/features.json'):
    with open(path,'r') as f:
        data = json.load(f)
    return data


def prepare_matrix(data):
    X = []
    y = []
    timestamps = []
    for r in data:
        # simple imputation
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

    print('Data shape', X.shape, y.sum(), 'positive labels')

    # TimeSeriesSplit CV
    tscv = TimeSeriesSplit(n_splits=5)
    clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    scores = cross_val_score(clf, X, y, cv=tscv, scoring='f1')
    print('CV F1 scores:', scores, 'mean', scores.mean())

    # Fit on full data
    clf.fit(X,y)
    joblib.dump(clf, './tmp/model.pkl')
    print('Saved model to tmp/model.pkl')

    # produce predictions (probabilities)
    probs = clf.predict_proba(X)[:,1]
    preds = (probs > 0.5).astype(int).tolist()

    out = []
    for t,p,pr in zip(timestamps,preds,probs.tolist()):
        out.append({'timestamp': t, 'pred': int(p), 'prob': float(pr)})

    with open('./tmp/predictions.json','w') as f:
        json.dump(out,f)
    print('Saved predictions to tmp/predictions.json')

    # short report
    print(classification_report(y, preds))
    print('Accuracy', accuracy_score(y,preds))

if __name__=='__main__':
    main()
