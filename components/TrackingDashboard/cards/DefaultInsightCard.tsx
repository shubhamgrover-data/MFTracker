
import React from 'react';

interface DefaultInsightCardProps {
  data: any;
}

const DefaultInsightCard: React.FC<DefaultInsightCardProps> = ({ data }) => {
  if (typeof data === 'string') {
      if (data.trim().startsWith('<')) {
          return <div className="text-xs text-gray-400 italic p-2">Retrieving data...</div>;
      }
      return <div className="text-xs text-gray-600 line-clamp-6 p-2 whitespace-pre-wrap">{data}</div>;
  }
  
  return (
    <div className="h-full overflow-auto custom-scrollbar bg-gray-50 p-2 rounded">
      <pre className="text-[10px] font-mono text-gray-600">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default DefaultInsightCard;
