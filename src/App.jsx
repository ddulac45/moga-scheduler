// src/App.jsx
//
// Root component. Wires together:
//   - useAuth        → session + role
//   - AuthGate       → login screen if not authenticated
//   - useSupabaseData → all persistent state
//   - SchedulerApp   → the main UI (receives data + save functions as props)
//
// SchedulerApp is intentionally kept as close to the original monolith as
// possible during this migration phase. Props replace what was previously
// direct useState + localStorage calls.

import { useAuth }          from './hooks/useAuth.js';
import { useSupabaseData }  from './hooks/useSupabaseData.js';
import { AuthGate }         from './components/AuthGate.jsx';
import { SchedulerApp }     from './components/SchedulerApp.jsx';

export default function App() {
  const auth = useAuth();
  const data = useSupabaseData();

  return (
    <AuthGate auth={auth}>
      {data.loaded && (
        <SchedulerApp
          auth={auth}
          data={data}
        />
      )}
      {!data.loaded && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
          height:'100vh', fontFamily:'Georgia,serif', color:'#1A6B5A', fontSize:16,
          background:'#EEF9F7' }}>
          Loading schedule data…
        </div>
      )}
    </AuthGate>
  );
}
