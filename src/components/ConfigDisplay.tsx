import { API_CONFIG, MODEL_API_KEYS, FEATURE_FLAGS, APP_CONFIG } from '@/lib/env';

export function ConfigDisplay() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">API Configuration</h2>
        <pre className="bg-gray-100 p-2 rounded">
          {JSON.stringify(API_CONFIG, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Feature Flags</h2>
        <pre className="bg-gray-100 p-2 rounded">
          {JSON.stringify(FEATURE_FLAGS, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold">App Configuration</h2>
        <pre className="bg-gray-100 p-2 rounded">
          {JSON.stringify(APP_CONFIG, null, 2)}
        </pre>
      </div>

      <div>
        <h2 className="text-lg font-semibold">API Keys Status</h2>
        <pre className="bg-gray-100 p-2 rounded">
          {JSON.stringify({
            deepseek: MODEL_API_KEYS.deepseek ? 'Configured' : 'Not Configured',
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
} 