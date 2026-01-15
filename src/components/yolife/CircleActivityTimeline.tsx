import React from 'react';

interface Circle {
  name: string;
  episodes: number;
  percentage: number;
  color: string;
}

interface Activity {
  id: string;
  timestamp: Date;
  title: string;
  description?: string;
  type?: string;
}

interface CircleActivityTimelineProps {
  circles?: Circle[];
  activities?: Activity[];
  onActivitySelect?: (activity: Activity) => void;
}

export const CircleActivityTimeline: React.FC<CircleActivityTimelineProps> = ({
  circles = [],
  activities = [],
  onActivitySelect
}) => {
  return (
    <div>
      <h3>Circle Activity Timeline</h3>
      <p>Total Activities: {activities.length}</p>
      {activities.map(activity => (
        <div key={activity.id} onClick={() => onActivitySelect?.(activity)}>
          <strong>{activity.title}</strong>
          <span> - {activity.timestamp.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default CircleActivityTimeline;
