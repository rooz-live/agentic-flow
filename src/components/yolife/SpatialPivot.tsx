import React from 'react';

interface Circle {
  name: string;
  episodes: number;
  percentage: number;
  color: string;
}

interface SpatialPivotProps {
  circles?: Circle[];
  location?: {
    lat: number;
    lng: number;
  };
  onLocationChange?: (location: { lat: number; lng: number }) => void;
}

export const SpatialPivot: React.FC<SpatialPivotProps> = ({
  circles = [],
  location,
  onLocationChange
}) => {
  return (
    <div>
      <h3>Spatial Pivot</h3>
      {location ? (
        <p>Location: {location.lat}, {location.lng}</p>
      ) : (
        <p>No location selected</p>
      )}
    </div>
  );
};

export default SpatialPivot;
