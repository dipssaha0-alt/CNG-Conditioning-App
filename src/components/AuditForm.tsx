import React from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { UserProfile, CNGStation, AuditCategory, AuditRemark, LeakageType, ZONES } from '../types';
import { Camera, MapPin, AlertTriangle, CheckCircle, Send, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AuditFormProps {
  user: UserProfile;
  stations: CNGStation[];
}

export default function AuditForm({ user, stations }: AuditFormProps) {
  const [selectedStation, setSelectedStation] = React.useState<string>('');
  const [category, setCategory] = React.useState<AuditCategory>('technical');
  const [description, setDescription] = React.useState('');
  const [isLeakage, setIsLeakage] = React.useState(false);
  const [leakageType, setLeakageType] = React.useState<LeakageType>('none');
  const [remark, setRemark] = React.useState<AuditRemark>('pending');
  const [photoUrl, setPhotoUrl] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const getRemarksForCategory = (cat: AuditCategory): AuditRemark[] => {
    if (cat === 'technical') {
      return ['pending', 'material requirement', 'fabrication issue', 'upgradation req'];
    }
    return ['dealer issue', 'omc issue'];
  };

  React.useEffect(() => {
    const available = getRemarksForCategory(category);
    if (!available.includes(remark)) {
      setRemark(available[0]);
    }
  }, [category]);

  // Update location periodically when form is open
  React.useEffect(() => {
    if (!navigator.geolocation) return;

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const locRef = doc(db, 'auditor_locations', user.uid);
          await setDoc(locRef, {
            auditorId: user.uid,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            },
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      });
    };

    const interval = setInterval(updateLocation, 30000); // Every 30 seconds
    updateLocation();

    return () => clearInterval(interval);
  }, [user.uid]);

  const filteredStations = user.role === 'admin' 
    ? stations 
    : stations.filter(s => !user.zone || s.zone === user.zone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !description) return;

    setLoading(true);
    try {
      const pointData = {
        stationId: selectedStation,
        auditorId: user.uid,
        category,
        description,
        status: 'open',
        remark,
        photoUrl: photoUrl || null,
        createdAt: new Date().toISOString(),
        isLeakage,
        leakageType: isLeakage ? leakageType : 'none'
      };

      await addDoc(collection(db, 'audit_points'), pointData);
      
      // Update station's last audit date
      const stationRef = doc(db, 'stations', selectedStation);
      await updateDoc(stationRef, {
        lastAuditDate: new Date().toISOString()
      });

      setSuccess(true);
      setDescription('');
      setIsLeakage(false);
      setLeakageType('none');
      setPhotoUrl('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'audit_points');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden">
      <div className="bg-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Plus size={24} />
          New Audit Entry
        </h2>
        <p className="text-blue-100 text-sm mt-1">Record technical, statutory, or safety points for CNG stations.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">CNG Station</label>
            <div className="relative">
              <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                required
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Select Station</option>
                {filteredStations.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.zone})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Category</label>
            <div className="grid grid-cols-3 gap-3">
              {(['technical', 'statutory', 'safety'] as AuditCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-bold uppercase transition-all border-2",
                    category === cat 
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                      : "bg-white border-gray-200 text-gray-500 hover:border-blue-200"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Initial Remark</label>
            <div className="grid grid-cols-2 gap-2">
              {getRemarksForCategory(category).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRemark(r)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border",
                    remark === r
                      ? "bg-gray-800 border-gray-800 text-white"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Description</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue or point in detail..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isLeakage ? 'bg-amber-500 border-amber-500' : 'border-gray-300 group-hover:border-amber-400'}`}>
              {isLeakage && <AlertTriangle size={14} className="text-white" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={isLeakage} 
              onChange={(e) => setIsLeakage(e.target.checked)} 
            />
            <span className="text-sm font-bold text-gray-700">Is this a Leakage?</span>
          </label>

          <AnimatePresence>
            {isLeakage && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3"
              >
                <select
                  value={leakageType}
                  onChange={(e) => setLeakageType(e.target.value as LeakageType)}
                  className="px-4 py-2 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="none">Select Type</option>
                  <option value="gas">Gas Leakage</option>
                  <option value="oil">Oil Leakage</option>
                </select>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Photo URL (Optional)</label>
          <div className="relative">
            <Camera size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-lg shadow-lg shadow-blue-200 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send size={20} />
              Submit Audit Point
            </>
          )}
        </button>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-2 text-emerald-600 font-bold"
            >
              <CheckCircle size={20} />
              Audit point recorded successfully!
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
