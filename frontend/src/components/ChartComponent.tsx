import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChartComponentProps {
  positive: number;
  neutral: number;
  negative: number;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ positive: pos, neutral: neu, negative: neg }) => {
  const data = [
    { name: 'Positive', value: Math.round(pos * 100) },
    { name: 'Neutral', value: Math.round(neu * 100) },
    { name: 'Negative', value: Math.round(neg * 100) },
  ].filter(item => item.value > 0);

  const COLORS = ['#10b981', '#94a3b8', '#f43f5e']; // Emerald, Slate, Rose

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={8}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => [`${value}%`, 'Composition']} 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', fontWeight: 700, paddingTop: '20px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartComponent;
