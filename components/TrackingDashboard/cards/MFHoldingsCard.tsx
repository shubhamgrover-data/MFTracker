
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Line, Legend, Cell 
} from 'recharts';
import { Users, TrendingUp, TrendingDown, Layers, BarChart2, ArrowRightLeft } from 'lucide-react';

interface ChartOption {
  type: string;
  x_labels: string[];
  y_labels: string;
  colors: string[];
  series_names: string[];
}

interface ChartData {
  heading: string;
  chart_options: ChartOption;
  chart_data: number[][];
}

interface Insight {
  type: string;
  message: string;
}

interface MFHoldingsData {
  title: string;
  summary: string;
  charts: ChartData[];
  insights: Insight[];
}

interface MFHoldingsCardProps {
  data: MFHoldingsData | null;
}

const MFHoldingsCard: React.FC<MFHoldingsCardProps> = ({ data }) => {
  const [activeChartIndex, setActiveChartIndex] = useState(0);

  // HOOKS MUST BE CALLED UNCONDITIONALLY
  // Use optional chaining to safely access data for useMemo dependencies
  const chartConfig = data?.charts?.[activeChartIndex];

  const chartData = useMemo(() => {
    if (!chartConfig) return [];
    
    // Transform parallel arrays into array of objects
    // x_labels: ["Jul", "Aug"]
    // chart_data: [[10, 20], [5, 8]]
    // Result: [{ name: "Jul", series0: 10, series1: 5 }, { name: "Aug", series0: 20, series1: 8 }]
    const { x_labels } = chartConfig.chart_options;
    const seriesData = chartConfig.chart_data;
    
    return x_labels.map((label, idx) => {
      const point: any = { name: label };
      chartConfig.chart_options.series_names.forEach((seriesName, sIdx) => {
         // Handle potential missing data points safely
         const val = seriesData[sIdx] ? seriesData[sIdx][idx] : 0;
         point[seriesName] = val;
      });
      return point;
    });
  }, [chartConfig]);

  // Early return is now safe after all hooks are called
  if (!data || !data.charts || data.charts.length === 0 || !chartConfig) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
        No MF Holdings Data
      </div>
    );
  }

  // Clean summary text (remove newlines and excessive tabs)
  const cleanSummary = data.summary.replace(/\s+/g, ' ').trim();

  // --- Render Custom Tooltip ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-100 shadow-lg rounded text-xs z-50">
          <p className="font-bold text-gray-700 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-0.5">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-500 capitalize">{entry.name}:</span>
              <span className="font-mono font-medium">
                {typeof entry.value === 'number' 
                  ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // --- renderChart Logic ---
  const renderChart = () => {
     const { series_names, colors } = chartConfig.chart_options;
     const isVolumeChart = chartConfig.heading.toLowerCase().includes('shareholding');

     if (isVolumeChart) {
         // Dual Axis Chart for Volume (Holdings vs Change)
         return (
             <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                     <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fill: '#9ca3af' }} 
                        axisLine={false} 
                        tickLine={false} 
                        interval="preserveStartEnd"
                     />
                     <YAxis 
                        yAxisId="left" 
                        tick={{ fontSize: 9, fill: '#9ca3af' }} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(val) => (val / 10000000).toFixed(0) + 'Cr'} 
                     />
                     <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        tick={{ fontSize: 9, fill: '#9ca3af' }} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(val) => (val / 100000).toFixed(0) + 'L'}
                     />
                     <Tooltip content={<CustomTooltip />} />
                     <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} iconSize={8} />
                     
                     {/* Total Holdings (Left Axis) */}
                     <Bar 
                        yAxisId="left" 
                        dataKey={series_names[0]} 
                        fill={colors[0] || "#6366f1"} 
                        barSize={20} 
                        radius={[2, 2, 0, 0]} 
                     />
                     {/* Net Change (Right Axis) - Using Line for visibility against large bars */}
                     <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey={series_names[1]} 
                        stroke={colors[1] || "#10b981"} 
                        strokeWidth={2}
                        dot={{ r: 2, fill: colors[1] }} 
                     />
                 </ComposedChart>
             </ResponsiveContainer>
         );
     } else {
         // Activity Chart (Holders / Bought / Sold)
         return (
             <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                     <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fill: '#9ca3af' }} 
                        axisLine={false} 
                        tickLine={false} 
                     />
                     <YAxis 
                        tick={{ fontSize: 9, fill: '#9ca3af' }} 
                        axisLine={false} 
                        tickLine={false} 
                     />
                     <Tooltip content={<CustomTooltip />} />
                     <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} iconSize={8} />
                     {series_names.map((name, idx) => (
                         <Bar 
                            key={name} 
                            dataKey={name} 
                            fill={colors[idx] || "#6366f1"} 
                            stackId={name === 'Holders' ? undefined : 'a'} // Stack Bought/Sold if desired, or keep separate. JSON implies grouped usually. Keeping separate for clarity.
                            radius={[2, 2, 0, 0]}
                         />
                     ))}
                 </BarChart>
             </ResponsiveContainer>
         );
     }
  };

  return (
    <div className="h-full flex flex-col gap-2 p-1 overflow-hidden">
        {/* Header: Summary */}
        <div className="shrink-0">
             <div className="flex items-center gap-1.5 mb-1.5 text-indigo-600">
                <Users size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">MF Activity Summary</span>
             </div>
             <p className="text-xs text-gray-600 leading-snug line-clamp-2" title={cleanSummary}>
                {cleanSummary}
             </p>
        </div>

        {/* Charts Section with Tabs */}
        <div className="flex-1 flex flex-col min-h-0 border border-gray-100 rounded-lg bg-white">
            <div className="flex border-b border-gray-100">
                {data.charts.map((chart, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveChartIndex(idx)}
                        className={`flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                            activeChartIndex === idx 
                            ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {idx === 0 ? <BarChart2 size={12}/> : <ArrowRightLeft size={12}/>}
                        {idx === 0 ? "Fund Activity" : "Share Volume"}
                    </button>
                ))}
            </div>
            <div className="flex-1 min-h-0 p-2">
                {renderChart()}
            </div>
        </div>

        {/* Insights Footer */}
        {data.insights && data.insights.length > 0 && (
            <div className="shrink-0 space-y-1.5 mt-1">
                 {data.insights.slice(0, 2).map((insight, idx) => {
                     const isPos = insight.type.includes('positive');
                     return (
                        <div key={idx} className={`flex gap-2 p-1.5 rounded border ${
                            isPos ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'
                        }`}>
                            <div className={`mt-0.5 shrink-0 ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                                {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            </div>
                            <p className="text-[9px] text-gray-600 leading-tight line-clamp-2">
                                {insight.message}
                            </p>
                        </div>
                     );
                 })}
            </div>
        )}
    </div>
  );
};

export default MFHoldingsCard;
