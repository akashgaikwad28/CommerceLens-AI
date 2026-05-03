import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ComparisonChartProps {
  data: { name: string; value: number }[];
  color: string;
  suffix?: string;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ data, color, suffix = '' }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis 
            type="number" 
            hide 
            domain={[0, data.some(d => d.value > 5) ? 100 : 5]} 
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={120} 
            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ 
              borderRadius: '12px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              fontSize: '12px',
              fontWeight: '700'
            }}
            formatter={(value: any) => [`${value}${suffix}`, 'Value']}
          />
          <Bar 
            dataKey="value" 
            radius={[0, 8, 8, 0]} 
            barSize={32}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={color} fillOpacity={1 - (index * 0.15)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComparisonChart;
