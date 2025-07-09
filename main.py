from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Allow all origins for all routes
# CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Placeholder MongoDB URI (replace with your actual URI)
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI, tlsAllowInvalidCertificates=True)
db = client['github_events']
events_collection = db['events']

def format_timestamp(ts):
    # Ensure UTC ISO format
    if isinstance(ts, str):
        return ts
    return ts.isoformat() + 'Z'

@app.route('/webhook', methods=['POST'])
def github_webhook():
    event = request.headers.get('X-GitHub-Event')
    payload = request.json
    data = None
    if event == 'push':
        data = {
            'request_id': payload['after'],
            'author': payload['pusher']['name'],
            'action': 'PUSH',
            'from_branch': payload['ref'].split('/')[-1],
            'to_branch': payload['ref'].split('/')[-1],
            'timestamp': format_timestamp(payload['head_commit']['timestamp'])
        }
    elif event == 'pull_request':
        pr = payload['pull_request']
        data = {
            'request_id': str(pr['id']),
            'author': pr['user']['login'],
            'action': 'PULL_REQUEST',
            'from_branch': pr['head']['ref'],
            'to_branch': pr['base']['ref'],
            'timestamp': format_timestamp(pr['created_at'])
        }
        # Brownie points: handle merge event
        if pr.get('merged_at'):
            merge_data = {
                'request_id': str(pr['id']),
                'author': pr['merged_by']['login'] if pr.get('merged_by') else pr['user']['login'],
                'action': 'MERGE',
                'from_branch': pr['head']['ref'],
                'to_branch': pr['base']['ref'],
                'timestamp': format_timestamp(pr['merged_at'])
            }
            events_collection.insert_one(merge_data)
    else:
        return jsonify({'msg': 'Event not handled'}), 200
    if data:
        events_collection.insert_one(data)
    return jsonify({'msg': 'Event received'}), 200

@app.route('/events', methods=['GET'])
def get_events():
    # Get latest 20 events, sorted by timestamp descending
    events = list(events_collection.find().sort('timestamp', -1).limit(20))
    for e in events:
        e['_id'] = str(e['_id'])
    return jsonify(events)

if __name__ == '__main__':
     app.run(host="0.0.0.0", port=5001, debug=True)