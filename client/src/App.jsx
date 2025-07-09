import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { GitBranch, GitPullRequest, GitMerge, Clock, User, Activity } from 'lucide-react';

const API_URL = 'http://localhost:5001/events'; // Change if backend is deployed elsewhere

function formatEvent(event) {
  const date = new Date(event.timestamp);
  const formattedDate = date.toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC'
  }) + ' UTC';
  
  if (event.action === 'PUSH') {
    return `"${event.author}" pushed to "${event.to_branch}" on ${formattedDate}`;
  } else if (event.action === 'PULL_REQUEST') {
    return `"${event.author}" submitted a pull request from "${event.from_branch}" to "${event.to_branch}" on ${formattedDate}`;
  } else if (event.action === 'MERGE') {
    return `"${event.author}" merged branch "${event.from_branch}" to "${event.to_branch}" on ${formattedDate}`;
  }
  return '';
}

function getActionIcon(action) {
  switch (action) {
    case 'PUSH':
      return <GitBranch className="w-5 h-5 text-blue-500" />;
    case 'PULL_REQUEST':
      return <GitPullRequest className="w-5 h-5 text-green-500" />;
    case 'MERGE':
      return <GitMerge className="w-5 h-5 text-purple-500" />;
    default:
      return <Activity className="w-5 h-5 text-gray-500" />;
  }
}

function getActionColor(action) {
  switch (action) {
    case 'PUSH':
      return 'bg-blue-50 border-blue-200';
    case 'PULL_REQUEST':
      return 'bg-green-50 border-green-200';
    case 'MERGE':
      return 'bg-purple-50 border-purple-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const seenIds = useRef(new Set());

  const fetchEvents = async () => {
    try {
      const res = await axios.get(API_URL);
      // Deduplicate by request_id and only show new events
      const newEvents = res.data.filter(e => !seenIds.current.has(e.request_id));
      newEvents.forEach(e => seenIds.current.add(e.request_id));
      setEvents(prev => [...newEvents, ...prev].slice(0, 20));
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-800">
              PushPullMerge Monitor
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Real-time Git activity monitoring dashboard
          </p>
          {lastUpdated && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Stats Bar */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <span className="font-semibold">Recent Activity</span>
              </div>
              <div className="text-sm opacity-90">
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-slate-600">Loading events...</span>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No events yet.</p>
                <p className="text-slate-400 text-sm mt-2">
                  Events will appear here when Git activity is detected.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map(event => (
                  <div
                    key={event.request_id}
                    className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${getActionColor(event.action)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getActionIcon(event.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.action === 'PUSH' 
                              ? 'bg-blue-100 text-blue-800' 
                              : event.action === 'PULL_REQUEST'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {event.action.replace('_', ' ')}
                          </span>
                          <div className="flex items-center gap-1 text-sm text-slate-500">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{event.author}</span>
                          </div>
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          {formatEvent(event)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>Updates every 15 seconds • Showing last 20 events</p>
        </div>
      </div>
    </div>
  );
}

export default App;