import React from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { AuditorLocation, UserProfile, ZONES } from '../types';
import { MapPin, User, Clock, Radio, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface LiveTracerProps {
  auditors: UserProfile[];
}

export default function LiveTracer({ auditors }: LiveTracerProps) {
  const [locations, setLocations] = React.useState<AuditorLocation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'auditor_locations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLocations(snapshot.docs.map(doc => doc.data() as AuditorLocation));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditor_locations');
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <Radio size={24} className="text-red-500 animate-pulse" />
          <h2 className="text-xl font-bold">Live Auditor Tracer</h2>
        </div>
        <div className="text-xs text-gray-400 font-medium uppercase tracking-widest">
          Real-time tracking enabled
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-900 rounded-3xl p-8 min-h-[500px] relative overflow-hidden shadow-2xl border border-white/10">
          {/* Grid Background */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="border border-white/20" />
            ))}
          </div>
          
          {/* Zone Labels */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 p-8 gap-8 pointer-events-none">
            {ZONES.map((zone, i) => (
              <div key={zone} className="border border-white/5 rounded-2xl flex items-center justify-center bg-white/5 backdrop-blur-sm">
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest text-center px-2">{zone}</span>
              </div>
            ))}
          </div>

          {/* Auditor Markers */}
          <AnimatePresence>
            {locations.map((loc) => {
              const auditor = auditors.find(a => a.uid === loc.auditorId);
              if (!auditor) return null;

              // Pseudo-random position based on lat/lng for visualization
              const x = (loc.location.longitude % 1) * 100;
              const y = (loc.location.latitude % 1) * 100;

              return (
                <motion.div
                  key={loc.auditorId}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
                >
                  <div className="relative">
                    <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping" />
                    <div className="w-10 h-10 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden">
                      {auditor.photoURL ? (
                        <img src={auditor.photoURL} alt={auditor.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-white" />
                      )}
                    </div>
                    
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-white px-3 py-2 rounded-lg shadow-xl border border-gray-100 whitespace-nowrap">
                        <p className="text-xs font-bold text-gray-900">{auditor.displayName}</p>
                        <p className="text-[10px] text-gray-500">{auditor.zone || 'No Zone'}</p>
                        <p className="text-[10px] text-blue-600 mt-1">{format(new Date(loc.timestamp), 'HH:mm:ss')}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <Navigation size={14} className="text-blue-400" />
            <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Auditor Live Map</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest px-2">Active Auditors</h3>
          <div className="space-y-2">
            {locations.length === 0 ? (
              <div className="p-4 bg-white rounded-xl border border-dashed border-gray-200 text-center">
                <p className="text-xs text-gray-400">No active auditors tracked</p>
              </div>
            ) : (
              locations.map((loc) => {
                const auditor = auditors.find(a => a.uid === loc.auditorId);
                if (!auditor) return null;
                return (
                  <div key={loc.auditorId} className="bg-white p-4 rounded-xl border border-black/5 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                      {auditor.photoURL ? (
                        <img src={auditor.photoURL} alt={auditor.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{auditor.displayName}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{auditor.zone || 'Field'}</p>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {format(new Date(loc.timestamp), 'HH:mm')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
