import React from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, deleteDoc } from 'firebase/firestore';
import { CNGStation, UserProfile, ZONES, UserRole } from '../types';
import { Plus, Trash2, Edit2, MapPin, User, Settings, Shield, Users, Building2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  user: UserProfile;
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const [stations, setStations] = React.useState<CNGStation[]>([]);
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newStation, setNewStation] = React.useState({ name: '', zone: ZONES[0], lat: 0, lng: 0 });
  const [editingStation, setEditingStation] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stationsUnsubscribe = onSnapshot(collection(db, 'stations'), (snapshot) => {
      setStations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CNGStation)));
      setLoading(false);
    });

    const usersUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    return () => {
      stationsUnsubscribe();
      usersUnsubscribe();
    };
  }, []);

  const handleAddStation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'stations'), {
        name: newStation.name,
        zone: newStation.zone,
        location: { latitude: newStation.lat, longitude: newStation.lng },
        lastAuditDate: null
      });
      setNewStation({ name: '', zone: ZONES[0], lat: 0, lng: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'stations');
    }
  };

  const handleUpdateUserRole = async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleUpdateUserZone = async (uid: string, zone: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { zone });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this station?')) return;
    try {
      await deleteDoc(doc(db, 'stations', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `stations/${id}`);
    }
  };

  const handleSeedData = async () => {
    try {
      setLoading(true);
      const sampleStations = [
        { name: 'Amar Auto - Matunga', zone: 'Central Zone' },
        { name: 'Raj Auto, Vile Parle', zone: 'Western Zone' },
        { name: 'Indus Filling Station (IBP), Wadala', zone: 'Central Zone' },
        { name: 'Anjur Service centre DBS-Eurotech', zone: 'GA3 (KDAB Zone)' }
      ];

      const stationIds: Record<string, string> = {};

      for (const s of sampleStations) {
        const existing = stations.find(st => st.name === s.name);
        if (existing) {
          stationIds[s.name] = existing.id;
        } else {
          const docRef = await addDoc(collection(db, 'stations'), {
            ...s,
            location: { latitude: 19.076, longitude: 72.877 },
            lastAuditDate: new Date().toISOString()
          });
          stationIds[s.name] = docRef.id;
        }
      }

      const samplePoints = [
        {
          stationId: stationIds['Amar Auto - Matunga'],
          auditorId: user.uid,
          category: 'safety',
          description: 'First aid box incomplete',
          status: 'open',
          remark: 'dealer issue',
          createdAt: '2024-09-01T10:00:00Z',
          isLeakage: false,
          leakageType: 'none'
        },
        {
          stationId: stationIds['Amar Auto - Matunga'],
          auditorId: user.uid,
          category: 'safety',
          description: 'Electrical Room exhaust Fan not available',
          status: 'open',
          remark: 'omc issue',
          createdAt: '2020-12-16T10:00:00Z',
          isLeakage: false,
          leakageType: 'none'
        },
        {
          stationId: stationIds['Raj Auto, Vile Parle'],
          auditorId: user.uid,
          category: 'statutory',
          description: 'Earth pit testing date not visible',
          status: 'open',
          remark: 'upgradation req',
          createdAt: '2021-10-11T10:00:00Z',
          isLeakage: false,
          leakageType: 'none'
        },
        {
          stationId: stationIds['Indus Filling Station (IBP), Wadala'],
          auditorId: user.uid,
          category: 'technical',
          description: 'Oil leakage from cooler',
          status: 'open',
          remark: 'pending',
          createdAt: '2026-02-05T10:00:00Z',
          isLeakage: true,
          leakageType: 'oil'
        },
        {
          stationId: stationIds['Indus Filling Station (IBP), Wadala'],
          auditorId: user.uid,
          category: 'technical',
          description: 'GD1 faulty (-8)',
          status: 'open',
          remark: 'material requirement',
          createdAt: '2026-02-05T10:00:00Z',
          isLeakage: false,
          leakageType: 'none'
        },
        {
          stationId: stationIds['Anjur Service centre DBS-Eurotech'],
          auditorId: user.uid,
          category: 'technical',
          description: 'Compressor Door rusted And Corrosion',
          status: 'open',
          remark: 'fabrication issue',
          createdAt: '2025-09-05T10:00:00Z',
          isLeakage: false,
          leakageType: 'none'
        }
      ];

      for (const p of samplePoints) {
        await addDoc(collection(db, 'audit_points'), p);
      }

      alert('Sample data seeded successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'seed_data');
    } finally {
      setLoading(false);
    }
  };

  if (user.role !== 'admin') return <div className="p-12 text-center text-red-500 font-bold">Access Denied. Admin only.</div>;

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Control Panel</h1>
        <button
          onClick={handleSeedData}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-bold shadow-lg shadow-emerald-100"
        >
          <Save size={16} />
          Seed Sample Data
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Station Management */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold">Station Management</h2>
          </div>

          <form onSubmit={handleAddStation} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Station Name</label>
              <input 
                required
                type="text" 
                placeholder="Station Name" 
                value={newStation.name}
                onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Zone</label>
              <select 
                value={newStation.zone}
                onChange={(e) => setNewStation({ ...newStation, zone: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold"
              >
                <Plus size={16} />
                Add Station
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {stations.map(station => (
              <div key={station.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{station.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{station.zone}</p>
                </div>
                <button 
                  onClick={() => handleDeleteStation(station.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-black/5 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Users size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold">User Management</h2>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {users.map(u => (
              <div key={u.uid} className="p-4 bg-white border border-gray-100 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{u.displayName}</p>
                    <p className="text-[10px] text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Role</label>
                    <select 
                      value={u.role}
                      onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as UserRole)}
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="auditor">Auditor</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Zone Assignment</label>
                    <select 
                      value={u.zone || ''}
                      onChange={(e) => handleUpdateUserZone(u.uid, e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No Zone</option>
                      {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
