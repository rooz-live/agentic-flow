import React from 'react';

interface SpatialPivotProps {
  location?: {
    lat: number;
    lng: number;
  };
  onLocationChange?: (location: { lat: number; lng: number }) => void;
}

export const SpatialPivot: React.FC<SpatialPivotProps> = ({
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
