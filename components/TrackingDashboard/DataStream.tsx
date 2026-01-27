
import React from 'react';
import { TrackedItem } from '../../services/trackingStorage';
import { Briefcase, PieChart, ArrowRight } from 'lucide-react';

interface DataStreamProps {
  entities: TrackedItem[];
}

const DataStream: React.FC<DataStreamProps> = ({ entities }) => {
  if (entities.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
        <p>No items in Data Stream.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {entities.map((item) => (
        <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
           <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                  item.type === 'STOCK' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
              }`}>
                {item.type === 'STOCK' ? <Briefcase size={20} /> : <PieChart size={20} />}
              </div>
              <div>
                 <h4 className="font-bold text-gray-900">{item.name}</h4>
                 <div className="text-xs text-gray-500 font-mono mt-0.5">{item.symbol || item.id}</div>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                 <div className="text-xs text-gray-400">Type</div>
                 <div className="text-sm font-medium text-gray-700">{item.type === 'STOCK' ? 'Equity' : 'Mutual Fund'}</div>
              </div>
              <div className="h-8 w-px bg-gray-100 mx-2 hidden sm:block"></div>
              <div className="text-gray-400">
                 <ArrowRight size={18} />
              </div>
           </div>
        </div>
      ))}
      <div className="text-center text-xs text-gray-400 mt-2">
         Real-time data for these items is available in their detailed dashboards.
      </div>
    </div>
  );
};

export default DataStream;
