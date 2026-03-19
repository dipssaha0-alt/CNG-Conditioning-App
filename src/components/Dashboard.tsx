import React from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { AuditPoint, UserProfile, CNGStation, ZONES, AuditStatus, AuditRemark, LeakageType, AuditCategory } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { FileSpreadsheet, Filter, CheckCircle, XCircle, Clock, MapPin, AlertTriangle, Search, ChevronDown, ChevronUp, History, Send } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DashboardProps {
  user: UserProfile;
}

export default function Dashboard({ user }: DashboardProps) {
  const [points, setPoints] = React.useState<AuditPoint[]>([]);
  const [stations, setStations] = React.useState<CNGStation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterZone, setFilterZone] = React.useState<string>('All');
  const [filterCategory, setFilterCategory] = React.useState<AuditCategory | 'All'>('All');
  const [filterStatus, setFilterStatus] = React.useState<AuditStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStation, setSelectedStation] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query(collection(db, 'audit_points'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pointsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditPoint));
      
      // Filtering based on role
      let filteredPoints = pointsData;
      if (user.role !== 'admin') {
        // Non-admins only see open points.
        // "only 1 should have all the access where open points and closed points are both seen by the main person"
        filteredPoints = pointsData.filter(p => p.status === 'open');
      }
      
      setPoints(filteredPoints);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_points');
    });

    const stationsUnsubscribe = onSnapshot(collection(db, 'stations'), (snapshot) => {
      setStations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CNGStation)));
    });

    return () => {
      unsubscribe();
      stationsUnsubscribe();
    };
  }, [user]);

  const handleForwardPoint = async (pointId: string, to: 'coordinator' | '3rd-party') => {
    try {
      const pointRef = doc(db, 'audit_points', pointId);
      await updateDoc(pointRef, {
        forwardedAt: new Date().toISOString(),
        forwardedBy: user.uid,
        remark: to === 'coordinator' ? 'pending' : 'omc issue' // Example mapping
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `audit_points/${pointId}`);
    }
  };

  const handleClosePoint = async (pointId: string) => {
    try {
      const pointRef = doc(db, 'audit_points', pointId);
      await updateDoc(pointRef, {
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedBy: user.uid,
        remark: 'done'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `audit_points/${pointId}`);
    }
  };

  const handleUpdateRemark = async (pointId: string, remark: AuditRemark) => {
    try {
      const pointRef = doc(db, 'audit_points', pointId);
      await updateDoc(pointRef, { remark });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `audit_points/${pointId}`);
    }
  };

  const exportToExcel = () => {
    const data = points.map(p => ({
      'Station': stations.find(s => s.id === p.stationId)?.name || 'Unknown',
      'Zone': stations.find(s => s.id === p.stationId)?.zone || 'Unknown',
      'Category': p.category,
      'Description': p.description,
      'Status': p.status,
      'Remark': p.remark,
      'Leakage': p.isLeakage ? p.leakageType : 'None',
      'Created At': format(new Date(p.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      'Closed At': p.closedAt ? format(new Date(p.closedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      'Auditor ID': p.auditorId
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Points');
    XLSX.writeFile(wb, `CNG_Audit_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const filteredPoints = points.filter(p => {
    const station = stations.find(s => s.id === p.stationId);
    const matchesZone = filterZone === 'All' || station?.zone === filterZone;
    const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || p.status === filterStatus;
    const matchesSearch = p.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          station?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStation = !selectedStation || p.stationId === selectedStation;
    return matchesZone && matchesCategory && matchesStatus && matchesSearch && matchesStation;
  });

  if (loading) return <div className="flex justify-center p-12">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-black/5">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-blue-600" />
          <h2 className="text-xl font-semibold">Audit Dashboard</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={filterZone} 
            onChange={(e) => setFilterZone(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Zones</option>
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value as AuditCategory | 'All')}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Categories</option>
            <option value="technical">Technical</option>
            <option value="statutory">Statutory</option>
            <option value="safety">Safety</option>
          </select>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value as AuditStatus | 'All')}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search points..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
          </div>
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredPoints.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No audit points found matching filters.</p>
            </div>
          ) : (
            filteredPoints.map((point) => {
              const station = stations.find(s => s.id === point.stationId);
              const isOverdue = differenceInDays(new Date(), new Date(point.createdAt)) > 45;
              
              return (
                <motion.div
                  key={point.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "bg-white p-5 rounded-xl border transition-all hover:shadow-md",
                    point.status === 'open' ? "border-l-4 border-l-orange-500 border-gray-200" : "border-l-4 border-l-emerald-500 border-gray-200 opacity-80"
                  )}
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          point.category === 'safety' ? "bg-red-100 text-red-700" :
                          point.category === 'technical' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {point.category}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-[10px] font-bold uppercase border border-gray-200">
                          {point.remark}
                        </span>
                        {point.isLeakage && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase">
                            <AlertTriangle size={10} />
                            {point.leakageType} Leakage
                          </span>
                        )}
                        {isOverdue && point.status === 'open' && (
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-bold uppercase">
                            Overdue (45+ Days)
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-lg text-gray-900">{station?.name || 'Unknown Station'}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{point.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-3">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          {station?.zone || 'Unknown Zone'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {format(new Date(point.createdAt), 'MMM d, yyyy HH:mm')}
                        </div>
                        {point.closedAt && (
                          <div className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle size={14} />
                            Closed: {format(new Date(point.closedAt), 'MMM d, yyyy')}
                          </div>
                        )}
                        {point.forwardedAt && (
                          <div className="flex items-center gap-1 text-blue-600 font-medium">
                            <Send size={14} />
                            Forwarded: {format(new Date(point.forwardedAt), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 min-w-[180px]">
                      <div className="flex flex-col w-full gap-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Remark</label>
                        <select
                          value={point.remark}
                          disabled={point.status === 'closed' && user.role !== 'admin'}
                          onChange={(e) => handleUpdateRemark(point.id, e.target.value as AuditRemark)}
                          className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="dealer issue">Dealer Issue</option>
                          <option value="omc issue">OMC Issue</option>
                          <option value="material requirement">Material Requirement</option>
                          <option value="fabrication issue">Fabrication Issue</option>
                          <option value="upgradation req">Upgradation Req.</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      {point.status === 'open' && (
                        <div className="flex flex-col w-full gap-2">
                          {user.role === 'auditor' && !point.forwardedAt && (
                            <button
                              onClick={() => handleForwardPoint(point.id, 'coordinator')}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-bold"
                            >
                              <Send size={16} />
                              Forward to Coord.
                            </button>
                          )}
                          {user.role === 'coordinator' && (
                            <button
                              onClick={() => handleForwardPoint(point.id, '3rd-party')}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-bold"
                            >
                              <Send size={16} />
                              Forward to 3rd Party
                            </button>
                          )}
                          {(user.role === 'admin' || user.role === 'coordinator') && (
                            <button
                              onClick={() => handleClosePoint(point.id)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-bold"
                            >
                              <CheckCircle size={16} />
                              Close Point
                            </button>
                          )}
                        </div>
                      )}
                      
                      {point.photoUrl && (
                        <a 
                          href={point.photoUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-blue-600 text-xs font-medium hover:underline"
                        >
                          View Attachment
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
