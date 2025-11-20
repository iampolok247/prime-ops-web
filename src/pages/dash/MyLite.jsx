// web/src/pages/dash/MyLite.jsx
import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function MyLite() {
  const [openTasks, setOpenTasks] = useState(0);

  useEffect(()=> {
    (async ()=>{
      const tasks = await api.listMyTasks().catch(()=>[]);
      setOpenTasks((tasks || []).filter(t => (t.status || '').toLowerCase() !== 'done').length);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-navy">My Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-royal text-sm">My Open Tasks</div>
          <div className="text-3xl font-extrabold">{openTasks}</div>
        </div>
      </div>
    </div>
  );
}
