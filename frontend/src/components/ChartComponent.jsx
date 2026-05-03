import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const ChartComponent = ({ positiveRatio, negativeRatio }) => {
  // If we only have ratios, neutral is the rest
  const positive = Math.round(positiveRatio * 100);
  const negative = Math.round(negativeRatio * 100);
  const neutral = Math.max(0, 100 - positive - negative);

  const data = [
    { name: 'Positive', value: positive },
    { name: 'Neutral', value: neutral },
    { name: 'Negative', value: negative },
  ].filter(item => item.value > 0);

  const COLORS = ['#22c55e', '#94a3b8', '#ef4444']; // Green, Slate, Red

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-80 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Breakdown</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartComponent;
