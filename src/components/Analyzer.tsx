import React from 'react';
import { GoogleGenAI } from "@google/genai";
import { AuditPoint, CNGStation } from '../types';
import { Brain, Sparkles, TrendingUp, Zap, AlertCircle, BarChart3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalyzerProps {
  points: AuditPoint[];
  stations: CNGStation[];
}

export default function Analyzer({ points, stations }: AnalyzerProps) {
  const [analysis, setAnalysis] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const leakages = points.filter(p => p.isLeakage);
  const gasLeakages = leakages.filter(p => p.leakageType === 'gas').length;
  const oilLeakages = leakages.filter(p => p.leakageType === 'oil').length;

  const chartData = [
    { name: 'Gas Leakages', count: gasLeakages, color: '#f59e0b' },
    { name: 'Oil Leakages', count: oilLeakages, color: '#3b82f6' },
    { name: 'Other Issues', count: points.length - leakages.length, color: '#8b5cf6' }
  ];

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const model = "gemini-3-flash-preview";
      
      const stationNames = stations.map(s => s.name).join(', ');
      const leakageDetails = leakages.map(p => {
        const station = stations.find(s => s.id === p.stationId);
        return `- ${p.leakageType} leakage at ${station?.name || 'Unknown'}: ${p.description}`;
      }).join('\n');

      const prompt = `
        You are an expert CNG Station Maintenance and Efficiency Analyst.
        Analyze the following data from our CNG conditioning monitoring system:
        
        Total Audit Points: ${points.length}
        Gas Leakages: ${gasLeakages}
        Oil Leakages: ${oilLeakages}
        Stations Monitored: ${stationNames}
        
        Specific Leakage Details:
        ${leakageDetails}
        
        Please provide:
        1. A summary of the current system health.
        2. Root cause analysis for the observed leakages (gas and oil).
        3. Actionable steps to increase the efficiency of the machines.
        4. Recommendations to improve the overall system and prevent future leakages.
        5. A priority list of stations that need immediate attention.
        
        Format the response in clear Markdown with headings and bullet points.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
      });

      setAnalysis(response.text || 'No analysis generated.');
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to run AI analysis. Please check your API key or try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-black/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 size={24} className="text-blue-600" />
              <h2 className="text-xl font-bold">System Overview</h2>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Brain size={32} className="text-blue-200" />
              <h2 className="text-2xl font-bold">AI Analyzer</h2>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Our advanced AI analyzes leakage patterns and machine data to provide real-time efficiency improvements and maintenance strategies.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Sparkles size={20} />
                Run AI Analysis
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {(analysis || error) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white p-8 rounded-2xl shadow-sm border border-black/5"
          >
            {error ? (
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl">
                <AlertCircle size={24} />
                <p className="font-medium">{error}</p>
              </div>
            ) : (
              <div className="prose prose-blue max-w-none">
                <div className="flex items-center gap-2 mb-6 text-blue-600">
                  <TrendingUp size={24} />
                  <h3 className="text-2xl font-bold m-0">AI Optimization Report</h3>
                </div>
                <div className="markdown-body">
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Gas Leakages</p>
            <p className="text-2xl font-bold text-gray-900">{gasLeakages}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Oil Leakages</p>
            <p className="text-2xl font-bold text-gray-900">{oilLeakages}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">System Efficiency</p>
            <p className="text-2xl font-bold text-gray-900">{points.length > 0 ? Math.round((1 - leakages.length / points.length) * 100) : 100}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
