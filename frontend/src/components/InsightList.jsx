import React from 'react';
import { CheckCircle, XCircle, Lightbulb, TrendingUp } from 'lucide-react';

const InsightList = ({ title, type, items }) => {
  if (!items || items.length === 0) return null;

  const getIcon = () => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />;
      case 'negative':
        return <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />;
      case 'suggestion':
        return <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />;
      case 'pattern':
        return <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex items-start">
            {getIcon()}
            <span className="ml-3 text-gray-700 leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InsightList;
